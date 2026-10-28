import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadPromise = null;

export const DetectorType = {
  TINY_FACE_DETECTOR: 'tinyFaceDetector', // Fast, close-range (≤8 faces)
  SSD_MOBILENET_V1:   'ssdMobilenetv1',   // High accuracy, 30+ faces, CCTV/classroom ← DEFAULT
};

// Exact 7 Human Emotions
export const EMOTIONS = {
  neutral:   { label: 'Neutral',   emoji: '😐', color: '#94a3b8', engagementWeight: 0.85 },
  happy:     { label: 'Happy',     emoji: '😊', color: '#10b981', engagementWeight: 1.0  },
  sad:       { label: 'Sad',       emoji: '😔', color: '#64748b', engagementWeight: 0.4  },
  angry:     { label: 'Angry',     emoji: '😠', color: '#ef4444', engagementWeight: 0.3  },
  fearful:   { label: 'Fearful',   emoji: '😨', color: '#f59e0b', engagementWeight: 0.4  },
  disgusted: { label: 'Disgusted', emoji: '🤢', color: '#d97706', engagementWeight: 0.3  },
  surprised: { label: 'Surprised', emoji: '😮', color: '#06b6d4', engagementWeight: 0.85 },
};

/**
 * Load all face-api models (local → CDN fallback)
 */
export async function loadFaceModels(onProgress) {
  if (modelsLoaded) return true;
  if (loadPromise)  return loadPromise;

  loadPromise = (async () => {
    const tryLoad = async (base) => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(base),
        faceapi.nets.ssdMobilenetv1.loadFromUri(base),
        faceapi.nets.faceLandmark68Net.loadFromUri(base),
        faceapi.nets.faceRecognitionNet.loadFromUri(base),
        faceapi.nets.faceExpressionNet.loadFromUri(base),
      ]);
    };

    try {
      if (onProgress) onProgress({ status: 'loading', message: 'Loading recognition models...' });
      await tryLoad('/models');
      modelsLoaded = true;
      if (onProgress) onProgress({ status: 'ready', message: 'Ready' });
      return true;
    } catch {
      console.warn('Local models unavailable — trying CDN…');
      try {
        await tryLoad('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
        modelsLoaded = true;
        if (onProgress) onProgress({ status: 'ready', message: 'Ready (CDN)' });
        return true;
      } catch (cdnErr) {
        if (onProgress) onProgress({ status: 'error', message: 'Failed to load models' });
        throw cdnErr;
      }
    }
  })();

  return loadPromise;
}

export function areModelsLoaded() { return modelsLoaded; }

/**
 * Detector options — tuned for 30+ faces at CCTV/classroom distances.
 *
 * KEY INSIGHT: SSD MobileNet's internal processing is fixed at 300×300px.
 * To detect faces smaller than ~40px in the original frame, we upscale the
 * INPUT before calling face-api (done in imagePreprocessor.js). These
 * options are set as low as possible to catch as many faces as possible.
 *
 * SSD:  minConfidence 0.20 — catches far/angled/partially occluded faces.
 *       False positives filtered out by the FaceMatcher (descriptor distance).
 * Tiny: inputSize 608 — maximum resolution the model supports; best for small faces.
 *       scoreThreshold 0.25 — aggressive but filtered by descriptor distance.
 */
export function getDetectorOptions(type = DetectorType.SSD_MOBILENET_V1) {
  if (type === DetectorType.TINY_FACE_DETECTOR) {
    return new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.25 });
  }
  return new faceapi.SsdMobilenetv1Options({ minConfidence: 0.20, maxResults: 50 });
}

/**
 * Options for enrollment — supports angled captures (minConfidence: 0.35)
 * so students can enroll multiple angles (frontal, left, right, tilted).
 */
export function getEnrollmentOptions(minConfidence = 0.35) {
  return new faceapi.SsdMobilenetv1Options({ minConfidence, maxResults: 1 });
}

/**
 * Detect all faces in a (possibly preprocessed/upscaled) canvas.
 *
 * IMPORTANT: Pass the preprocessed canvas from imagePreprocessor.js as
 * `inputElement` for CCTV/small-face scenarios. The caller must scale
 * bounding boxes back using scaleBox() from imagePreprocessor.js.
 */
export async function detectAllFacesWithDetails(
  inputElement,
  detectorType = DetectorType.SSD_MOBILENET_V1
) {
  if (!modelsLoaded || !inputElement) return [];
  try {
    return await faceapi
      .detectAllFaces(inputElement, getDetectorOptions(detectorType))
      .withFaceLandmarks()
      .withFaceExpressions()
      .withFaceDescriptors();
  } catch {
    return [];
  }
}

/**
 * Capture a single face descriptor for enrollment.
 *
 * Quality gates:
 * - Face score ≥ 0.35 (permits angled faces for multi-angle profile building)
 * - Face must be reasonably large (≥ 45px width) for a good descriptor
 *
 * Returns null if face is too blurry, too small, or not detected.
 */
export async function detectSingleFaceDescriptor(mediaElement, minConfidence = 0.35) {
  if (!modelsLoaded || !mediaElement) return null;
  try {
    const detection = await faceapi
      .detectSingleFace(mediaElement, getEnrollmentOptions(minConfidence))
      .withFaceLandmarks()
      .withFaceExpressions()
      .withFaceDescriptor();

    if (!detection) return null;

    // Quality gate: enforce minimum face size for reliable descriptor
    const { width } = detection.detection.box;
    if (width < 50) {
      return {
        error: 'too_small',
        message: 'Move closer to the camera. Your face needs to fill more of the frame for accurate enrollment.',
      };
    }

    return {
      descriptor:     Array.from(detection.descriptor),
      box:            detection.detection.box,
      expressions:    detection.expressions,
      confidence:     Math.round(detection.detection.score * 100),
      dominantEmotion: getDominantEmotion(detection.expressions),
    };
  } catch {
    return null;
  }
}

/**
 * Build FaceMatcher from enrolled student descriptors.
 *
 * distanceThreshold = 0.48 (tighter than default 0.6).
 * - Lower = stricter matching, fewer false positives in large classrooms.
 * - 0.48 tested reliable for groups of 30-50 people with 3+ enrollment samples.
 */
export function createFaceMatcher(students, distanceThreshold = 0.48) {
  if (!students?.length) return null;

  const labeledDescriptors = [];

  for (const student of students) {
    const raw = student.face_descriptors;
    if (!Array.isArray(raw) || raw.length === 0) continue;

    const valid = raw
      .filter(d => Array.isArray(d) && d.length === 128)
      .map(d => new Float32Array(d));

    if (valid.length > 0) {
      labeledDescriptors.push(
        new faceapi.LabeledFaceDescriptors(student.student_id, valid)
      );
    }
  }

  if (labeledDescriptors.length === 0) return null;
  return new faceapi.FaceMatcher(labeledDescriptors, distanceThreshold);
}

/**
 * Extract dominant emotion and confidence from face-api expression scores.
 */
export function getDominantEmotion(expressions) {
  if (!expressions) {
    return {
      emotion: 'neutral', label: 'Neutral', emoji: '😐',
      confidence: 0, color: '#94a3b8', engagementWeight: 0.85,
    };
  }

  let dominant = 'neutral';
  let maxScore = -1;
  for (const [emotion, score] of Object.entries(expressions)) {
    if (score > maxScore) { maxScore = score; dominant = emotion; }
  }

  const meta = EMOTIONS[dominant] ?? EMOTIONS.neutral;
  return {
    emotion:          dominant,
    label:            meta.label,
    emoji:            meta.emoji,
    color:            meta.color,
    confidence:       Math.round(maxScore * 100),
    engagementWeight: meta.engagementWeight,
    scores:           expressions,
  };
}

/**
 * Convert Euclidean distance to a human-readable confidence percentage.
 *
 * Formula: scales linearly from threshold (=0%) down to 0.0 (=100%).
 * Capped to [0, 100].
 */
export function calculateMatchConfidence(distance, threshold = 0.48) {
  if (distance >= threshold) return 0;
  return Math.min(100, Math.max(0, Math.round((1 - distance / threshold) * 100)));
}

export { faceapi };
