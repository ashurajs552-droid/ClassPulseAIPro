import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadPromise = null;

// Available detector options
export const DetectorType = {
  SSD_MOBILENET_V1: 'ssdMobilenetv1', // Highest accuracy
  TINY_FACE_DETECTOR: 'tinyFaceDetector', // Fastest
};

// Emotion metadata mapping
export const EMOTIONS = {
  neutral: { label: 'Neutral', emoji: '😐', color: '#94a3b8', engagementWeight: 0.85 },
  happy: { label: 'Happy', emoji: '😊', color: '#10b981', engagementWeight: 1.0 },
  surprised: { label: 'Surprised', emoji: '😮', color: '#06b6d4', engagementWeight: 0.9 },
  sad: { label: 'Sad', emoji: '😔', color: '#64748b', engagementWeight: 0.4 },
  angry: { label: 'Angry', emoji: '😠', color: '#ef4444', engagementWeight: 0.3 },
  fearful: { label: 'Fearful', emoji: '😨', color: '#f59e0b', engagementWeight: 0.4 },
  disgusted: { label: 'Disgusted', emoji: '🤢', color: '#d97706', engagementWeight: 0.3 },
};

/**
 * Load face-api AI models from local /models directory (copied from node_modules)
 */
export async function loadFaceModels(onProgress) {
  if (modelsLoaded) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const MODEL_PATH = '/models';
      if (onProgress) onProgress({ status: 'loading', message: 'Loading neural networks...' });

      // Load SSD MobileNet (accurate) + TinyFace (speed) + landmarks + expressions + recognition
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_PATH),
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_PATH),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_PATH),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_PATH),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_PATH),
      ]);

      modelsLoaded = true;
      if (onProgress) onProgress({ status: 'ready', message: 'AI Models Loaded Successfully' });
      return true;
    } catch (err) {
      console.error('Failed to load local models, trying CDN fallback...', err);
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
        if (onProgress) onProgress({ status: 'ready', message: 'AI Models Loaded from CDN' });
        return true;
      } catch (cdnErr) {
        console.error('Both local and CDN model loads failed:', cdnErr);
        if (onProgress) onProgress({ status: 'error', message: 'Failed to load face AI models: ' + cdnErr.message });
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
 * Get detector options depending on mode
 */
export function getDetectorOptions(type = DetectorType.SSD_MOBILENET_V1) {
  if (type === DetectorType.SSD_MOBILENET_V1) {
    // minConfidence 0.5 for SSD MobileNet ensures clean face boxes
    return new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5, maxResults: 10 });
  } else {
    // inputSize 416 or 320, scoreThreshold 0.5
    return new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  }
}

/**
 * Detect all faces in video or image with landmarks, expressions, and recognition descriptors
 */
export async function detectAllFacesWithDetails(mediaElement, detectorType = DetectorType.SSD_MOBILENET_V1) {
  if (!modelsLoaded || !mediaElement) return [];
  const options = getDetectorOptions(detectorType);

  const detections = await faceapi
    .detectAllFaces(mediaElement, options)
    .withFaceLandmarks()
    .withFaceExpressions()
    .withFaceDescriptors();

  return detections;
}

/**
 * Single face capture for student enrollment (returns descriptor Float32Array + box)
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
    descriptor: Array.from(detection.descriptor), // convert Float32Array to standard array for JSON storage
    box: detection.detection.box,
    expressions: detection.expressions,
    dominantEmotion: getDominantEmotion(detection.expressions),
  };
}

/**
 * Build FaceMatcher instance from registered students list
 * Supports multi-descriptor embeddings per student (e.g. 3-5 angles)
 * @param {Array} students List of students with face_descriptors array
 * @param {number} distanceThreshold Euclidean distance cutoff (e.g., 0.50)
 */
export function createFaceMatcher(students, distanceThreshold = 0.50) {
  if (!students || students.length === 0) return null;

  const labeledDescriptors = [];

  students.forEach((student) => {
    const rawDescriptors = student.face_descriptors;
    if (!rawDescriptors || !Array.isArray(rawDescriptors) || rawDescriptors.length === 0) {
      return;
    }

    // Convert raw array of arrays into Float32Array descriptors
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

  // FaceMatcher with threshold (distance < threshold => match)
  return new faceapi.FaceMatcher(labeledDescriptors, distanceThreshold);
}

/**
 * Extract dominant emotion, confidence percentage, and metadata
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
 * Calculate match confidence % from euclidean distance
 * Lower distance = higher confidence
 */
export function calculateMatchConfidence(distance, threshold = 0.50) {
  if (distance >= threshold) return 0;
  // Linear scaling from threshold (0%) down to 0 distance (100%)
  const confidence = (1 - distance / threshold) * 100;
  return Math.min(100, Math.max(0, Math.round(confidence * 10) / 10));
}

/**
 * Euclidean distance calculation between two 128D vectors
 */
export function euclideanDistance(arr1, arr2) {
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export { faceapi };
