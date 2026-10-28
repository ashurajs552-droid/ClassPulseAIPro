/**
 * imagePreprocessor.js
 *
 * Full image preprocessing pipeline for face detection accuracy.
 *
 * ROOT FIXES:
 * 1. Adaptive brightness/contrast — handles dark rooms, harsh sunlight, mixed lighting
 * 2. Unsharp mask sharpening — recovers facial features in blurry/compressed CCTV streams
 * 3. Upscaling — SSD MobileNet's internal resolution is 300x300px. A face that is
 *    30px tall in a 1080p frame appears as ~8px to the model → completely invisible.
 *    Upscaling the INPUT by 1.5-2x makes those faces ~12-16px → detectable.
 * 4. Smart upscale factor — auto-computed based on frame size so we don't upscale
 *    already-large webcam frames unnecessarily (kills FPS).
 * 5. All operations use willReadFrequently:true and pre-allocated canvases
 *    to minimize GC pressure in the 30fps loop.
 */

// Pre-allocated offscreen canvases — created once, resized only when needed
let processCanvas = null;
let processCtx = null;
let upscaleCanvas = null;
let upscaleCtx = null;

/**
 * Ensure canvases exist and match required dimensions
 */
function ensureCanvases(w, h, uw, uh) {
  if (!processCanvas) {
    processCanvas = document.createElement('canvas');
    processCtx = processCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (processCanvas.width !== w || processCanvas.height !== h) {
    processCanvas.width = w;
    processCanvas.height = h;
  }
  if (!upscaleCanvas) {
    upscaleCanvas = document.createElement('canvas');
    upscaleCtx = upscaleCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (upscaleCanvas.width !== uw || upscaleCanvas.height !== uh) {
    upscaleCanvas.width = uw;
    upscaleCanvas.height = uh;
  }
}

/**
 * Fast perceptual brightness estimate — samples 1 in every 16 pixels
 * Returns average luminance [0-255]
 */
function estimateBrightness(data) {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 64) { // step=16px = 64 bytes
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    count++;
  }
  return count > 0 ? sum / count : 128;
}

/**
 * Build a gamma look-up table (0-255 -> 0-255) for fast per-pixel transform
 */
function buildGammaLUT(gamma) {
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(255 * Math.pow(i / 255, gamma));
  }
  return lut;
}

/**
 * Build a contrast-stretch LUT from sampled histogram percentiles.
 * Maps [lo..hi] → [0..255] linearly, clips outside that range.
 */
function buildContrastLUT(data) {
  // Sample 1 in 16 pixels, collect luminances
  const sample = [];
  for (let i = 0; i < data.length; i += 64) {
    sample.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  sample.sort((a, b) => a - b);

  const lo = sample[Math.floor(sample.length * 0.02)] ?? 0;
  const hi = sample[Math.floor(sample.length * 0.98)] ?? 255;
  const range = hi - lo || 1;

  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.min(255, Math.max(0, Math.round(((i - lo) / range) * 255)));
  }
  return lut;
}

/**
 * Apply adaptive light correction to raw ImageData in-place.
 *
 * Strategy:
 * - Dark frame (avg < 80):  gamma=0.55 (strong brighten) + contrast stretch
 * - Dim frame (avg < 120):  gamma=0.75 (moderate brighten) + contrast stretch
 * - Normal frame (120-190): gamma=1.0 (no gamma), light contrast stretch only
 * - Bright frame (>190):    gamma=1.25 (dim slightly) + contrast stretch
 */
function applyLightCorrection(data, avgBrightness) {
  let gamma;
  if (avgBrightness < 50)       gamma = 0.45;  // very dark (night-time CCTV)
  else if (avgBrightness < 80)  gamma = 0.55;  // dark room
  else if (avgBrightness < 110) gamma = 0.70;  // dim
  else if (avgBrightness < 140) gamma = 0.85;  // slightly underexposed
  else if (avgBrightness < 175) gamma = 1.0;   // normal — no gamma needed
  else if (avgBrightness < 210) gamma = 1.15;  // slightly bright
  else                           gamma = 1.30;  // overexposed

  const gammaLUT    = buildGammaLUT(gamma);
  const contrastLUT = buildContrastLUT(data);

  // Combined LUT: contrast → gamma
  const combinedLUT = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    combinedLUT[i] = gammaLUT[contrastLUT[i]];
  }

  for (let i = 0; i < data.length; i += 4) {
    data[i]     = combinedLUT[data[i]];
    data[i + 1] = combinedLUT[data[i + 1]];
    data[i + 2] = combinedLUT[data[i + 2]];
    // alpha (i+3) unchanged
  }
}

/**
 * Unsharp mask — sharpens facial features lost in CCTV compression.
 *
 * Algorithm: sharpened = original + amount * (original - blurred)
 * Implemented as a single-pass 3×3 Laplacian kernel for speed.
 *
 * amount: 0.4 is a good default — strong enough to help, won't cause ringing.
 */
function applySharpen(ctx, w, h, amount = 0.4) {
  const { data } = ctx.getImageData(0, 0, w, h);
  const out = new Uint8ClampedArray(data.length);

  const k = 1 + amount;
  const e = -amount / 4;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const top    = data[((y - 1) * w + x) * 4 + c];
        const bottom = data[((y + 1) * w + x) * 4 + c];
        const left   = data[(y * w + (x - 1)) * 4 + c];
        const right  = data[(y * w + (x + 1)) * 4 + c];
        out[idx + c] = Math.min(255, Math.max(0,
          Math.round(k * data[idx + c] + e * (top + bottom + left + right))
        ));
      }
      out[idx + 3] = 255;
    }
  }

  // Copy border pixels unchanged
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
        const idx = (y * w + x) * 4;
        out[idx]     = data[idx];
        out[idx + 1] = data[idx + 1];
        out[idx + 2] = data[idx + 2];
        out[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(new ImageData(out, w, h), 0, 0);
}

/**
 * Compute optimal upscale factor for detection.
 *
 * Goal: ensure the upscaled width is at least 1280px so that faces
 * at typical classroom/CCTV distances (which can be as small as 20px)
 * are enlarged to ≥40px — within SSD MobileNet's detection range.
 *
 * Cap at 2.5× to prevent runaway memory / FPS drop.
 *
 * For frames already ≥1920px wide, upscale = 1.0 (no upscale — faces are big).
 */
export function computeUpscaleFactor(videoWidth) {
  if (!videoWidth || videoWidth === 0) return 1.5;
  if (videoWidth >= 1920) return 1.0;   // Full HD+ — no upscale needed
  if (videoWidth >= 1280) return 1.2;   // HD — light upscale
  if (videoWidth >= 854)  return 1.5;   // 480p — moderate upscale
  if (videoWidth >= 640)  return 2.0;   // CCTV standard — 2x upscale
  return 2.5;                            // Very low res CCTV — aggressive upscale
}

/**
 * Main preprocessing pipeline.
 *
 * Input:  HTMLVideoElement or HTMLCanvasElement
 * Output: Upscaled, enhanced HTMLCanvasElement ready for face-api detection
 *
 * Returns { canvas, upscaleFactor } so callers can scale box coords back.
 */
export function preprocessForDetection(source) {
  const w = source.videoWidth || source.width || source.naturalWidth || 0;
  const h = source.videoHeight || source.height || source.naturalHeight || 0;
  if (!w || !h) return { canvas: source, upscaleFactor: 1 };

  const upscaleFactor = computeUpscaleFactor(w);
  const uw = Math.round(w * upscaleFactor);
  const uh = Math.round(h * upscaleFactor);

  ensureCanvases(w, h, uw, uh);

  // Step 1: Capture raw frame
  processCtx.drawImage(source, 0, 0, w, h);

  // Step 2: Adaptive light correction
  const imageData = processCtx.getImageData(0, 0, w, h);
  const brightness = estimateBrightness(imageData.data);
  // Only process if lighting is abnormal (saves CPU for well-lit frames)
  if (brightness < 140 || brightness > 175) {
    applyLightCorrection(imageData.data, brightness);
    processCtx.putImageData(imageData, 0, 0);
  }

  // Step 3: Sharpen — always helps for CCTV compression artifacts
  applySharpen(processCtx, w, h, 0.38);

  // Step 4: Upscale with bicubic-like interpolation
  upscaleCtx.imageSmoothingEnabled = true;
  upscaleCtx.imageSmoothingQuality = 'high';
  upscaleCtx.drawImage(processCanvas, 0, 0, uw, uh);

  return { canvas: upscaleCanvas, upscaleFactor };
}

/**
 * Scale a face-api detection box from upscaled coordinates back to original.
 * Must be called for every detected box when upscaleFactor > 1.
 */
export function scaleBox(box, upscaleFactor) {
  if (upscaleFactor === 1) return box;
  return {
    x:      box.x      / upscaleFactor,
    y:      box.y      / upscaleFactor,
    width:  box.width  / upscaleFactor,
    height: box.height / upscaleFactor,
  };
}
