import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadPromise = null;

export const DetectorType = {
  TINY_FACE_DETECTOR: 'tinyFaceDetector', // Fast tracking (webcam close-range)
  SSD_MOBILENET_V1: 'ssdMobilenetv1',     // High-accuracy, 30+ faces, CCTV/classroom
};

// Exact 7 Human Emotions
export const EMOTIONS = {
  neutral:   { label: 'Neutral',   emoji: '😐', color: '#94a3b8', engagementWeight: 0.85 },
  happy:     { label: 'Happy',     emoji: '😊', color: '#10b981', engagementWeight: 1.0 },
  sad:       { label: 'Sad',       emoji: '😔', color: '#64748b', engagementWeight: 0.4 },
  angry:     { label: 'Angry',     emoji: '😠', color: '#ef4444', engagementWeight: 0.3 },
  fearful:   { label: 'Fearful',   emoji: '😨', color: '#f59e0b', engagementWeight: 0.4 },
  disgusted: { label: 'Disgusted', emoji: '🤢', color: '#d97706', engagementWeight: 0.3 },
  surprised: { label: 'Surprised', emoji: '😮', color: '#06b6d4', engagementWeight: 0.85 },
};

/**
 * Load face-api models (local → CDN fallback)
 */
export async function loadFaceModels(onProgress) {
  if (modelsLoaded) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const tryLoad = async (basePath) => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(basePath),
        faceapi.nets.ssdMobilenetv1.loadFromUri(basePath),
        faceapi.nets.faceLandmark68Net.loadFromUri(basePath),
        faceapi.nets.faceRecognitionNet.loadFromUri(basePath),
        faceapi.nets.faceExpressionNet.loadFromUri(basePath),
      ]);
    };

    try {
      if (onProgress) onProgress({ status: 'loading', message: 'Loading facial recognition models...' });
      await tryLoad('/models');
      modelsLoaded = true;
      if (onProgress) onProgress({ status: 'ready', message: 'Ready' });
      return true;
    } catch (err) {
      console.warn('Local model load failed, trying CDN...', err);
      try {
        await tryLoad('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
        modelsLoaded = true;
        if (onProgress) onProgress({ status: 'ready', message: 'Ready (CDN)' });
        return true;
      } catch (cdnErr) {
        console.error('All model loading attempts failed:', cdnErr);
        if (onProgress) onProgress({ status: 'error', message: 'Failed to load face models' });
        throw cdnErr;
      }
    }
  })();

  return loadPromise;
}

export function areModelsLoaded() {
  return modelsLoaded;
}

/**
 * Get detector options.
 *
 * ROOT FIX (accuracy + 30+ faces):
 * - SSD MobileNet: inputSize 416 (vs old 224), minConfidence 0.25 (vs 0.4), maxResults 50 (vs 10)
 *   → resolves faces at distance (CCTV/classroom), handles 30+ faces in one frame
 * - TinyFace: inputSize 416 (vs 224), scoreThreshold 0.3 (vs 0.45)
 *   → better detection at angle and partial occlusion
 */
export function getDetectorOptions(type = DetectorType.SSD_MOBILENET_V1) {
  if (type === DetectorType.TINY_FACE_DETECTOR) {
    // 416 gives 2× resolution for face resolution — critical for classroom/CCTV distances
    return new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 });
  } else {
    // 50 face hard cap, low minConfidence for far/angled faces
    return new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25, maxResults: 50 });
  }
}

/**
 * Get detector options optimized for enrollment (single face, maximum accuracy)
 */
export function getEnrollmentOptions() {
  // SSD at high quality for enrollment — we want the best descriptor possible
  return new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5, maxResults: 1 });
}

/**
 * Detect ALL faces in frame — supports 30+ faces simultaneously.
 * Uses SSD MobileNet by default for production scanning.
 */
export async function detectAllFacesWithDetails(mediaElement, detectorType = DetectorType.SSD_MOBILENET_V1) {
  if (!modelsLoaded || !mediaElement) return [];
  const options = getDetectorOptions(detectorType);

  try {
    return await faceapi
      .detectAllFaces(mediaElement, options)
      .withFaceLandmarks()
      .withFaceExpressions()
      .withFaceDescriptors();
  } catch {
    return [];
  }
}

/**
 * Single face capture for enrollment — uses high-accuracy options.
 * Returns null if no face found or confidence is too low.
 */
export async function detectSingleFaceDescriptor(mediaElement) {
  if (!modelsLoaded || !mediaElement) return null;

  try {
    const detection = await faceapi
      .detectSingleFace(mediaElement, getEnrollmentOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withFaceDescriptor();

    if (!detection) return null;

    return {
      descriptor: Array.from(detection.descriptor),
      box: detection.detection.box,
      expressions: detection.expressions,
      confidence: Math.round(detection.detection.score * 100),
      dominantEmotion: getDominantEmotion(detection.expressions),
    };
  } catch {
    return null;
  }
}

/**
 * Build FaceMatcher from registered students.
 *
 * ROOT FIX: default distanceThreshold lowered to 0.50 (was 0.55).
 * At 0.55, too many lookalike mismatches occur in crowds.
 * 0.50 = strict enough for classroom-sized groups.
 */
export function createFaceMatcher(students, distanceThreshold = 0.50) {
  if (!students || students.length === 0) return null;

  const labeledDescriptors = [];

  students.forEach((student) => {
    const rawDescriptors = student.face_descriptors;
    if (!rawDescriptors || !Array.isArray(rawDescriptors) || rawDescriptors.length === 0) return;

    const validFloatDescriptors = rawDescriptors
      .filter((desc) => Array.isArray(desc) && desc.length === 128)
      .map((desc) => new Float32Array(desc));

    if (validFloatDescriptors.length > 0) {
      labeledDescriptors.push(
        new faceapi.LabeledFaceDescriptors(student.student_id, validFloatDescriptors)
      );
    }
  });

  if (labeledDescriptors.length === 0) return null;
  return new faceapi.FaceMatcher(labeledDescriptors, distanceThreshold);
}

/**
 * Extract dominant emotion from face-api expression scores
 */
export function getDominantEmotion(expressions) {
  if (!expressions) {
    return { emotion: 'neutral', label: 'Neutral', emoji: '😐', confidence: 100, color: '#94a3b8' };
  }

  let dominant = 'neutral';
  let maxScore = -1;

  Object.entries(expressions).forEach(([emotion, score]) => {
    if (score > maxScore) {
      maxScore = score;
      dominant = emotion;
    }
  });

  const meta = EMOTIONS[dominant] || EMOTIONS.neutral;
  const confidence = Math.round(maxScore * 100);

  return {
    emotion: dominant,
    label: meta.label,
    emoji: meta.emoji,
    color: meta.color,
    confidence,
    engagementWeight: meta.engagementWeight,
    scores: expressions,
  };
}

/**
 * Calculate match confidence as a percentage.
 *
 * ROOT FIX: Previous formula used a hardcoded 0.70 base regardless of threshold.
 * New formula: scales linearly from threshold (0%) down to 0.0 (100%).
 * e.g. distance=0.0 → 100%, distance=threshold → 0%.
 */
export function calculateMatchConfidence(distance, threshold = 0.50) {
  if (distance >= threshold) return 0;
  // Scale: 0 distance → 100%, threshold distance → 0%
  const confidence = Math.round((1 - distance / threshold) * 100);
  return Math.min(100, Math.max(0, confidence));
}

export { faceapi };
