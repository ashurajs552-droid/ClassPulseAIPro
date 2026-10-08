import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadPromise = null;

export const DetectorType = {
  SSD_MOBILENET_V1: 'ssdMobilenetv1',
  TINY_FACE_DETECTOR: 'tinyFaceDetector',
};

// Human-friendly emotion metadata
export const EMOTIONS = {
  neutral: { label: 'Attentive', emoji: '🎯', color: '#94a3b8', engagementWeight: 0.9 },
  happy: { label: 'Happy', emoji: '😊', color: '#10b981', engagementWeight: 1.0 },
  surprised: { label: 'Curious', emoji: '💡', color: '#38bdf8', engagementWeight: 0.85 },
  sad: { label: 'Fatigued', emoji: '☕', color: '#64748b', engagementWeight: 0.4 },
  angry: { label: 'Distressed', emoji: '⚠️', color: '#ef4444', engagementWeight: 0.3 },
  fearful: { label: 'Hesitant', emoji: '👀', color: '#f59e0b', engagementWeight: 0.4 },
  disgusted: { label: 'Distracted', emoji: '💭', color: '#d97706', engagementWeight: 0.3 },
};

/**
 * Load face-api models
 */
export async function loadFaceModels(onProgress) {
  if (modelsLoaded) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const MODEL_PATH = '/models';
      if (onProgress) onProgress({ status: 'loading', message: 'Loading facial recognition models...' });

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_PATH),
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_PATH),
      ]);

      modelsLoaded = true;
      if (onProgress) onProgress({ status: 'ready', message: 'Ready' });
      return true;
    } catch (err) {
      console.warn('Local model load failed, attempting CDN fallback...', err);
      try {
        const CDN_PATH = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(CDN_PATH),
          faceapi.nets.tinyFaceDetector.loadFromUri(CDN_PATH),
          faceapi.nets.faceLandmark68Net.loadFromUri(CDN_PATH),
          faceapi.nets.faceRecognitionNet.loadFromUri(CDN_PATH),
          faceapi.nets.faceExpressionNet.loadFromUri(CDN_PATH),
        ]);
        modelsLoaded = true;
        if (onProgress) onProgress({ status: 'ready', message: 'Ready' });
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

export function getDetectorOptions(type = DetectorType.SSD_MOBILENET_V1) {
  if (type === DetectorType.SSD_MOBILENET_V1) {
    // 0.40 confidence ensures robust face detection in classroom lighting
    return new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 12 });
  } else {
    return new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
  }
}

/**
 * Detect all faces with landmarks, expressions, and recognition descriptors
 */
export async function detectAllFacesWithDetails(mediaElement, detectorType = DetectorType.SSD_MOBILENET_V1) {
  if (!modelsLoaded || !mediaElement) return [];
  const options = getDetectorOptions(detectorType);

  return await faceapi
    .detectAllFaces(mediaElement, options)
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptors();
}

/**
 * Single face capture for student registration
 */
export async function detectSingleFaceDescriptor(mediaElement, detectorType = DetectorType.SSD_MOBILENET_V1) {
  if (!modelsLoaded || !mediaElement) return null;
  const options = getDetectorOptions(detectorType);

  const detection = await faceapi
    .detectSingleFace(mediaElement, options)
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptor();

  if (!detection) return null;

  return {
    descriptor: Array.from(detection.descriptor),
    box: detection.detection.box,
    expressions: detection.expressions,
    dominantEmotion: getDominantEmotion(detection.expressions),
  };
}

/**
 * Build FaceMatcher instance from registered students
 */
export function createFaceMatcher(students, distanceThreshold = 0.55) {
  if (!students || students.length === 0) return null;

  const labeledDescriptors = [];

  students.forEach((student) => {
    const rawDescriptors = student.face_descriptors;
    if (!rawDescriptors || !Array.isArray(rawDescriptors) || rawDescriptors.length === 0) {
      return;
    }

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
 * Extract dominant emotion and confidence percentage
 */
export function getDominantEmotion(expressions) {
  if (!expressions) {
    return { emotion: 'neutral', label: 'Attentive', emoji: '🎯', confidence: 100, color: '#94a3b8' };
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
 * Calculate match confidence % from euclidean distance
 */
export function calculateMatchConfidence(distance, threshold = 0.55) {
  if (distance >= threshold) return 0;
  // Scaled relative to standard threshold boundary
  const confidence = Math.round((1 - distance / 0.70) * 100);
  return Math.min(100, Math.max(0, confidence));
}

export { faceapi };
