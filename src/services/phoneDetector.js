import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

let phoneModel = null;
let loadingPromise = null;
let isModelReady = false;

/**
 * Pre-load COCO-SSD object detection model
 */
export async function loadPhoneDetector() {
  if (phoneModel) return phoneModel;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      console.log('Loading COCO-SSD Phone Detection Model...');
      // Use mobilenet_v2 for balanced accuracy and speed
      phoneModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      isModelReady = true;
      console.log('Phone Detection Model Ready!');
      return phoneModel;
    } catch (err) {
      console.error('Failed to load phone detector:', err);
      return null;
    }
  })();

  return loadingPromise;
}

export function isPhoneDetectorReady() {
  return isModelReady;
}

/**
 * Detect phones and handheld distractions in video frame
 * Uses calibrated score threshold (0.28) and handles phone variations (including phones held as books/remotes)
 */
export async function detectPhones(videoElement, sensitivity = 'balanced') {
  if (!videoElement || videoElement.videoWidth === 0) return [];
  if (!phoneModel) {
    await loadPhoneDetector();
  }
  if (!phoneModel) return [];

  // Score threshold based on sensitivity
  // balanced: 0.28 (best real-world phone catch rate)
  // high: 0.22 (catches even partially hidden phones)
  // strict: 0.38 (strictly confirmed phones)
  const scoreThreshold = sensitivity === 'high' ? 0.22 : sensitivity === 'strict' ? 0.38 : 0.28;

  try {
    const predictions = await phoneModel.detect(videoElement, 10, scoreThreshold);

    // Filter items representing cell phones or mobile handheld devices
    const phones = [];

    predictions.forEach((item) => {
      const cls = item.class.toLowerCase();
      const [x, y, w, h] = item.bbox;

      // 1. Direct cell phone match
      if (cls === 'cell phone' || cls === 'remote' || cls === 'electronic device') {
        phones.push({
          bbox: item.bbox,
          score: item.score,
          class: 'cell phone',
          label: 'Mobile Phone',
        });
      }
      // 2. Rectangular handheld objects frequently confused by COCO (smartphones often misclassified as "book" when flat/dark)
      else if (cls === 'book') {
        // A smartphone has typical aspect ratio and size (width < 320, height < 320, area < 65000)
        const area = w * h;
        const aspect = Math.max(w / h, h / w);
        if (w < 320 && h < 320 && area < 65000 && aspect > 1.2 && aspect < 2.5) {
          phones.push({
            bbox: item.bbox,
            score: Math.min(0.95, item.score * 0.95),
            class: 'cell phone',
            label: 'Mobile Device',
          });
        }
      }
    });

    return phones;
  } catch (err) {
    console.error('Phone detection error:', err);
    return [];
  }
}

/**
 * Associates detected phone with the closest student face in frame
 * @param {Array} phoneBbox [x, y, w, h]
 * @param {Array} detectedFaces Array of detected face objects with { box, student }
 */
export function findAssociatedStudentForPhone(phoneBbox, detectedFaces) {
  if (!detectedFaces || detectedFaces.length === 0) return null;

  const [px, py, pw, ph] = phoneBbox;
  const phoneCenterX = px + pw / 2;
  const phoneCenterY = py + ph / 2;

  let closestStudent = null;
  let minDistance = Infinity;

  // Max pixel distance in camera feed for a phone to be associated with a person
  const maxAllowedDistance = 450;

  detectedFaces.forEach((face) => {
    const fBox = face.box || face;
    const faceCenterX = fBox.x + fBox.width / 2;
    // Expected hand/chest position is below the face
    const chestY = fBox.y + fBox.height * 2.0;

    const dx = phoneCenterX - faceCenterX;
    const dy = phoneCenterY - chestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < minDistance) {
      minDistance = distance;
      closestStudent = face.student || face.matchedStudent || null;
    }
  });

  if (minDistance <= maxAllowedDistance) {
    return closestStudent;
  }

  // If only 1 student is in the entire frame, associate the phone with that student
  if (detectedFaces.length === 1) {
    return detectedFaces[0].student || detectedFaces[0].matchedStudent || null;
  }

  return null;
}
