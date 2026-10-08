import React, { useState, useRef, useEffect } from 'react';
import { 
  UserPlus, 
  Camera, 
  Upload, 
  Check, 
  Trash2, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  RefreshCw,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { detectSingleFaceDescriptor, DetectorType } from '../services/faceEngine';
import { saveStudent, deleteStudent } from '../services/storageService';
import { playCaptureSound, playSuccessChime } from '../utils/audio';

export default function StudentEnrollment({ students, onStudentUpdated, modelsReady }) {
  // Form State
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  
  // Biometric Descriptors Array (multi-angle support for ultra-high accuracy)
  const [descriptors, setDescriptors] = useState([]);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Guided capture step: 0 = Frontal Neutral, 1 = Gentle Smile, 2 = Slight Angle
  const [captureStep, setCaptureStep] = useState(0);

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const videoRef = useRef(null);

  const STEPS = [
    { title: 'Frontal (Neutral)', instruction: 'Look directly at camera with neutral expression' },
    { title: 'Expression (Smile)', instruction: 'Look straight with a natural gentle smile' },
    { title: 'Angle (Slight Turn)', instruction: 'Tilt or angle your head slightly 10-15°' },
  ];

  // Start Camera for Enrollment
  const startCamera = async () => {
    try {
      setStatusMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera enrollment error:', err);
      setStatusMessage({ type: 'error', text: 'Camera access denied. Please grant webcam permissions.' });
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Capture face descriptor from live video
  const handleCaptureAngle = async () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    setStatusMessage({ type: 'info', text: 'Analyzing facial features & extracting 128D embedding...' });

    try {
      const result = await detectSingleFaceDescriptor(videoRef.current, DetectorType.SSD_MOBILENET_V1);

      if (!result) {
        setStatusMessage({
          type: 'error',
          text: 'No face clearly detected. Please ensure your face is well lit and centered in the frame.',
        });
        setIsCapturing(false);
        return;
      }

      playCaptureSound();

      // Capture thumbnail on first shot if not already set
      if (!avatarPreview) {
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = 160;
        snapCanvas.height = 160;
        const ctx = snapCanvas.getContext('2d');
        const box = result.box;
        // Crop around face with margin
        const pad = box.width * 0.3;
        ctx.drawImage(
          videoRef.current,
          Math.max(0, box.x - pad),
          Math.max(0, box.y - pad),
          box.width + pad * 2,
          box.height + pad * 2,
          0,
          0,
          160,
          160
        );
        setAvatarPreview(snapCanvas.toDataURL('image/jpeg', 0.8));
      }

      const updatedDescriptors = [...descriptors, result.descriptor];
      setDescriptors(updatedDescriptors);

      if (captureStep < STEPS.length - 1) {
        setCaptureStep(captureStep + 1);
        setStatusMessage({
          type: 'success',
          text: `Sample ${captureStep + 1}/${STEPS.length} captured! Please follow prompt for next angle.`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `All ${STEPS.length} angles captured! Ready to save student profile.`,
        });
      }
    } catch (err) {
      console.error('Descriptor extraction failed:', err);
      setStatusMessage({ type: 'error', text: 'Failed to extract face features: ' + err.message });
    } finally {
      setIsCapturing(false);
    }
  };

  // Upload Photo File
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage({ type: 'info', text: 'Processing uploaded image...' });

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const result = await detectSingleFaceDescriptor(img, DetectorType.SSD_MOBILENET_V1);
          if (!result) {
            setStatusMessage({ type: 'error', text: 'No face detected in uploaded photo. Please choose another.' });
            return;
          }

          playCaptureSound();
          setDescriptors([result.descriptor]);
          setAvatarPreview(event.target.result);
          setStatusMessage({ type: 'success', text: 'Face embedding extracted from image successfully!' });
        } catch (err) {
          setStatusMessage({ type: 'error', text: 'Error analyzing photo: ' + err.message });
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Submit and Save Student
  const handleSaveStudent = async (e) => {
    e.preventDefault();

    if (!fullName.trim() || !studentId.trim()) {
      setStatusMessage({ type: 'error', text: 'Please fill in Student Name and Student ID.' });
      return;
    }

    if (descriptors.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please capture at least one face biometric sample.' });
      return;
    }

    setStatusMessage({ type: 'info', text: 'Registering student biometric profile...' });

    try {
      const studentData = {
        full_name: fullName.trim(),
        student_id: studentId.trim(),
        email: email.trim(),
        department: department.trim(),
        face_descriptors: descriptors,
        avatar_url: avatarPreview,
      };

      const { student, supabaseSynced } = await saveStudent(studentData);
      playSuccessChime();

      setStatusMessage({
        type: 'success',
        text: `Student "${fullName}" enrolled successfully! ${supabaseSynced ? '(Synced to Supabase)' : '(Saved locally)'}`,
      });

      // Reset form
      setFullName('');
      setStudentId('');
      setEmail('');
      setDescriptors([]);
      setAvatarPreview(null);
      setCaptureStep(0);
      stopCamera();

      if (onStudentUpdated) onStudentUpdated();
    } catch (err) {
      console.error('Failed to enroll student:', err);
      setStatusMessage({ type: 'error', text: 'Failed to enroll student: ' + err.message });
    }
  };

  // Delete student
  const handleDelete = async (sId, name) => {
    if (window.confirm(`Are you sure you want to remove ${name} (${sId})?`)) {
      await deleteStudent(sId);
      if (onStudentUpdated) onStudentUpdated();
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(350px, 1fr)', gap: '1.5rem', padding: '0 1rem 2rem 1rem' }}>
      {/* Left Column: Biometric Enrollment Wizard */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(139, 92, 246, 0.3)'
            }}>
              <UserPlus size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Student Biometric Enrollment</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                High-precision multi-angle 128D facial vector mapping
              </p>
            </div>
          </div>
          <span className="vf-badge vf-badge-violet">
            <ShieldCheck size={13} />
            <span>100% ACCURACY CALIBRATION</span>
          </span>
        </div>

        {/* Status Message Alert */}
        {statusMessage && (
          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.85rem',
            backgroundColor: statusMessage.type === 'error' ? 'rgba(244, 63, 94, 0.15)' : statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)',
            border: `1px solid ${statusMessage.type === 'error' ? 'rgba(244, 63, 94, 0.3)' : statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`,
            color: statusMessage.type === 'error' ? '#f87171' : statusMessage.type === 'success' ? '#34d399' : '#38bdf8',
          }}>
            {statusMessage.type === 'error' ? <AlertCircle size={18} /> : statusMessage.type === 'success' ? <Check size={18} /> : <Sparkles size={18} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveStudent}>
          {/* Metadata Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="vf-label">Full Name *</label>
              <input
                className="vf-input"
                placeholder="e.g. Alex Morgan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="vf-label">Student ID / USN *</label>
              <input
                className="vf-input"
                placeholder="e.g. 1MS22CS001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="vf-label">Email Address</label>
              <input
                type="email"
                className="vf-input"
                placeholder="alex.morgan@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="vf-label">Department / Branch</label>
              <input
                className="vf-input"
                placeholder="e.g. Artificial Intelligence & ML"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>

          {/* Multi-Angle Guided Biometric Capture Section */}
          <div style={{
            background: 'rgba(7, 10, 18, 0.65)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Multi-Angle Face Registration</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                  Capturing 3 angles builds a 3D descriptor cluster for near-100% recognition reliability
                </p>
              </div>

              {/* Angle steps tracker */}
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {STEPS.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: descriptors[idx] ? '#10b981' : captureStep === idx ? 'var(--violet-500)' : 'rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      boxShadow: descriptors[idx] ? '0 0 10px #10b981' : 'none',
                    }}
                  >
                    {descriptors[idx] ? <Check size={14} /> : idx + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Live Camera View for Enrollment */}
            <div style={{
              position: 'relative',
              width: '100%',
              minHeight: '260px',
              backgroundColor: '#04060a',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              border: '1px solid var(--glass-border)'
            }}>
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    style={{ width: '100%', maxHeight: '320px', objectFit: 'contain' }}
                  />
                  {/* Face Alignment Reticle */}
                  <div style={{
                    position: 'absolute',
                    width: '160px',
                    height: '200px',
                    borderRadius: '50%',
                    border: '2px dashed #8b5cf6',
                    pointerEvents: 'none',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
                  }} />

                  {/* Step Guidance Prompt */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    right: '12px',
                    backgroundColor: 'rgba(7, 10, 18, 0.85)',
                    backdropFilter: 'blur(8px)',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    textAlign: 'center',
                    fontSize: '0.82rem',
                    color: '#c084fc',
                    fontWeight: 600
                  }}>
                    Step {captureStep + 1} of {STEPS.length}: {STEPS[captureStep].instruction}
                  </div>
                </>
              ) : avatarPreview ? (
                <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #10b981', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)', marginBottom: '0.75rem' }}
                  />
                  <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>
                    ✓ {descriptors.length} Biometric Descriptors Captured
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <Camera size={36} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Start webcam or upload a photo to capture face descriptors
                  </p>
                </div>
              )}
            </div>

            {/* Camera / Capture Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {!cameraActive ? (
                <button
                  type="button"
                  className="vf-btn vf-btn-violet"
                  onClick={startCamera}
                  disabled={!modelsReady}
                >
                  <Camera size={16} />
                  <span>Start Enrollment Camera</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="vf-btn vf-btn-success"
                    onClick={handleCaptureAngle}
                    disabled={isCapturing}
                  >
                    <CheckCircle2 size={16} />
                    <span>{isCapturing ? 'Analyzing...' : `Capture Angle #${captureStep + 1}`}</span>
                  </button>

                  <button
                    type="button"
                    className="vf-btn vf-btn-ghost"
                    onClick={stopCamera}
                  >
                    Close Camera
                  </button>
                </>
              )}

              {/* Upload alternative */}
              <label className="vf-btn vf-btn-ghost" style={{ cursor: 'pointer' }}>
                <Upload size={16} />
                <span>Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
              </label>

              {descriptors.length > 0 && (
                <button
                  type="button"
                  className="vf-btn vf-btn-danger"
                  onClick={() => {
                    setDescriptors([]);
                    setAvatarPreview(null);
                    setCaptureStep(0);
                  }}
                  style={{ marginLeft: 'auto' }}
                >
                  <Trash2 size={16} />
                  <span>Clear Descriptors</span>
                </button>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="vf-btn vf-btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: 'var(--radius-md)' }}
            disabled={descriptors.length === 0}
          >
            <UserPlus size={18} />
            <span>Complete Enrollment ({descriptors.length} Samples Enrolled)</span>
          </button>
        </form>
      </div>

      {/* Right Column: Enrolled Students Directory */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Registered Students</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {students.length} students currently enrolled
            </p>
          </div>
          <span className="vf-badge vf-badge-cyan">{students.length} Active</span>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="vf-input"
            placeholder="Search student name or USN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>

        {/* Students List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', maxHeight: '560px', paddingRight: '0.25rem' }}>
          {filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No students found.<br />Register the first student using the form on the left.
            </div>
          ) : (
            filteredStudents.map((s) => {
              const descriptorCount = Array.isArray(s.face_descriptors) ? s.face_descriptors.length : 0;

              return (
                <div
                  key={s.student_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'rgba(7, 10, 18, 0.5)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    {s.avatar_url ? (
                      <img
                        src={s.avatar_url}
                        alt={s.full_name}
                        style={{ width: '42px', height: '42px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--glass-border)' }}
                      />
                    ) : (
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.95rem'
                      }}>
                        {s.full_name ? s.full_name[0] : 'S'}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-white)' }}>
                        {s.full_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{s.student_id}</span>
                        <span>•</span>
                        <span>{s.department || 'General'}</span>
                      </div>
                      <div style={{ marginTop: '0.2rem' }}>
                        <span className="vf-badge vf-badge-violet" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
                          {descriptorCount > 1 ? `${descriptorCount} Angles Enrolled` : '1 Face Sample'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="vf-btn vf-btn-danger"
                    onClick={() => handleDelete(s.student_id, s.full_name)}
                    title="Delete Student"
                    style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
