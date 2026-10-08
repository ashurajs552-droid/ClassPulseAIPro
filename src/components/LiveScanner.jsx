import React, { useRef, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Square, 
  Camera, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Smile, 
  Sliders, 
  Users, 
  RefreshCw,
  Flame,
  Volume2
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
import { playSuccessChime, playAlertSound } from '../utils/audio';

export default function LiveScanner({ 
  students, 
  todayAttendance, 
  onAttendanceMarked, 
  modelsReady,
  distanceThreshold = 0.50,
  onThresholdChange
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);
  const [detectorType, setDetectorType] = useState(DetectorType.SSD_MOBILENET_V1);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [activeDetections, setActiveDetections] = useState([]);
  const [liveEmotionsSummary, setLiveEmotionsSummary] = useState({});
  const [engagementScore, setEngagementScore] = useState(0);

  // Student lock-in tracking for automated attendance: { [studentId]: { firstDetectedTime, locked } }
  const verificationLocksRef = useRef({});
  const faceMatcherRef = useRef(null);
  const lastMarkedCooldownRef = useRef({}); // Prevents spam triggers within same session

  // Update FaceMatcher whenever students list or threshold changes
  useEffect(() => {
    if (students && students.length > 0) {
      const matcher = createFaceMatcher(students, distanceThreshold);
      faceMatcherRef.current = matcher;
      console.log('FaceMatcher initialized with', students.length, 'students. Strictness:', distanceThreshold);
    } else {
      faceMatcherRef.current = null;
    }
  }, [students, distanceThreshold]);

  // Enumerate cameras
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } catch (e) {
        console.warn('Could not enumerate cameras:', e);
      }
    }
    getDevices();
  }, []);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }

      const constraints = {
        video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access webcam. Please ensure camera permissions are granted.');
      setIsScanning(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
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

  // Trigger auto-attendance
  const triggerAutoAttendance = async (student, detection, emotionData) => {
    const studentId = student.student_id;
    const now = Date.now();

    // 15 seconds cooldown for same student in memory session to prevent repeated triggers
    if (lastMarkedCooldownRef.current[studentId] && now - lastMarkedCooldownRef.current[studentId] < 15000) {
      return;
    }
    lastMarkedCooldownRef.current[studentId] = now;

    // Check if student already marked today
    const alreadyMarked = await isStudentMarkedToday(studentId);
    if (alreadyMarked) {
      console.log(`${student.full_name} is already marked for today.`);
      return;
    }

    // Capture small snapshot thumbnail
    let snapshotUrl = null;
    try {
      if (videoRef.current) {
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = 160;
        snapCanvas.height = 120;
        const snapCtx = snapCanvas.getContext('2d');
        snapCtx.drawImage(videoRef.current, 0, 0, 160, 120);
        snapshotUrl = snapCanvas.toDataURL('image/jpeg', 0.6);
      }
    } catch (e) {
      console.warn('Snapshot capture failed:', e);
    }

    const confidenceScore = detection.matchConfidence || 96.5;

    const newRecord = {
      student_id: student.student_id,
      student_name: student.full_name,
      date: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toISOString(),
      status: 'Present',
      confidence_score: confidenceScore,
      dominant_emotion: emotionData.emotion,
      emotion_scores: emotionData.scores,
      snapshot_url: snapshotUrl,
      device_info: 'VeriFace High-Precision Vision Scanner',
    };

    await markAttendance(newRecord);
    playSuccessChime();

    // Trigger visual confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#06b6d4', '#10b981', '#3b82f6', '#8b5cf6'],
      });
    } catch (e) {
      // ignore
    }

    if (onAttendanceMarked) {
      onAttendanceMarked(newRecord);
    }
  };

  // Main Recognition & Drawing Loop
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

    // Sync canvas resolution with video dimensions
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      // Run AI Detection
      const detections = await detectAllFacesWithDetails(video, detectorType);

      const processedDetections = [];
      const emotionsCount = { neutral: 0, happy: 0, surprised: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0 };
      let totalEngagementScore = 0;

      const now = Date.now();
      const currentDetectedIds = new Set();

      for (let i = 0; i < detections.length; i++) {
        const det = detections[i];
        const box = det.detection.box;
        const expressions = det.expressions;
        const emotionData = getDominantEmotion(expressions);

        emotionsCount[emotionData.emotion] = (emotionsCount[emotionData.emotion] || 0) + 1;
        totalEngagementScore += (emotionData.engagementWeight || 0.8) * 100;

        // Perform face descriptor matching
        let matchedStudent = null;
        let matchConfidence = 0;
        let isUnknown = true;

        if (faceMatcherRef.current && det.descriptor) {
          const bestMatch = faceMatcherRef.current.findBestMatch(det.descriptor);
          if (bestMatch.label !== 'unknown') {
            const found = students.find((s) => s.student_id === bestMatch.label);
            if (found) {
              matchedStudent = found;
              isUnknown = false;
              matchConfidence = calculateMatchConfidence(bestMatch.distance, distanceThreshold);
            }
          }
        }

        const isMarkedToday = matchedStudent ? todayAttendance.some((a) => a.student_id === matchedStudent.student_id) : false;

        // Auto-Verification Locking Logic
        let lockProgress = 0;
        if (matchedStudent && !isMarkedToday) {
          const sId = matchedStudent.student_id;
          currentDetectedIds.add(sId);

          if (!verificationLocksRef.current[sId]) {
            verificationLocksRef.current[sId] = { firstSeen: now, completed: false };
          }

          const elapsed = now - verificationLocksRef.current[sId].firstSeen;
          const requiredDuration = 1000; // 1 second stable verification window
          lockProgress = Math.min(1, elapsed / requiredDuration);

          if (lockProgress >= 1 && !verificationLocksRef.current[sId].completed) {
            verificationLocksRef.current[sId].completed = true;
            triggerAutoAttendance(matchedStudent, { ...det, matchConfidence }, emotionData);
          }
        }

        // Draw futuristic cyber bounding box on canvas
        drawFuturisticFaceHUD(ctx, box, matchedStudent, matchConfidence, isUnknown, emotionData, isMarkedToday, lockProgress);

        processedDetections.push({
          box,
          matchedStudent,
          matchConfidence,
          isUnknown,
          emotionData,
          isMarkedToday,
          lockProgress,
        });
      }

      // Cleanup locks for students who moved out of frame
      Object.keys(verificationLocksRef.current).forEach((sId) => {
        if (!currentDetectedIds.has(sId)) {
          delete verificationLocksRef.current[sId];
        }
      });

      setActiveDetections(processedDetections);
      setLiveEmotionsSummary(emotionsCount);
      setEngagementScore(detections.length > 0 ? Math.round(totalEngagementScore / detections.length) : 0);
    } catch (err) {
      console.error('Frame detection error:', err);
    }

    if (isScanning) {
      // Throttle slightly to maintain ~20-30 FPS for silky smooth rendering & high accuracy
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

  // Clean shutdown on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.75fr) minmax(320px, 1fr)', gap: '1.5rem', padding: '0 1rem 2rem 1rem' }}>
      {/* Left Column: Real-Time Camera Scanner HUD */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Camera Stage */}
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', minHeight: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#05070c' }}>
          {/* Animated radar scan line when active */}
          {isScanning && <div className="radar-scanline" />}

          {/* Video & Canvas */}
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{
                width: '100%',
                maxHeight: '620px',
                objectFit: 'contain',
                borderRadius: 'var(--radius-lg)',
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

          {/* Idle / Offline Screen */}
          {!isScanning && (
            <div style={{ textAlign: 'center', padding: '3rem 2rem', zIndex: 5, maxWidth: '480px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem auto',
                boxShadow: '0 0 30px rgba(6, 182, 212, 0.2)'
              }}>
                <Camera size={40} color="#06b6d4" />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.6rem' }}>
                Face Recognition Scanner Offline
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.5' }}>
                Activate camera to begin real-time face identification, emotion telemetry, and zero-touch automated attendance tracking.
              </p>
              <button 
                className="vf-btn vf-btn-primary" 
                onClick={startCamera}
                disabled={!modelsReady}
                style={{ padding: '0.85rem 2rem', fontSize: '1rem', borderRadius: '12px' }}
              >
                <Play size={20} />
                <span>{modelsReady ? 'Initialize Live Scanner' : 'Loading Neural Networks...'}</span>
              </button>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              right: '1rem',
              backgroundColor: 'rgba(244, 63, 94, 0.9)',
              color: '#ffffff',
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

          {/* Active Overlay Badges */}
          {isScanning && (
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              display: 'flex',
              gap: '0.5rem',
              zIndex: 15
            }}>
              <div className="vf-badge vf-badge-cyan" style={{ backdropFilter: 'blur(8px)', background: 'rgba(7, 10, 18, 0.75)' }}>
                <span className="status-dot status-dot-emerald animate-pulse" />
                <span>LIVE FEED</span>
              </div>
              <div className="vf-badge vf-badge-violet" style={{ backdropFilter: 'blur(8px)', background: 'rgba(7, 10, 18, 0.75)' }}>
                <Sparkles size={13} />
                <span>{detectorType === DetectorType.SSD_MOBILENET_V1 ? 'SSD MobileNet v1 (High Precision)' : 'TinyFace (High Speed)'}</span>
              </div>
              <div className="vf-badge vf-badge-emerald" style={{ backdropFilter: 'blur(8px)', background: 'rgba(7, 10, 18, 0.75)' }}>
                <Users size={13} />
                <span>{activeDetections.length} Faces In Frame</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls Toolbar */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isScanning ? (
              <button className="vf-btn vf-btn-danger" onClick={stopCamera}>
                <Square size={16} />
                <span>Stop Scanner</span>
              </button>
            ) : (
              <button className="vf-btn vf-btn-success" onClick={startCamera} disabled={!modelsReady}>
                <Play size={16} />
                <span>Start Scanner</span>
              </button>
            )}

            {/* Camera Select */}
            {videoDevices.length > 1 && (
              <select
                className="vf-input"
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  if (isScanning) setTimeout(startCamera, 100);
                }}
                style={{ width: 'auto', padding: '0.55rem 0.85rem', fontSize: '0.82rem' }}
              >
                {videoDevices.map((dev, idx) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Detector Model & Strictness */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Engine:</span>
              <button
                className={`vf-btn ${detectorType === DetectorType.SSD_MOBILENET_V1 ? 'vf-btn-primary' : 'vf-btn-ghost'}`}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                onClick={() => setDetectorType(DetectorType.SSD_MOBILENET_V1)}
              >
                High Precision
              </button>
              <button
                className={`vf-btn ${detectorType === DetectorType.TINY_FACE_DETECTOR ? 'vf-btn-primary' : 'vf-btn-ghost'}`}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                onClick={() => setDetectorType(DetectorType.TINY_FACE_DETECTOR)}
              >
                Fast
              </button>
            </div>

            {/* Threshold Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} title="Match threshold (Lower is stricter, preventing false matches)">
                Strictness:
              </span>
              <input
                type="range"
                min="0.40"
                max="0.60"
                step="0.01"
                value={distanceThreshold}
                onChange={(e) => onThresholdChange && onThresholdChange(parseFloat(e.target.value))}
                style={{ width: '90px', accentColor: 'var(--cyan-500)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--cyan-400)', fontFamily: 'var(--font-mono)' }}>
                {distanceThreshold.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Real-Time Intelligence & Emotion Telemetry */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Engagement & Classroom Mood Radar */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Flame size={18} color="#f59e0b" />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Classroom Emotion Radar</h4>
            </div>
            <span className="vf-badge vf-badge-amber">REAL-TIME</span>
          </div>

          {/* Attentiveness Score Meter */}
          <div style={{
            background: 'rgba(7, 10, 18, 0.6)',
            padding: '1.2rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--glass-border)',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Attentiveness & Engagement</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: engagementScore >= 75 ? 'var(--emerald-400)' : engagementScore >= 50 ? 'var(--amber-500)' : 'var(--rose-500)' }}>
                {activeDetections.length > 0 ? `${engagementScore}%` : '—'}
              </span>
            </div>
            <div style={{ height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${activeDetections.length > 0 ? engagementScore : 0}%`,
                background: engagementScore >= 75 ? 'linear-gradient(90deg, #06b6d4, #10b981)' : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                borderRadius: '4px',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>

          {/* Emotion Distribution Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Facial Expressions in Frame
            </span>

            {Object.entries(EMOTIONS).map(([key, meta]) => {
              const count = liveEmotionsSummary[key] || 0;
              const pct = activeDetections.length > 0 ? Math.round((count / activeDetections.length) * 100) : 0;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <span style={{ width: '22px' }}>{meta.emoji}</span>
                  <span style={{ width: '70px', color: 'var(--text-light)' }}>{meta.label}</span>
                  <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: meta.color,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <span style={{ width: '32px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Attendance Feed (Today) */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle size={18} color="#10b981" />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Today's Check-Ins</h4>
            </div>
            <span className="vf-badge vf-badge-emerald" style={{ fontSize: '0.8rem' }}>
              {todayAttendance.length} Present
            </span>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            overflowY: 'auto',
            maxHeight: '340px',
            paddingRight: '0.25rem'
          }}>
            {todayAttendance.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No attendance recorded yet today.<br />Faces detected by the camera will be auto-stamped here.
              </div>
            ) : (
              todayAttendance.map((rec) => {
                const emotionMeta = EMOTIONS[rec.dominant_emotion] || EMOTIONS.neutral;
                const timeStr = new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <div
                    key={rec.id || rec.student_id + rec.timestamp}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0.85rem',
                      background: 'rgba(7, 10, 18, 0.5)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {rec.snapshot_url ? (
                        <img
                          src={rec.snapshot_url}
                          alt=""
                          style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--glass-border)' }}
                        />
                      ) : (
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.9rem'
                        }}>
                          {rec.student_name ? rec.student_name[0] : 'S'}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-white)' }}>
                          {rec.student_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
                          <span>{rec.student_id}</span>
                          <span>•</span>
                          <span>{timeStr}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                      <span className="vf-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.7rem' }}>
                        {emotionMeta.emoji} {emotionMeta.label}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {Number(rec.confidence_score).toFixed(0)}% match
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Draw Futuristic Cyber HUD over detected face
 */
function drawFuturisticFaceHUD(ctx, box, student, confidence, isUnknown, emotion, isMarkedToday, lockProgress) {
  const { x, y, width, height } = box;
  const primaryColor = isUnknown ? '#f59e0b' : isMarkedToday ? '#10b981' : '#06b6d4';
  const cornerLength = Math.min(width, height) * 0.22;

  ctx.save();

  // 1. Draw glowing corner brackets
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 10;

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(x, y + cornerLength);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cornerLength, y);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(x + width - cornerLength, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + cornerLength);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(x, y + height - cornerLength);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + cornerLength, y + height);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(x + width - cornerLength, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width, y + height - cornerLength);
  ctx.stroke();

  // 2. Faint bounding border
  ctx.shadowBlur = 0;
  ctx.strokeStyle = primaryColor + '40';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // 3. Top Floating Name Badge
  const badgeWidth = Math.max(160, width);
  const badgeHeight = 36;
  const badgeX = x + (width - badgeWidth) / 2;
  const badgeY = Math.max(10, y - badgeHeight - 12);

  ctx.fillStyle = 'rgba(7, 10, 18, 0.85)';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 8);
  ctx.fill();

  ctx.strokeStyle = primaryColor + '80';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw Lock Progress Ring if locking in
  if (lockProgress > 0 && lockProgress < 1 && !isMarkedToday) {
    const ringX = badgeX + 16;
    const ringY = badgeY + badgeHeight / 2;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ringX, ringY, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lockProgress);
    ctx.stroke();
  }

  // Draw Student Name & Verification Badge
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  const nameText = student ? student.full_name : 'Unknown Face';
  const textOffset = (lockProgress > 0 && lockProgress < 1) ? badgeX + 32 : badgeX + 12;
  ctx.fillText(nameText, textOffset, badgeY + 16);

  ctx.font = '10px monospace';
  ctx.fillStyle = primaryColor;
  let statusText = '';
  if (isUnknown) {
    statusText = 'NOT ENROLLED';
  } else if (isMarkedToday) {
    statusText = '✓ ATTENDANCE RECORDED';
  } else if (lockProgress > 0) {
    statusText = `VERIFYING IDENTITY (${Math.round(lockProgress * 100)}%)...`;
  } else {
    statusText = `${confidence.toFixed(0)}% MATCH • ${student.student_id}`;
  }
  ctx.fillText(statusText, textOffset, badgeY + 29);

  // 4. Bottom Emotion HUD Pill
  const emotionPillY = y + height + 10;
  const emotionText = `${emotion.emoji} ${emotion.label} (${emotion.confidence}%)`;
  ctx.font = 'bold 12px sans-serif';
  const emotionWidth = ctx.measureText(emotionText).width + 24;
  const emotionX = x + (width - emotionWidth) / 2;

  ctx.fillStyle = 'rgba(7, 10, 18, 0.85)';
  ctx.beginPath();
  ctx.roundRect(emotionX, emotionPillY, emotionWidth, 26, 6);
  ctx.fill();

  ctx.strokeStyle = emotion.color + '90';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = emotion.color;
  ctx.fillText(emotionText, emotionX + 12, emotionPillY + 17);

  ctx.restore();
}
