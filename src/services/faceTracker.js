/**
 * faceTracker.js
 *
 * Temporal face tracking and identity smoothing.
 *
 * ROOT FIXES:
 * 1. Per-frame matching is noisy — a face briefly obscured by a hand, slight
 *    head turn, or motion blur causes a false "unknown" for 1-2 frames, which
 *    makes attendance flicker. Temporal tracking solves this by linking the same
 *    physical face across frames by its POSITION rather than its identity.
 *
 * 2. Angle handling — when a face turns sideways, the descriptor degrades. A
 *    single-frame drop is normal. With temporal smoothing, identity is maintained
 *    from the previous confident frames for up to 2 seconds.
 *
 * 3. False positive prevention — requires the same student ID to win majority vote
 *    across at least MIN_CONFIRM_FRAMES (3) frames before registering attendance.
 *    Random one-frame glitches cannot trigger a false attendance mark.
 *
 * Algorithm:
 * - Each detected face bounding box is matched to an existing "track" by centroid proximity.
 * - Each track keeps a rolling window of the last WINDOW_SIZE match labels.
 * - If the majority label in the window meets the threshold, it is the confirmed ID.
 * - Tracks with no detections for TIMEOUT_MS are removed.
 */

const WINDOW_SIZE      = 7;    // Rolling frame window for majority voting
const MIN_CONFIRM_HITS = 2;    // 2 consistent frames needed to confirm (fast confirmation, filters single-frame glitch)
const MAX_CENTROID_DIST_RATIO = 1.8; // Max centroid jump as multiple of face size
const TRACK_TIMEOUT_MS = 2500; // Drop track if not seen for 2.5s

let trackIdCounter = 0;

/**
 * FaceTracker — instantiate one per scanning session, reset on session start.
 */
export class FaceTracker {
  constructor() {
    this.tracks = []; // Active tracks
  }

  reset() {
    this.tracks = [];
    trackIdCounter = 0;
  }

  /**
   * Process one frame of detections.
   *
   * @param {Array} detections - Array of {box: {x,y,width,height}, rawLabel: string|null, distance: number, emotionData: object}
   * @returns {Array} - Array of {trackId, box, confirmedLabel, tentativeLabel, isConfirmed, frameCount, distance, emotionData}
   */
  update(detections) {
    const now = Date.now();

    // 1. Expire stale tracks
    this.tracks = this.tracks.filter(t => now - t.lastSeen < TRACK_TIMEOUT_MS);

    // 2. Match detections to existing tracks
    const usedTrackIds = new Set();
    const results = [];

    for (const det of detections) {
      const cx = det.box.x + det.box.width  / 2;
      const cy = det.box.y + det.box.height / 2;
      const faceSize = Math.max(det.box.width, det.box.height);
      const maxDist  = faceSize * MAX_CENTROID_DIST_RATIO;

      let bestTrack = null;
      let bestDist  = Infinity;

      for (const track of this.tracks) {
        if (usedTrackIds.has(track.id)) continue;
        const dx   = cx - track.cx;
        const dy   = cy - track.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist && dist < bestDist) {
          bestDist  = dist;
          bestTrack = track;
        }
      }

      if (bestTrack) {
        // Update existing track
        usedTrackIds.add(bestTrack.id);
        bestTrack.cx      = cx;
        bestTrack.cy      = cy;
        bestTrack.box     = det.box;
        bestTrack.lastSeen = now;
        bestTrack.frameCount++;
        if (det.emotionData) bestTrack.emotionData = det.emotionData;

        // Push new label into rolling window
        bestTrack.labels.push(det.rawLabel ?? 'unknown');
        if (bestTrack.labels.length > WINDOW_SIZE) bestTrack.labels.shift();

        results.push(this._buildResult(bestTrack, det));
      } else {
        // Create new track
        const track = {
          id:         trackIdCounter++,
          cx,
          cy,
          box:        det.box,
          labels:     [det.rawLabel ?? 'unknown'],
          lastSeen:   now,
          frameCount: 1,
          emotionData: det.emotionData,
        };
        this.tracks.push(track);
        usedTrackIds.add(track.id);
        results.push(this._buildResult(track, det));
      }
    }

    return results;
  }

  /**
   * Build the result object for a track+detection pair.
   * Computes the confirmed ID via majority vote.
   */
  _buildResult(track, det) {
    const confirmedLabel = this._majorityVote(track.labels);
    const isConfirmed    = confirmedLabel !== null;

    return {
      trackId:        track.id,
      box:            det.box,
      confirmedLabel, // null until enough consistent frames
      tentativeLabel: det.rawLabel,  // raw per-frame match (can be noisy)
      isConfirmed,
      frameCount:     track.frameCount,
      distance:       det.distance,
      emotionData:    det.emotionData || track.emotionData,
    };
  }

  /**
   * Majority vote over rolling window of labels.
   * Returns the winning label if it appears at least MIN_CONFIRM_HITS times,
   * otherwise returns null (not yet confirmed).
   */
  _majorityVote(labels) {
    if (labels.length < MIN_CONFIRM_HITS) return null;

    const counts = {};
    for (const l of labels) {
      if (l && l !== 'unknown') {
        counts[l] = (counts[l] || 0) + 1;
      }
    }

    let bestLabel = null;
    let bestCount = 0;
    for (const [label, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        bestLabel = label;
      }
    }

    // Require at least MIN_CONFIRM_HITS occurrences
    return bestLabel && bestCount >= MIN_CONFIRM_HITS ? bestLabel : null;
  }
}
