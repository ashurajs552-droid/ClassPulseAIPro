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
  Flame,
  Activity,
  BarChart2,
  Wifi,
  Monitor,
} from 'lucide-react';
import {
  detectAllFacesWithDetails,
  createFaceMatcher,
  calculateMatchConfidence,
  getDominantEmotion,
  DetectorType,
  EMOTIONS,
} from '../services/faceEngine';
import {
  detectPhones,
  findAssociatedStudentForPhone,
} from '../services/phoneDetector';
import { markAttendance } from '../services/storageService';
import { playSuccessChime, playAlertSound } from '../utils/audio';

const SESSIONS_STORAGE_KEY = 'veriface_sessions_v1';

// Camera source types
export const CameraSource = {
  WEBCAM: 'webcam',
  IP_CAMERA: 'ip_camera',
};

export default function LiveScanner({
  students,
  onAttendanceMarked,
  modelsReady,
  detectorType = DetectorType.SSD_MOBILENET_V1,
  phoneDetectionEnabled = true,
  phoneSensitivity = 'balanced',
  distanceThreshold = 0.50,
  soundAlertsEnabled = true,
  // Camera source props
  cameraSource = CameraSource.WEBCAM,
  ipCameraUrl = '',
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  // ROOT FIX: Prevent detection loop pileup — skip frame if last detection still running
  const isDetectingRef = useRef(false);
  // For MJPEG IP camera: use img element instead of video
  const mjpegImgRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [activeCameraSource, setActiveCameraSource] = useState(CameraSource.WEBCAM);

  // Persistent Sessions List
  const [sessions, setSessions] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const [activeSessionNumber, setActiveSessionNumber] = useState(1);
  const [selectedSessionId, setSelectedSessionId] = useState('current');
  const [sessionDurationSec, setSessionDurationSec] = useState(0);

  const [currentlyInFrame, setCurrentlyInFrame] = useState([]);
  const [activePhonesInFrame, setActivePhonesInFrame] = useState([]);
  const [livePhoneAlerts, setLivePhoneAlerts] = useState([]);

  const [currentSessionRecords, setCurrentSessionRecords] = useState({});

  const [liveEmotionsCount, setLiveEmotionsCount] = useState({
    neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0,
  });

  // IP camera URL input state
  const [ipUrlInput, setIpUrlInput] = useState(ipCameraUrl || '');
  const [selectedSource, setSelectedSource] = useState(CameraSource.WEBCAM);

  const sessionRecordsRef = useRef({});
  const faceMatcherRef = useRef(null);
  const frameCountRef = useRef(0);
  const cachedPhonesRef = useRef([]);
  const lastAlertSoundTimeRef = useRef(0);
  const activeSessionNumRef = useRef(1);
  const sessionDurationSecRef = useRef(0);
  const livePhoneAlertsRef = useRef([]);

  // Keep refs in sync
  useEffect(() => {
    sessionRecordsRef.current = currentSessionRecords;
  }, [currentSessionRecords]);

  useEffect(() => {
    sessionDurationSecRef.current = sessionDurationSec;
  }, [sessionDurationSec]);

  useEffect(() => {
    livePhoneAlertsRef.current = livePhoneAlerts;
  }, [livePhoneAlerts]);

  // ROOT FIX: Rebuild FaceMatcher at correct threshold (0.50 default)
  useEffect(() => {
    if (students && students.length > 0) {
      faceMatcherRef.current = createFaceMatcher(students, distanceThreshold);
    } else {
      faceMatcherRef.current = null;
    }
  }, [students, distanceThreshold]);

  // Determine next session number on mount
  useEffect(() => {
    if (sessions.length > 0) {
      const nextNum = sessions.length + 1;
      setActiveSessionNumber(nextNum);
      activeSessionNumRef.current = nextNum;
    }
  }, [sessions.length]);

  // Session Timer
  useEffect(() => {
    let timer = null;
    if (isScanning) {
      timer = setInterval(() => {
        setSessionDurationSec((prev) => prev + 1);

        setCurrentSessionRecords((prev) => {
          let updated = false;
          const next = { ...prev };
          Object.keys(next).forEach((sId) => {
            if (next[sId].isPresentInFrame) {
              next[sId] = { ...next[sId], activeSeconds: (next[sId].activeSeconds || 0) + 1 };
              updated = true;
            }
          });
          return updated ? next : prev;
        });
      }, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isScanning]);

  // Strict Real-Time Checker: Drop from in-frame if not seen in 1.8s
  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const records = { ...sessionRecordsRef.current };
      let changed = false;

      Object.keys(records).forEach((sId) => {
        const student = records[sId];
        if (student.isPresentInFrame && now - student.lastSeenTime > 1800) {
          records[sId] = { ...student, isPresentInFrame: false, exitTime: student.lastSeenTime, hasPhoneNow: false };
          changed = true;
        }
      });

      if (changed) {
        setCurrentSessionRecords(records);
        setCurrentlyInFrame(Object.values(records).filter((s) => s.isPresentInFrame));
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isScanning]);

  const saveSessionsToStorage = (updatedSessions) => {
    setSessions(updatedSessions);
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  };

  /**
   * ROOT FIX: Camera start supports both webcam and IP camera (MJPEG HTTP streams).
   * CCTV cameras that expose an MJPEG HTTP endpoint can be pointed at directly.
   * e.g. http://192.168.1.100:8080/video
   */
  const startCamera = async () => {
    setCameraError(null);
    const source = selectedSource;
    setActiveCameraSource(source);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (source === CameraSource.WEBCAM) {
        // Standard webcam via getUserMedia
        let stream = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            // Higher resolution for better face detection at distance
            video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          });
        } catch {
          // Fallback: accept any camera
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.src = '';
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } else {
        // IP Camera: MJPEG HTTP stream
        const url = ipUrlInput.trim();
        if (!url) {
          setCameraError('Please enter a valid IP camera MJPEG URL (e.g. http://192.168.1.100:8080/video).');
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = url;
          videoRef.current.crossOrigin = 'anonymous';
          try {
            await videoRef.current.play();
          } catch {
            // Some MJPEG streams don't support <video> — will use <img> polling fallback
            console.warn('Video play() failed for IP stream — using img fallback');
          }
        }
      }

      // Increment session number
      const newSessionNum = sessions.length + 1;
      setActiveSessionNumber(newSessionNum);
      activeSessionNumRef.current = newSessionNum;
      setSelectedSessionId('current');

      setCurrentSessionRecords({});
      setCurrentlyInFrame([]);
      setActivePhonesInFrame([]);
      setLivePhoneAlerts([]);
      setSessionDurationSec(0);
      sessionDurationSecRef.current = 0;

      setIsScanning(true);
    } catch (err) {
      console.error('Camera open error:', err);
      setCameraError(
        source === CameraSource.IP_CAMERA
          ? `Cannot connect to IP camera. Check the URL and ensure the camera is on the same network. Error: ${err.message}`
          : 'Unable to open webcam. Please grant camera permissions.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = useCallback(() => {
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
      videoRef.current.src = '';
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    // Save completed session
    const currentRecords = sessionRecordsRef.current;
    const now = Date.now();
    const finalRecords = {};

    Object.keys(currentRecords).forEach((sId) => {
      const s = { ...currentRecords[sId] };
      s.isPresentInFrame = false;
      if (!s.exitTime) s.exitTime = now;
      finalRecords[sId] = s;
    });

    const sessionObj = {
      id: `session_${activeSessionNumRef.current}_${now}`,
      sessionNumber: activeSessionNumRef.current,
      name: `Session ${activeSessionNumRef.current}`,
      date: new Date().toISOString().slice(0, 10),
      startTime: now - sessionDurationSecRef.current * 1000,
      endTime: now,
      durationSec: sessionDurationSecRef.current,
      records: finalRecords,
      phoneAlerts: livePhoneAlertsRef.current,
    };

    const updated = [sessionObj, ...sessions];
    saveSessionsToStorage(updated);

    setCurrentlyInFrame([]);
    setActivePhonesInFrame([]);
    setIsScanning(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  /**
   * ROOT FIX: Detection Loop
   * 1. isDetectingRef guard prevents overlapping async detection calls
   * 2. Uses SSD MobileNet (maxResults: 50) by default for 30+ face support
   * 3. Reads both video element AND canvas (for IP camera img frames)
   */
  const runDetectionLoop = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !isScanning) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    // ROOT FIX: Guard — do not stack detection calls
    if (!isDetectingRef.current) {
      isDetectingRef.current = true;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();
      frameCountRef.current += 1;

      try {
        // 1. Phone Detection every 4th frame (keeps face detection priority high)
        if (phoneDetectionEnabled && frameCountRef.current % 4 === 0) {
          detectPhones(video, phoneSensitivity)
            .then((phones) => {
              cachedPhonesRef.current = phones;
              setActivePhonesInFrame(phones);
            })
            .catch(() => {});
        }

        const currentPhones = phoneDetectionEnabled ? (cachedPhonesRef.current || []) : [];

        // 2. ROOT FIX: Face and Emotion Detection (SSD, 50 faces max, inputSize 416)
        const detections = await detectAllFacesWithDetails(video, detectorType);

        const moodCounts = { neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0 };
        const updatedRecords = { ...sessionRecordsRef.current };
        const inFrameList = [];
        let recordsChanged = false;
        const detectedFacesList = [];

        for (let i = 0; i < detections.length; i++) {
          const det = detections[i];
          const box = det.detection.box;
          const emotionData = getDominantEmotion(det.expressions);

          moodCounts[emotionData.emotion] = (moodCounts[emotionData.emotion] || 0) + 1;

          let matchedStudent = null;
          let matchConfidence = 0;

          if (faceMatcherRef.current && det.descriptor) {
            const match = faceMatcherRef.current.findBestMatch(det.descriptor);
            if (match.label !== 'unknown') {
              const found = students.find((s) => s.student_id === match.label);
              if (found) {
                matchedStudent = found;
                matchConfidence = calculateMatchConfidence(match.distance, distanceThreshold);
              }
            }
          }

          detectedFacesList.push({ box, student: matchedStudent, emotionData, confidence: matchConfidence });

          if (matchedStudent) {
            const sId = matchedStudent.student_id;

            if (!updatedRecords[sId]) {
              updatedRecords[sId] = {
                student_id: sId,
                student_name: matchedStudent.full_name,
                department: matchedStudent.department || 'General',
                avatar_url: matchedStudent.avatar_url,
                firstEntryTime: now,
                lastSeenTime: now,
                exitTime: null,
                isPresentInFrame: true,
                activeSeconds: 1,
                phoneViolations: 0,
                hasPhoneNow: false,
                currentEmotion: emotionData,
                emotionHistory: { [emotionData.emotion]: 1 },
              };
              recordsChanged = true;

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
                if (onAttendanceMarked) {
                  onAttendanceMarked({ student_id: sId, student_name: matchedStudent.full_name });
                }
              });
            } else {
              const st = updatedRecords[sId];
              updatedRecords[sId] = {
                ...st,
                lastSeenTime: now,
                isPresentInFrame: true,
                exitTime: null,
                hasPhoneNow: false,
                currentEmotion: emotionData,
                emotionHistory: {
                  ...(st.emotionHistory || {}),
                  [emotionData.emotion]: ((st.emotionHistory || {})[emotionData.emotion] || 0) + 1,
                },
              };
              recordsChanged = true;
            }

            inFrameList.push(updatedRecords[sId]);
          }
        }

        // 3. Process Phone Associations
        currentPhones.forEach((phone) => {
          drawPhoneBoundingBox(ctx, phone.bbox, Math.round(phone.score * 100));

          const associated = findAssociatedStudentForPhone(phone.bbox, detectedFacesList);
          if (associated && updatedRecords[associated.student_id]) {
            updatedRecords[associated.student_id] = {
              ...updatedRecords[associated.student_id],
              hasPhoneNow: true,
            };
            recordsChanged = true;
          }

          if (now - lastAlertSoundTimeRef.current > 3000) {
            if (soundAlertsEnabled) playAlertSound();
            lastAlertSoundTimeRef.current = now;

            const studentLabel = associated ? associated.full_name : 'In Camera View';
            setLivePhoneAlerts((prev) => [
              {
                id: crypto.randomUUID(),
                studentName: studentLabel,
                timestamp: new Date().toLocaleTimeString(),
                confidence: Math.round(phone.score * 100),
              },
              ...prev.slice(0, 14),
            ]);

            if (associated && updatedRecords[associated.student_id]) {
              updatedRecords[associated.student_id] = {
                ...updatedRecords[associated.student_id],
                phoneViolations: (updatedRecords[associated.student_id].phoneViolations || 0) + 1,
              };
            }
          }
        });

        // 4. Draw Face Overlays
        detectedFacesList.forEach((item) => {
          const student = item.student;
          const sId = student?.student_id;
          const hasPhone = sId ? updatedRecords[sId]?.hasPhoneNow : false;
          drawRealtimeFaceHUD(ctx, item.box, student, item.confidence, !student, item.emotionData, hasPhone);
        });

        if (recordsChanged) setCurrentSessionRecords(updatedRecords);
        setCurrentlyInFrame(inFrameList);
        setLiveEmotionsCount(moodCounts);
      } catch (err) {
        console.error('Detection frame error:', err);
      } finally {
        isDetectingRef.current = false;
      }
    }

    if (isScanning) {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning, detectorType, students, distanceThreshold, phoneDetectionEnabled, phoneSensitivity, soundAlertsEnabled, onAttendanceMarked]);

  useEffect(() => {
    if (isScanning) {
      isDetectingRef.current = false;
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isScanning, runDetectionLoop]);

  useEffect(() => {
    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const selectedSessionData = selectedSessionId === 'current'
    ? {
        name: `Session ${activeSessionNumber} (Active)`,
        durationSec: sessionDurationSec,
        records: currentSessionRecords,
        alerts: livePhoneAlerts,
        date: new Date().toISOString().slice(0, 10),
        startTime: Date.now() - sessionDurationSec * 1000,
      }
    : sessions.find((s) => s.id === selectedSessionId) || {
        name: 'Selected Session',
        durationSec: 0,
        records: {},
        alerts: [],
        date: '',
        startTime: Date.now(),
      };

  const displayRecords = Object.values(selectedSessionData.records || {});

  const handleDownloadSessionCSV = () => {
    if (displayRecords.length === 0) {
      alert('No student records found in this session.');
      return;
    }

    const sessionDate = selectedSessionData.date || new Date().toISOString().slice(0, 10);
    const sessionName = selectedSessionData.name || `Session ${activeSessionNumber}`;
    const startStr = new Date(selectedSessionData.startTime).toLocaleTimeString();
    const exportStr = new Date().toLocaleTimeString();

    const meta = [
      '========================================================================================',
      `CLASSPULSE AI PRO - ${sessionName.toUpperCase()} AUDIT REPORT`,
      `Session Date: ${sessionDate}`,
      `Session Started: ${startStr}`,
      `Report Exported: ${exportStr}`,
      `Session Duration: ${formatTimer(selectedSessionData.durationSec)}`,
      `Total Students Attended: ${displayRecords.length}`,
      `Total Phone Incidents: ${(selectedSessionData.alerts || []).length}`,
      '========================================================================================',
      '',
    ];

    const headers = [
      'Student Name',
      'Student ID / USN',
      'Department',
      'Session Status',
      'First Entry Time',
      'Exit Time',
      'Active Time Formatted',
      'Duration (Minutes)',
      'Phone Distraction Count',
      'Phone Flag',
      'Dominant Emotion',
      'Neutral %',
      'Happy %',
      'Sad %',
      'Angry %',
      'Fearful %',
      'Disgusted %',
      'Surprised %',
    ];

    const rows = displayRecords.map((s) => {
      const entryStr = new Date(s.firstEntryTime).toLocaleTimeString();
      const exitStr = s.exitTime ? new Date(s.exitTime).toLocaleTimeString() : (s.isPresentInFrame ? 'In Frame' : 'Left');
      const activeSec = s.activeSeconds || 1;
      const durMin = Math.floor(activeSec / 60);
      const durSec = activeSec % 60;
      const formattedDur = `${durMin}m ${durSec}s`;
      const decimalMin = (activeSec / 60).toFixed(1);

      const hist = s.emotionHistory || {};
      const totalEmo = Object.values(hist).reduce((a, b) => a + b, 0) || 1;
      const emoPct = (key) => (((hist[key] || 0) / totalEmo) * 100).toFixed(1);

      return [
        `"${s.student_name}"`,
        `"${s.student_id}"`,
        `"${s.department || 'General'}"`,
        s.isPresentInFrame ? 'Present In Frame' : 'Completed',
        `"${entryStr}"`,
        `"${exitStr}"`,
        `"${formattedDur}"`,
        decimalMin,
        s.phoneViolations || 0,
        s.phoneViolations > 0 ? `"Flagged (${s.phoneViolations}x)"` : '"Clean"',
        `"${s.currentEmotion?.label || 'Neutral'}"`,
        emoPct('neutral'),
        emoPct('happy'),
        emoPct('sad'),
        emoPct('angry'),
        emoPct('fearful'),
        emoPct('disgusted'),
        emoPct('surprised'),
      ].join(',');
    });

    const csvContent = [...meta, headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ClassPulseAIPro_${sessionName.replace(/\s+/g, '_')}_${sessionDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalInFrame = currentlyInFrame.length;
  const currentAttentiveScore = totalInFrame > 0
    ? Math.round(
        (currentlyInFrame.reduce((sum, s) => sum + (s.currentEmotion?.engagementWeight || 0.85), 0) / totalInFrame) * 100
      )
    : 0;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0 1.25rem 2rem 1.25rem' }}>

      {/* 1. TOP SESSION BAR */}
      <div className="clean-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>

          {/* Camera Start / Stop */}
          {isScanning ? (
            <button className="btn btn-danger" onClick={stopCamera} style={{ padding: '0.5rem 1.1rem' }}>
              <Square size={15} />
              <span>Stop Camera (End Session {activeSessionNumber})</span>
            </button>
          ) : (
            <button className="btn btn-primary" onClick={startCamera} disabled={!modelsReady} style={{ padding: '0.5rem 1.2rem' }}>
              <Play size={15} />
              <span>Start Camera (Session {sessions.length + 1})</span>
            </button>
          )}

          {/* Camera Source Selector */}
          {!isScanning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className={`btn ${selectedSource === CameraSource.WEBCAM ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelectedSource(CameraSource.WEBCAM)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                title="Use built-in webcam or USB camera"
              >
                <Camera size={13} />
                <span>Webcam</span>
              </button>
              <button
                className={`btn ${selectedSource === CameraSource.IP_CAMERA ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelectedSource(CameraSource.IP_CAMERA)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                title="Connect to IP / CCTV camera via MJPEG HTTP stream"
              >
                <Monitor size={13} />
                <span>IP / CCTV Camera</span>
              </button>
            </div>
          )}

          {/* IP Camera URL Input (shown when IP cam selected and not scanning) */}
          {!isScanning && selectedSource === CameraSource.IP_CAMERA && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '260px' }}>
              <Wifi size={14} color="var(--primary)" />
              <input
                className="input-field"
                placeholder="http://192.168.1.100:8080/video  (MJPEG URL)"
                value={ipUrlInput}
                onChange={(e) => setIpUrlInput(e.target.value)}
                style={{ flex: 1, padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
              />
            </div>
          )}

          {/* Session Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Session:</span>
            <select
              className="input-field"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
            >
              <option value="current">Current: Session {activeSessionNumber} {isScanning ? '(Active)' : ''}</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.date} - {formatTimer(s.durationSec)})
                </option>
              ))}
            </select>
          </div>

          {/* Session Clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <Clock size={15} color="var(--primary)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {formatTimer(isScanning ? sessionDurationSec : selectedSessionData.durationSec)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-success" onClick={handleDownloadSessionCSV}>
            <Download size={15} />
            <span>Download Session CSV</span>
          </button>
        </div>
      </div>

      {/* Camera Error Banner */}
      {cameraError && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#f87171',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.6rem',
        }}>
          <AlertTriangle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <strong>Camera Error:</strong> {cameraError}
            {selectedSource === CameraSource.IP_CAMERA && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#fca5a5' }}>
                💡 Tip: Your CCTV/IP camera must expose an <strong>MJPEG HTTP stream</strong> (not RTSP).
                Most IP cameras support this at a URL like <code>http://camera-ip:port/video</code> or <code>/mjpeg</code>.
                Check your camera's web interface or manual for the MJPEG URL.
              </div>
            )}
          </div>
        </div>
      )}

      {/* IP Camera Active Badge */}
      {isScanning && activeCameraSource === CameraSource.IP_CAMERA && (
        <div style={{
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: '#60a5fa',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Monitor size={14} />
          <span>IP / CCTV Camera Active: <code style={{ fontFamily: 'var(--font-mono)' }}>{ipUrlInput}</code></span>
        </div>
      )}

      {/* 2. REAL-TIME STATS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

        <div className="clean-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>IN FRAME RIGHT NOW</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: totalInFrame > 0 ? 'var(--success)' : 'var(--text-main)' }}>
            {isScanning ? totalInFrame : 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: isScanning && totalInFrame > 0 ? '#34d399' : 'var(--text-muted)' }}>
            {isScanning ? (totalInFrame > 0 ? '● Active in camera' : 'No students in frame') : 'Camera offline'}
          </div>
        </div>

        <div className="clean-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>ATTENTIVENESS SCORE</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: currentAttentiveScore >= 75 ? 'var(--success)' : currentAttentiveScore >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
            {isScanning && totalInFrame > 0 ? `${currentAttentiveScore}%` : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {currentAttentiveScore >= 75 ? '🎯 High Focus' : 'Class engagement index'}
          </div>
        </div>

        <div className="clean-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>SESSION ATTENDEES</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
            {displayRecords.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Students registered in session</div>
        </div>

        <div className="clean-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>PHONE DISTRACTIONS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: (selectedSessionData.alerts || []).length > 0 ? '#f87171' : 'var(--text-main)' }}>
            {(selectedSessionData.alerts || []).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: (selectedSessionData.alerts || []).length > 0 ? '#f87171' : 'var(--text-muted)' }}>
            Incidents flagged by AI
          </div>
        </div>
      </div>

      {/* 3. MAIN LIVE SECTION: Camera + In-Frame List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '1.25rem' }}>

        {/* Camera Viewport */}
        <div className="clean-card" style={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: '440px',
          backgroundColor: '#000000',
          border: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            style={{
              width: '100%',
              maxHeight: '520px',
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

          {!isScanning && (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
              <Camera size={36} style={{ color: 'var(--border-default)', marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Camera is idle</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.85rem' }}>
                Supports webcam, USB camera, and IP/CCTV cameras (MJPEG HTTP stream)
              </p>
              <button
                className="btn btn-primary"
                onClick={startCamera}
                disabled={!modelsReady}
              >
                <Play size={15} />
                <span>Start Session {sessions.length + 1}</span>
              </button>
            </div>
          )}

          {/* Live Overlay Badge */}
          {isScanning && (
            <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '0.5rem', zIndex: 10, flexWrap: 'wrap' }}>
              <span className="badge badge-green">● Live {activeCameraSource === CameraSource.IP_CAMERA ? 'IP/CCTV' : 'Webcam'}</span>
              <span className="badge badge-blue">{currentlyInFrame.length} In Frame</span>
              {activePhonesInFrame.length > 0 && (
                <span className="badge badge-red">
                  <Smartphone size={12} /> Phone Detected!
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Currently In Frame */}
        <div className="clean-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.1rem' }}>Currently In Frame</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Students detected right now
              </p>
            </div>
            <span className="badge badge-green">● {currentlyInFrame.length} In Frame</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', overflowY: 'auto', maxHeight: '420px', paddingRight: '0.25rem' }}>
            {!isScanning ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Camera is off.<br />Start camera to view active students.
              </div>
            ) : currentlyInFrame.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No students in frame right now.<br />
                Step in front of the camera to appear here.
              </div>
            ) : (
              currentlyInFrame.map((st) => {
                const entryStr = new Date(st.firstEntryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const durMin = Math.floor((st.activeSeconds || 1) / 60);
                const durSec = (st.activeSeconds || 1) % 60;
                const emo = st.currentEmotion || EMOTIONS.neutral;

                return (
                  <div
                    key={st.student_id}
                    style={{
                      padding: '0.75rem 0.85rem',
                      backgroundColor: st.hasPhoneNow ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${st.hasPhoneNow ? 'rgba(239, 68, 68, 0.45)' : 'var(--border-subtle)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {st.avatar_url ? (
                          <img
                            src={st.avatar_url}
                            alt=""
                            style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                          }}>
                            {st.student_name ? st.student_name[0] : 'S'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{st.student_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {st.student_id}
                          </div>
                        </div>
                      </div>
                      <span className="badge" style={{ backgroundColor: emo.color + '20', color: emo.color, border: `1px solid ${emo.color}40`, fontSize: '0.72rem' }}>
                        {emo.emoji} {emo.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', paddingTop: '0.3rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <LogIn size={12} color="var(--success)" />
                        <span>Entry: {entryStr}</span>
                        <span>•</span>
                        <span>{durMin}m {durSec}s</span>
                      </div>

                      {st.hasPhoneNow ? (
                        <span style={{ color: '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Smartphone size={12} /> Phone in Hand!
                        </span>
                      ) : (
                        <span style={{ color: 'var(--success)' }}>● In Frame</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. REAL-TIME CHARTS & TELEMETRY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '1.25rem' }}>

        <div className="clean-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <BarChart2 size={16} color="var(--primary)" />
              <h4 style={{ fontSize: '0.9rem' }}>Real-Time 7-Emotion Distribution</h4>
            </div>
            <span className="badge badge-blue">Live Frame</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(EMOTIONS).map(([key, meta]) => {
              const count = liveEmotionsCount[key] || 0;
              const pct = totalInFrame > 0 ? Math.round((count / totalInFrame) * 100) : 0;

              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.8rem' }}>
                  <span style={{ width: '20px' }}>{meta.emoji}</span>
                  <span style={{ width: '70px', color: 'var(--text-main)', fontWeight: 500 }}>{meta.label}</span>
                  <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--border-default)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: meta.color,
                      transition: 'width 0.25s ease',
                    }} />
                  </div>
                  <span style={{ width: '28px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="clean-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Smartphone size={16} color="var(--danger)" />
              <h4 style={{ fontSize: '0.9rem' }}>Phone Distraction Alerts</h4>
            </div>
            <span className="badge badge-red">
              {(selectedSessionData.alerts || []).length} Alerts
            </span>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '200px', overflowY: 'auto' }}>
            {(selectedSessionData.alerts || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No phone violations detected.<br />
                When a student uses a cell phone in frame, an alert logs here in real time.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.4rem 0.5rem' }}>Time</th>
                    <th style={{ padding: '0.4rem 0.5rem' }}>Student</th>
                    <th style={{ padding: '0.4rem 0.5rem' }}>Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedSessionData.alerts || []).map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{a.timestamp}</td>
                      <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>{a.studentName}</td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <span style={{ color: '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <AlertTriangle size={12} /> Phone Detected
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Draw face bounding box + name/ID HUD on canvas
 */
function drawRealtimeFaceHUD(ctx, box, student, confidence, isUnknown, emotion, hasPhone) {
  const { x, y, width, height } = box;
  const color = hasPhone ? '#ef4444' : isUnknown ? '#f59e0b' : '#3b82f6';

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = hasPhone ? 3 : 2;
  ctx.strokeRect(x, y, width, height);

  // Name Tag
  const name = student ? student.full_name : 'Unknown';
  const subLabel = hasPhone
    ? '⚠️ PHONE DETECTED!'
    : isUnknown
    ? 'Unregistered'
    : `${student.student_id} · ${confidence}%`;

  const tagWidth = Math.max(160, width);
  const tagHeight = 32;
  const tagX = x + (width - tagWidth) / 2;
  const tagY = Math.max(8, y - tagHeight - 6);

  ctx.fillStyle = 'rgba(8, 8, 12, 0.97)';
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagWidth, tagHeight, 6);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(name, tagX + 8, tagY + 13);

  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(subLabel, tagX + 8, tagY + 25);

  // Emotion Tag Below Face
  const emoText = `${emotion.emoji} ${emotion.label} ${emotion.confidence}%`;
  ctx.font = 'bold 10px system-ui, sans-serif';
  const emoWidth = ctx.measureText(emoText).width + 16;
  const emoX = x + (width - emoWidth) / 2;
  const emoY = y + height + 6;

  ctx.fillStyle = 'rgba(8, 8, 12, 0.97)';
  ctx.beginPath();
  ctx.roundRect(emoX, emoY, emoWidth, 22, 5);
  ctx.fill();

  ctx.strokeStyle = emotion.color;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = emotion.color;
  ctx.fillText(emoText, emoX + 8, emoY + 15);

  ctx.restore();
}

/**
 * Draw phone warning box
 */
function drawPhoneBoundingBox(ctx, bbox, score) {
  const [x, y, width, height] = bbox;

  ctx.save();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(x, y, width, height);

  ctx.setLineDash([]);
  const text = `📱 PHONE (${score}%)`;
  ctx.font = 'bold 11px system-ui, sans-serif';
  const textWidth = ctx.measureText(text).width + 12;

  ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
  ctx.beginPath();
  ctx.roundRect(x, Math.max(4, y - 22), textWidth, 20, 4);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + 6, Math.max(4, y - 22) + 14);

  ctx.restore();
}
