import React, { useRef, useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Square, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Download, 
  Smartphone, 
  Clock, 
  RefreshCw,
  LogIn,
  LogOut,
  SlidersHorizontal,
  Flame,
  ShieldCheck,
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
import { 
  detectPhones, 
  findAssociatedStudentForPhone, 
  isPhoneDetectorReady 
} from '../services/phoneDetector';
import { markAttendance, isStudentMarkedToday } from '../services/storageService';
import { playSuccessChime, playAlertSound } from '../utils/audio';

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
  const [detectorType, setDetectorType] = useState(DetectorType.TINY_FACE_DETECTOR);
  const [cameraError, setCameraError] = useState(null);

  // Phone detection settings
  const [phoneDetectionEnabled, setPhoneDetectionEnabled] = useState(true);
  const [phoneSensitivity, setPhoneSensitivity] = useState('balanced'); // 'high', 'balanced', 'strict'

  // Session state: { [studentId]: { student_id, student_name, department, avatar_url, firstEntryTime, lastSeenTime, exitTime, isPresentInFrame, activeSeconds, currentEmotion, phoneViolations, hasPhoneNow, emotionHistory } }
  const [sessionStudents, setSessionStudents] = useState({});
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [sessionDurationSec, setSessionDurationSec] = useState(0);

  // Real-time phone detection alerts: [{ id, studentName, timestamp, confidence, label }]
  const [phoneAlerts, setPhoneAlerts] = useState([]);
  const [activePhonesInFrame, setActivePhonesInFrame] = useState([]);

  // Live 7-emotions telemetry for all faces currently in frame
  const [liveEmotionsCount, setLiveEmotionsCount] = useState({
    neutral: 0,
    happy: 0,
    sad: 0,
    angry: 0,
    fearful: 0,
    disgusted: 0,
    surprised: 0,
  });

  const sessionStudentsRef = useRef({});
  const faceMatcherRef = useRef(null);
  const frameCountRef = useRef(0);
  const cachedPhonesRef = useRef([]);
  const lastAlertSoundTimeRef = useRef(0);

  useEffect(() => {
    sessionStudentsRef.current = sessionStudents;
  }, [sessionStudents]);

  // Update FaceMatcher when students or threshold changes
  useEffect(() => {
    if (students && students.length > 0) {
      faceMatcherRef.current = createFaceMatcher(students, distanceThreshold);
    } else {
      faceMatcherRef.current = null;
    }
  }, [students, distanceThreshold]);

  // Session duration timer & active seconds accumulator
  useEffect(() => {
    let timer = null;
    if (isScanning) {
      timer = setInterval(() => {
        setSessionDurationSec((prev) => prev + 1);

        // Accumulate active seconds for students currently in frame
        setSessionStudents((prev) => {
          let updated = false;
          const next = { ...prev };
          Object.keys(next).forEach((sId) => {
            if (next[sId].isPresentInFrame) {
              next[sId].activeSeconds = (next[sId].activeSeconds || 0) + 1;
              updated = true;
            }
          });
          return updated ? next : prev;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isScanning]);

  // Periodic checker to mark exit for students who stepped away (> 3.5s not seen)
  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const current = { ...sessionStudentsRef.current };
      let changed = false;

      Object.keys(current).forEach((sId) => {
        const student = current[sId];
        if (student.isPresentInFrame && now - student.lastSeenTime > 3500) {
          student.isPresentInFrame = false;
          student.exitTime = student.lastSeenTime;
          student.hasPhoneNow = false;
          changed = true;
        }
      });

      if (changed) {
        setSessionStudents(current);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [isScanning]);

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
        setSessionStartTime(Date.now());
        setSessionDurationSec(0);
      }
    } catch (err) {
      console.error('Camera open error:', err);
      setCameraError('Unable to open camera. Please grant webcam permissions in your browser.');
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
  };

  // Main Detection Loop (30+ FPS Face Tracking & Real-Time Phone Detection)
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

    const now = Date.now();
    frameCountRef.current += 1;

    try {
      // 1. Run Phone Detection every 3rd frame (smooth ~100ms interval)
      if (phoneDetectionEnabled && frameCountRef.current % 3 === 0) {
        detectPhones(video, phoneSensitivity)
          .then((phones) => {
            cachedPhonesRef.current = phones;
            setActivePhonesInFrame(phones);
          })
          .catch(() => {});
      }

      const currentPhones = phoneDetectionEnabled ? cachedPhonesRef.current || [] : [];

      // 2. Real-time Face & 7-Emotion Tracking
      const detections = await detectAllFacesWithDetails(video, detectorType);
      const moodCounts = { neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0 };
      const updatedSession = { ...sessionStudentsRef.current };
      let sessionChanged = false;

      // Prepare list of detected faces with matches for phone association
      const detectedFacesList = [];

      for (let i = 0; i < detections.length; i++) {
        const det = detections[i];
        const box = det.detection.box;
        const emotionData = getDominantEmotion(det.expressions);

        moodCounts[emotionData.emotion] = (moodCounts[emotionData.emotion] || 0) + 1;

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

        detectedFacesList.push({
          box,
          student: matchedStudent,
          matchedStudent,
          emotionData,
        });

        // Student Session Tracking (Entry / Exit / Duration)
        if (matchedStudent) {
          const sId = matchedStudent.student_id;
          if (!updatedSession[sId]) {
            // First Entry timestamp
            updatedSession[sId] = {
              student_id: sId,
              student_name: matchedStudent.full_name,
              department: matchedStudent.department || 'General',
              avatar_url: matchedStudent.avatar_url,
              firstEntryTime: now,
              lastSeenTime: now,
              exitTime: null,
              isPresentInFrame: true,
              activeSeconds: 1,
              currentEmotion: emotionData,
              phoneViolations: 0,
              hasPhoneNow: false,
              emotionHistory: { [emotionData.emotion]: 1 },
            };
            sessionChanged = true;

            // Auto-mark daily attendance record
            markAttendance({
              student_id: sId,
              student_name: matchedStudent.full_name,
              date: new Date().toISOString().slice(0, 10),
              timestamp: new Date().toISOString(),
              status: 'Present',
              confidence_score: matchConfidence,
              dominant_emotion: emotionData.emotion,
              emotion_scores: emotionData.scores,
            }).then(() => {
              playSuccessChime();
              try {
                confetti({ particleCount: 35, spread: 45, origin: { y: 0.7 } });
              } catch (e) {}
              if (onAttendanceMarked) {
                onAttendanceMarked({ student_id: sId, student_name: matchedStudent.full_name });
              }
            });
          } else {
            const st = updatedSession[sId];
            st.lastSeenTime = now;
            st.isPresentInFrame = true;
            st.exitTime = null;
            st.currentEmotion = emotionData;
            // Record emotion distribution in session
            st.emotionHistory = st.emotionHistory || {};
            st.emotionHistory[emotionData.emotion] = (st.emotionHistory[emotionData.emotion] || 0) + 1;
            sessionChanged = true;
          }
        }
      }

      // Check phone association and draw phone overlays
      currentPhones.forEach((phone) => {
        // Draw prominent red warning box on the phone
        drawPhoneBoundingBox(ctx, phone.bbox, Math.round(phone.score * 100));

        // Find associated student
        const associatedStudent = findAssociatedStudentForPhone(phone.bbox, detectedFacesList);

        if (associatedStudent) {
          const sId = associatedStudent.student_id;
          if (updatedSession[sId]) {
            updatedSession[sId].hasPhoneNow = true;
            sessionChanged = true;
          }
        }

        // Trigger audible alarm & add to phone alerts feed (debounced every 3s)
        if (now - lastAlertSoundTimeRef.current > 3000) {
          playAlertSound();
          lastAlertSoundTimeRef.current = now;

          const studentLabel = associatedStudent ? associatedStudent.full_name : 'In Camera View';
          setPhoneAlerts((prev) => [
            {
              id: crypto.randomUUID(),
              studentName: studentLabel,
              timestamp: new Date().toLocaleTimeString(),
              confidence: Math.round(phone.score * 100),
            },
            ...prev.slice(0, 14),
          ]);

          if (associatedStudent && updatedSession[associatedStudent.student_id]) {
            updatedSession[associatedStudent.student_id].phoneViolations += 1;
          }
        }
      });

      // Draw real-time face overlays with 7-emotion tags
      detectedFacesList.forEach((item) => {
        const student = item.student;
        const sId = student?.student_id;
        const hasPhone = sId ? updatedSession[sId]?.hasPhoneNow : false;
        drawRealtimeFaceHUD(ctx, item.box, student, 95, !student, item.emotionData, hasPhone);
      });

      if (sessionChanged) {
        setSessionStudents(updatedSession);
      }
      setLiveEmotionsCount(moodCounts);
    } catch (err) {
      console.error('Detection frame error:', err);
    }

    if (isScanning) {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
  }, [isScanning, detectorType, students, distanceThreshold, phoneDetectionEnabled, phoneSensitivity, onAttendanceMarked]);

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

  // Filter students who are ONLY currently present in the frame right now
  const studentsInFrame = Object.values(sessionStudents).filter((s) => s.isPresentInFrame);
  const studentsExited = Object.values(sessionStudents).filter((s) => !s.isPresentInFrame);

  // Accurate Session CSV Generation
  const handleDownloadSessionCSV = () => {
    const allSession = Object.values(sessionStudents);
    if (allSession.length === 0) {
      alert('No students have been recorded in this session yet.');
      return;
    }

    const sessionDate = new Date(sessionStartTime).toISOString().slice(0, 10);
    const sessionStartStr = new Date(sessionStartTime).toLocaleTimeString();
    const exportTimeStr = new Date().toLocaleTimeString();

    // 1. Session Audit Header
    const metaLines = [
      '========================================================================================',
      'VERIFACE - CLASSROOM ATTENDANCE & ATTENTION AUDIT REPORT',
      `Session Date: ${sessionDate}`,
      `Session Started: ${sessionStartStr}`,
      `Report Exported: ${exportTimeStr}`,
      `Session Elapsed: ${formatTimer(sessionDurationSec)}`,
      `Total Students Enrolled: ${students.length}`,
      `Total Students Present in Session: ${allSession.length}`,
      `Current In-Frame Students: ${studentsInFrame.length}`,
      `Total Mobile Phone Incidents: ${phoneAlerts.length}`,
      '========================================================================================',
      '',
    ];

    // 2. Column Headers
    const headers = [
      'Student Name',
      'Student ID / USN',
      'Department',
      'Status in Class',
      'First Entry Time',
      'Exit Time',
      'Duration (Formatted)',
      'Duration (Minutes Decimal)',
      'Phone Distraction Count',
      'Phone Warning Flag',
      'Dominant Emotion',
      'Neutral %',
      'Happy %',
      'Sad %',
      'Angry %',
      'Fearful %',
      'Disgusted %',
      'Surprised %',
    ];

    // 3. Student Detail Rows
    const rows = allSession.map((s) => {
      const entryStr = new Date(s.firstEntryTime).toLocaleTimeString();
      const exitStr = s.exitTime ? new Date(s.exitTime).toLocaleTimeString() : 'Still Present In Frame';
      
      const activeSec = s.activeSeconds || Math.max(1, Math.floor(((s.exitTime || Date.now()) - s.firstEntryTime) / 1000));
      const durMin = Math.floor(activeSec / 60);
      const durSec = activeSec % 60;
      const formattedDuration = `${durMin}m ${durSec}s`;
      const decimalMinutes = (activeSec / 60).toFixed(1);

      // Emotion distribution breakdown
      const hist = s.emotionHistory || {};
      const totalEmoFrames = Object.values(hist).reduce((a, b) => a + b, 0) || 1;
      const emoPct = (key) => (((hist[key] || 0) / totalEmoFrames) * 100).toFixed(1);

      const dominantEmoLabel = s.currentEmotion?.label || 'Neutral';
      const phoneFlag = s.phoneViolations > 0 ? `⚠️ Flagged (${s.phoneViolations}x)` : 'Clean';

      return [
        `"${s.student_name}"`,
        `"${s.student_id}"`,
        `"${s.department || 'General'}"`,
        s.isPresentInFrame ? 'Present In Frame' : 'Left Session',
        `"${entryStr}"`,
        `"${exitStr}"`,
        `"${formattedDuration}"`,
        decimalMinutes,
        s.phoneViolations || 0,
        `"${phoneFlag}"`,
        `"${dominantEmoLabel}"`,
        emoPct('neutral'),
        emoPct('happy'),
        emoPct('sad'),
        emoPct('angry'),
        emoPct('fearful'),
        emoPct('disgusted'),
        emoPct('surprised'),
      ].join(',');
    });

    const csvContent = [...metaLines, headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VeriFace_Session_Report_${sessionDate}_${new Date().toTimeString().slice(0, 8).replace(/:/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetSession = () => {
    if (window.confirm('Reset current session records? This will clear active session timestamps.')) {
      setSessionStudents({});
      setPhoneAlerts([]);
      setSessionStartTime(Date.now());
      setSessionDurationSec(0);
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 1.25rem 2rem 1.25rem' }}>
      
      {/* Top Session Stats Bar */}
      <div className="clean-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Session Clock:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem' }}>
              {formatTimer(sessionDurationSec)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-green">
              ● {studentsInFrame.length} In Camera Frame
            </span>
            <span className="badge badge-blue">
              {Object.keys(sessionStudents).length} Total In Session
            </span>
            {activePhonesInFrame.length > 0 && (
              <span className="badge" style={{ backgroundColor: 'var(--danger-light)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                <Smartphone size={13} /> {activePhonesInFrame.length} Phone Active in Frame
              </span>
            )}
          </div>
        </div>

        {/* Session Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button className="btn btn-success" onClick={handleDownloadSessionCSV}>
            <Download size={15} />
            <span>Download Session CSV</span>
          </button>

          <button className="btn btn-outline" onClick={handleResetSession} title="Start new session">
            <RefreshCw size={15} />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Main View: Camera View (Left) & Real-Time Present In Frame (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(340px, 1fr)', gap: '1.5rem' }}>
        
        {/* Camera Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="clean-card" style={{ position: 'relative', overflow: 'hidden', minHeight: '490px', backgroundColor: '#040711', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            
            {/* Video & Real-Time Canvas */}
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

            {/* Offline Screen */}
            {!isScanning && (
              <div style={{ textAlign: 'center', padding: '3.5rem 2rem', maxWidth: '420px' }}>
                <Camera size={44} style={{ color: 'var(--primary)', margin: '0 auto 1rem auto', opacity: 0.8 }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Camera Offline</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  Start camera to begin real-time face tracking, 7-emotion detection, and phone alert monitoring.
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

            {/* Camera Error Message */}
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
                <AlertTriangle size={18} />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="clean-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
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

              {/* Real-time Tracking Engine Selector */}
              <button
                className={`btn ${detectorType === DetectorType.TINY_FACE_DETECTOR ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
                onClick={() => setDetectorType(DetectorType.TINY_FACE_DETECTOR)}
              >
                Fast 30+ FPS Tracking
              </button>
              <button
                className={`btn ${detectorType === DetectorType.SSD_MOBILENET_V1 ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
                onClick={() => setDetectorType(DetectorType.SSD_MOBILENET_V1)}
              >
                High Precision
              </button>
            </div>

            {/* Phone Detection & Match Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={phoneDetectionEnabled}
                  onChange={(e) => setPhoneDetectionEnabled(e.target.checked)}
                  style={{ accentColor: 'var(--danger)', width: '15px', height: '15px' }}
                />
                <span style={{ color: phoneDetectionEnabled ? '#f87171' : 'var(--text-muted)', fontWeight: 600 }}>
                  Phone Watch
                </span>
              </label>

              {phoneDetectionEnabled && (
                <select
                  value={phoneSensitivity}
                  onChange={(e) => setPhoneSensitivity(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}
                  title="Phone Detection Sensitivity"
                >
                  <option value="balanced">Balanced</option>
                  <option value="high">High Sensitivity</option>
                  <option value="strict">Strict</option>
                </select>
              )}

              {/* Sensitivity Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Match:</span>
                <input
                  type="range"
                  min="0.45"
                  max="0.65"
                  step="0.01"
                  value={distanceThreshold}
                  onChange={(e) => onThresholdChange && onThresholdChange(parseFloat(e.target.value))}
                  style={{ width: '75px', accentColor: 'var(--primary)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: ONLY STUDENTS CURRENTLY PRESENT IN FRAME */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Active In-Frame Card */}
          <div className="clean-card" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.15rem' }}>Currently In Frame</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Students detected in camera right now
                </p>
              </div>
              <span className="badge badge-green">
                ● {studentsInFrame.length} In Frame
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', maxHeight: '430px', paddingRight: '0.25rem' }}>
              {studentsInFrame.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No students in camera view.<br />
                  Step in front of the camera to appear here with entry timestamp.
                </div>
              ) : (
                studentsInFrame.map((st) => {
                  const entryTimeStr = new Date(st.firstEntryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const activeSec = st.activeSeconds || Math.floor((Date.now() - st.firstEntryTime) / 1000);
                  const durationMins = Math.floor(activeSec / 60);
                  const durationSecs = activeSec % 60;
                  const emo = st.currentEmotion || EMOTIONS.neutral;

                  return (
                    <div
                      key={st.student_id}
                      style={{
                        padding: '0.8rem 0.9rem',
                        backgroundColor: st.hasPhoneNow ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-app)',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${st.hasPhoneNow ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          {st.avatar_url ? (
                            <img
                              src={st.avatar_url}
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
                              {st.student_name ? st.student_name[0] : 'S'}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{st.student_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {st.student_id}
                            </div>
                          </div>
                        </div>

                        {/* Emotion Tag */}
                        <span className="badge" style={{ backgroundColor: emo.color + '20', color: emo.color, border: `1px solid ${emo.color}40`, fontSize: '0.72rem' }}>
                          {emo.emoji} {emo.label} ({emo.confidence}%)
                        </span>
                      </div>

                      {/* Timestamps & Phone Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.35rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <LogIn size={13} color="var(--success)" />
                          <span>Entry: {entryTimeStr}</span>
                          <span>•</span>
                          <span>{durationMins}m {durationSecs}s</span>
                        </div>

                        {st.hasPhoneNow ? (
                          <span style={{ color: '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Smartphone size={13} /> Phone in Hand!
                          </span>
                        ) : (
                          <span style={{ color: 'var(--success)', fontWeight: 500 }}>
                            ✓ In Frame
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Exited Students Summary */}
          {studentsExited.length > 0 && (
            <div className="clean-card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Recently Left Session ({studentsExited.length})
                </span>
                <LogOut size={14} color="var(--text-muted)" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto' }}>
                {studentsExited.map((s) => (
                  <div key={s.student_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>{s.student_name}</span>
                    <span>Left: {new Date(s.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Telemetry Panels (Below Camera) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        
        {/* Panel 1: Real-Time Phone Detection Alert Log */}
        <div className="clean-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Smartphone size={18} color="var(--danger)" />
              <h4 style={{ fontSize: '0.95rem' }}>Live Phone Detection Alerts</h4>
            </div>
            <span className="badge" style={{ backgroundColor: 'var(--danger-light)', color: '#f87171' }}>
              {phoneAlerts.length} Incident{phoneAlerts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '220px', overflowY: 'auto' }}>
            {phoneAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No phone violations detected.<br />
                When a student uses a cell phone in camera view, a red warning and audio alert will trigger immediately.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.5rem' }}>Time</th>
                    <th style={{ padding: '0.5rem' }}>Student</th>
                    <th style={{ padding: '0.5rem' }}>Alert</th>
                    <th style={{ padding: '0.5rem' }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {phoneAlerts.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>{a.timestamp}</td>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>{a.studentName}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <span style={{ color: '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertTriangle size={12} /> Phone Detected
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>{a.confidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel 2: Real-Time 7-Emotions Telemetry */}
        <div className="clean-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={18} color="var(--primary)" />
              <h4 style={{ fontSize: '0.95rem' }}>Real-Time 7-Emotion Distribution</h4>
            </div>
            <span className="badge badge-blue">Live Frame</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {Object.entries(EMOTIONS).map(([key, meta]) => {
              const count = liveEmotionsCount[key] || 0;
              const totalActive = studentsInFrame.length;
              const pct = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;

              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem' }}>
                  <span style={{ width: '22px' }}>{meta.emoji}</span>
                  <span style={{ width: '75px', color: 'var(--text-main)', fontWeight: 500 }}>{meta.label}</span>
                  <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--border-default)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: meta.color,
                      transition: 'width 0.2s ease',
                    }} />
                  </div>
                  <span style={{ width: '30px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

/**
 * Draw real-time face HUD with 7-emotion pill & phone warning
 */
function drawRealtimeFaceHUD(ctx, box, student, confidence, isUnknown, emotion, hasPhone) {
  const { x, y, width, height } = box;
  const color = hasPhone ? '#ef4444' : isUnknown ? '#f59e0b' : '#3b82f6';

  ctx.save();

  // Face Bounding Box
  ctx.strokeStyle = color;
  ctx.lineWidth = hasPhone ? 3 : 2.5;
  ctx.strokeRect(x, y, width, height);

  // Top Student Name Tag
  const tagWidth = Math.max(160, width);
  const tagHeight = 32;
  const tagX = x + (width - tagWidth) / 2;
  const tagY = Math.max(8, y - tagHeight - 8);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagWidth, tagHeight, 6);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Student Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 13px sans-serif';
  const name = student ? student.full_name : 'Unknown Face';
  ctx.fillText(name, tagX + 10, tagY + 14);

  // Subtitle
  ctx.font = '11px sans-serif';
  ctx.fillStyle = color;
  let statusText = '';
  if (hasPhone) {
    statusText = '⚠️ PHONE DETECTED!';
  } else if (isUnknown) {
    statusText = 'Unregistered';
  } else {
    statusText = `${student.student_id} • In Frame`;
  }
  ctx.fillText(statusText, tagX + 10, tagY + 26);

  // Bottom Emotion Pill (7 Emotions)
  const emoText = `${emotion.emoji} ${emotion.label} (${emotion.confidence}%)`;
  ctx.font = 'bold 12px sans-serif';
  const emoWidth = ctx.measureText(emoText).width + 20;
  const emoX = x + (width - emoWidth) / 2;
  const emoY = y + height + 8;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.beginPath();
  ctx.roundRect(emoX, emoY, emoWidth, 24, 6);
  ctx.fill();

  ctx.strokeStyle = emotion.color;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = emotion.color;
  ctx.fillText(emoText, emoX + 10, emoY + 16);

  ctx.restore();
}

/**
 * Draw prominent warning box around detected cell phone
 */
function drawPhoneBoundingBox(ctx, bbox, score) {
  const [x, y, width, height] = bbox;

  ctx.save();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]); // Dashed warning box
  ctx.strokeRect(x, y, width, height);

  // Tag
  ctx.setLineDash([]);
  const text = `📱 PHONE DETECTED (${score}%)`;
  ctx.font = 'bold 12px sans-serif';
  const textWidth = ctx.measureText(text).width + 16;

  ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
  ctx.beginPath();
  ctx.roundRect(x, Math.max(4, y - 26), textWidth, 24, 4);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + 8, Math.max(4, y - 26) + 16);

  ctx.restore();
}
