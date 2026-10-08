import React, { useRef, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Square, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Smile, 
  SlidersHorizontal,
  Clock
} from 'lucide-react';
import { 
  detectAllFacesWithDetails, 
  createFaceMatcher, 
  calculateMatchConfidence, 
  getDominantEmotion, 
  DetectorType,
  EMOTIONS
} from '../services/faceEngine';
import { markAttendance, isStudentMarkedToday } from '../services/storageService';
import { playSuccessChime } from '../utils/audio';

export default function LiveScanner({ 
  students, 
  todayAttendance, 
  onAttendanceMarked, 
  modelsReady,
  distanceThreshold = 0.55,
  onThresholdChange
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);
  const [detectorType, setDetectorType] = useState(DetectorType.SSD_MOBILENET_V1);
  const [cameraError, setCameraError] = useState(null);
  const [activeDetections, setActiveDetections] = useState([]);
  const [classroomMoodSummary, setClassroomMoodSummary] = useState({});
  const [attentiveScore, setAttentiveScore] = useState(0);

  // Student lock-in tracking for automated attendance
  const verificationLocksRef = useRef({});
  const faceMatcherRef = useRef(null);
  const lastMarkedCooldownRef = useRef({});

  // Initialize/Update FaceMatcher
  useEffect(() => {
    if (students && students.length > 0) {
      faceMatcherRef.current = createFaceMatcher(students, distanceThreshold);
    } else {
      faceMatcherRef.current = null;
    }
  }, [students, distanceThreshold]);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err) {
      console.error('Camera open error:', err);
      setCameraError('Unable to access camera. Please allow webcam permissions in your browser.');
      setIsScanning(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setIsScanning(false);
    setActiveDetections([]);
    verificationLocksRef.current = {};
  };

  // Auto-mark attendance
  const triggerAutoAttendance = async (student, detection, emotionData) => {
    const studentId = student.student_id;
    const now = Date.now();

    if (lastMarkedCooldownRef.current[studentId] && now - lastMarkedCooldownRef.current[studentId] < 12000) {
      return;
    }
    lastMarkedCooldownRef.current[studentId] = now;

    // Check if already marked
    const alreadyMarked = await isStudentMarkedToday(studentId);
    if (alreadyMarked) return;

    let snapshotUrl = null;
    try {
      if (videoRef.current) {
        const snap = document.createElement('canvas');
        snap.width = 160;
        snap.height = 120;
        const ctx = snap.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, 160, 120);
        snapshotUrl = snap.toDataURL('image/jpeg', 0.7);
      }
    } catch (e) {
      // ignore snapshot error
    }

    const newRecord = {
      student_id: student.student_id,
      student_name: student.full_name,
      date: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toISOString(),
      status: 'Present',
      confidence_score: detection.matchConfidence || 95.0,
      dominant_emotion: emotionData.emotion,
      emotion_scores: emotionData.scores,
      snapshot_url: snapshotUrl,
      device_info: 'Classroom Camera',
    };

    await markAttendance(newRecord);
    playSuccessChime();

    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#3b82f6', '#10b981', '#60a5fa'],
      });
    } catch (e) {
      // ignore
    }

    if (onAttendanceMarked) {
      onAttendanceMarked(newRecord);
    }
  };

  // Detection Loop
  const runDetectionLoop = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
      if (isScanning) {
        animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const detections = await detectAllFacesWithDetails(video, detectorType);
      const processed = [];
      const moodCounts = {};
      let totalEngagement = 0;

      const now = Date.now();
      const currentIds = new Set();

      for (let i = 0; i < detections.length; i++) {
        const det = detections[i];
        const box = det.detection.box;
        const emotionData = getDominantEmotion(det.expressions);

        moodCounts[emotionData.emotion] = (moodCounts[emotionData.emotion] || 0) + 1;
        totalEngagement += (emotionData.engagementWeight || 0.8) * 100;

        let matchedStudent = null;
        let matchConfidence = 0;
        let isUnknown = true;

        if (faceMatcherRef.current && det.descriptor) {
          const match = faceMatcherRef.current.findBestMatch(det.descriptor);
          if (match.label !== 'unknown') {
            const found = students.find((s) => s.student_id === match.label);
            if (found) {
              matchedStudent = found;
              isUnknown = false;
              matchConfidence = calculateMatchConfidence(match.distance, distanceThreshold);
            }
          }
        }

        const isMarkedToday = matchedStudent
          ? todayAttendance.some((a) => a.student_id === matchedStudent.student_id)
          : false;

        let lockProgress = 0;
        if (matchedStudent && !isMarkedToday) {
          const sId = matchedStudent.student_id;
          currentIds.add(sId);

          if (!verificationLocksRef.current[sId]) {
            verificationLocksRef.current[sId] = { firstSeen: now, completed: false };
          }

          const elapsed = now - verificationLocksRef.current[sId].firstSeen;
          const requiredMs = 800; // 0.8s verification hold
          lockProgress = Math.min(1, elapsed / requiredMs);

          if (lockProgress >= 1 && !verificationLocksRef.current[sId].completed) {
            verificationLocksRef.current[sId].completed = true;
            triggerAutoAttendance(matchedStudent, { ...det, matchConfidence }, emotionData);
          }
        }

        // Draw clean human-designed bounding box and badge
        drawCleanStudentHUD(ctx, box, matchedStudent, matchConfidence, isUnknown, emotionData, isMarkedToday, lockProgress);

        processed.push({
          box,
          matchedStudent,
          matchConfidence,
          isUnknown,
          emotionData,
          isMarkedToday,
          lockProgress,
        });
      }

      Object.keys(verificationLocksRef.current).forEach((sId) => {
        if (!currentIds.has(sId)) {
          delete verificationLocksRef.current[sId];
        }
      });

      setActiveDetections(processed);
      setClassroomMoodSummary(moodCounts);
      setAttentiveScore(detections.length > 0 ? Math.round(totalEngagement / detections.length) : 0);
    } catch (err) {
      console.error('Detection frame error:', err);
    }

    if (isScanning) {
      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
      }, 40);
    }
  }, [isScanning, detectorType, students, distanceThreshold, todayAttendance]);

  useEffect(() => {
    if (isScanning) {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isScanning, runDetectionLoop]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 1.25rem 2rem 1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '1.5rem' }}>
        
        {/* Left Column: Live Camera Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="clean-card" style={{ position: 'relative', overflow: 'hidden', minHeight: '480px', backgroundColor: '#070a14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            
            {/* Video & Canvas */}
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                style={{
                  width: '100%',
                  maxHeight: '580px',
                  objectFit: 'contain',
                  display: isScanning ? 'block' : 'none',
                }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  display: isScanning ? 'block' : 'none',
                }}
              />
            </div>

            {/* Offline State */}
            {!isScanning && (
              <div style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: '420px' }}>
                <Camera size={44} style={{ color: 'var(--primary)', margin: '0 auto 1rem auto', opacity: 0.8 }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Camera Offline</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  Click below to turn on the camera and start automated face recognition attendance.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={startCamera}
                  disabled={!modelsReady}
                  style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
                >
                  <Play size={18} />
                  <span>{modelsReady ? 'Start Camera' : 'Loading Models...'}</span>
                </button>
              </div>
            )}

            {/* Camera Error Alert */}
            {cameraError && (
              <div style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                right: '1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                color: '#fff',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                zIndex: 20
              }}>
                <AlertCircle size={18} />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Live Indicator */}
            {isScanning && (
              <div style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                display: 'flex',
                gap: '0.5rem',
                zIndex: 10
              }}>
                <span className="badge badge-green">● Live</span>
                <span className="badge badge-blue">
                  <Users size={12} /> {activeDetections.length} In Frame
                </span>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          <div className="clean-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isScanning ? (
                <button className="btn btn-danger" onClick={stopCamera}>
                  <Square size={16} />
                  <span>Stop Camera</span>
                </button>
              ) : (
                <button className="btn btn-primary" onClick={startCamera} disabled={!modelsReady}>
                  <Play size={16} />
                  <span>Start Camera</span>
                </button>
              )}
            </div>

            {/* Accuracy Sensitivity Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Match Accuracy:</span>
              <input
                type="range"
                min="0.45"
                max="0.65"
                step="0.01"
                value={distanceThreshold}
                onChange={(e) => onThresholdChange && onThresholdChange(parseFloat(e.target.value))}
                style={{ width: '90px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {distanceThreshold <= 0.50 ? 'Strict' : distanceThreshold <= 0.58 ? 'Balanced' : 'Lenient'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Classroom Engagement & Attendance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Live Engagement Card */}
          <div className="clean-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem' }}>Classroom Engagement</h4>
              <span className="badge badge-blue">Live</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Overall Attention:</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: attentiveScore >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                {activeDetections.length > 0 ? `${attentiveScore}%` : '—'}
              </span>
            </div>

            <div style={{ height: '6px', backgroundColor: 'var(--border-default)', borderRadius: '3px', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{
                height: '100%',
                width: `${activeDetections.length > 0 ? attentiveScore : 0}%`,
                backgroundColor: attentiveScore >= 70 ? 'var(--success)' : 'var(--warning)',
                transition: 'width 0.3s ease'
              }} />
            </div>

            {/* Expression breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {Object.entries(EMOTIONS).slice(0, 4).map(([key, meta]) => {
                const count = classroomMoodSummary[key] || 0;
                return (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>{meta.emoji} {meta.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's Marked Attendance */}
          <div className="clean-card" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.15rem' }}>Today's Attendance</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {todayAttendance.length} student{todayAttendance.length !== 1 ? 's' : ''} present
                </p>
              </div>
              <span className="badge badge-green">{todayAttendance.length} Marked</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', maxHeight: '360px', paddingRight: '0.25rem' }}>
              {todayAttendance.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No attendance recorded today yet.<br />Recognized students will appear here automatically.
                </div>
              ) : (
                todayAttendance.map((rec) => {
                  const emo = EMOTIONS[rec.dominant_emotion] || EMOTIONS.neutral;
                  const time = new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={rec.id || rec.student_id + rec.timestamp}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'var(--bg-app)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {rec.snapshot_url ? (
                          <img
                            src={rec.snapshot_url}
                            alt=""
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}>
                            {rec.student_name ? rec.student_name[0] : 'S'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{rec.student_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {rec.student_id} • {time}
                          </div>
                        </div>
                      </div>

                      <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                        {emo.emoji} {emo.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Clean human-designed face bounding box & tag
 */
function drawCleanStudentHUD(ctx, box, student, confidence, isUnknown, emotion, isMarkedToday, lockProgress) {
  const { x, y, width, height } = box;
  const color = isUnknown ? '#f59e0b' : isMarkedToday ? '#10b981' : '#3b82f6';

  ctx.save();

  // Bounding box
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, width, height);

  // Floating Tag
  const tagWidth = Math.max(150, width);
  const tagHeight = 32;
  const tagX = x + (width - tagWidth) / 2;
  const tagY = Math.max(8, y - tagHeight - 8);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagWidth, tagHeight, 6);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Student name
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 13px sans-serif';
  const name = student ? student.full_name : 'Unknown Student';
  ctx.fillText(name, tagX + 10, tagY + 15);

  // Subtitle
  ctx.font = '11px sans-serif';
  ctx.fillStyle = color;
  let status = '';
  if (isUnknown) {
    status = 'Unregistered';
  } else if (isMarkedToday) {
    status = `✓ Present (${emotion.label})`;
  } else if (lockProgress > 0) {
    status = `Verifying... ${Math.round(lockProgress * 100)}%`;
  } else {
    status = `${student.student_id} • ${confidence}%`;
  }
  ctx.fillText(status, tagX + 10, tagY + 27);

  ctx.restore();
}
