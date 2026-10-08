import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

let phoneModel = null;
let loadingPromise = null;

/**
 * Load COCO-SSD object detection model for cell phone identification
 */
export async function loadPhoneDetector() {
  if (phoneModel) return phoneModel;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      console.log('Loading Phone Detection Model (COCO-SSD Lite)...');
      phoneModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      console.log('Phone Detection Model Loaded Successfully!');
      return phoneModel;
    } catch (err) {
      console.error('Failed to load phone detector:', err);
      return null;
    }
  })();

  return loadingPromise;
}

/**
 * Detect cell phones in video frame
 * Returns array of detected cell phone boxes: [{ bbox: [x, y, w, h], score }]
 */
export async function detectPhones(videoElement) {
  if (!videoElement || videoElement.videoWidth === 0) return [];
  if (!phoneModel) {
    await loadPhoneDetector();
  }
  if (!phoneModel) return [];

  try {
    const predictions = await phoneModel.detect(videoElement, 6, 0.40);
    // Filter for cell phone objects
    const phones = predictions.filter(
      (p) => p.class === 'cell phone' || p.class === 'remote' || p.class === 'electronic device'
    );
    return phones;
  } catch (err) {
    console.error('Error detecting phone:', err);
    return [];
  }
}

/**
 * Determines if a phone bounding box is near or held by a student face
 * Expand face box downward to represent upper body / hand holding zone
 */
export function isPhoneAssociatedWithFace(phoneBbox, faceBox) {
  const [px, py, pw, ph] = phoneBbox;
  const fx = faceBox.x;
  const fy = faceBox.y;
  const fw = faceBox.width;
  const fh = faceBox.height;

  // Student body zone: from face down by 3.5x face height, and 1.5x face width left/right
  const bodyZone = {
    x: fx - fw * 0.75,
    y: fy,
    width: fw * 2.5,
    height: fh * 4.0,
  };

  const phoneCenterX = px + pw / 2;
  const phoneCenterY = py + ph / 2;

  const inZone =
    phoneCenterX >= bodyZone.x &&
    phoneCenterX <= bodyZone.x + bodyZone.width &&
    phoneCenterY >= bodyZone.y &&
    phoneCenterY <= bodyZone.y + bodyZone.height;

  return inZone;
}
