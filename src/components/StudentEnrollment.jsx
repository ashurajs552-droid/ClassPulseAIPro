import React, { useState, useRef, useEffect } from 'react';
import { 
  UserPlus, 
  Camera, 
  Upload, 
  Check, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  RefreshCw
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
  
  // Face Descriptors & Photo Preview
  const [descriptors, setDescriptors] = useState([]);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Turn on Camera
  const startCamera = async () => {
    setStatusMessage(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (e) {
        // Fallback for strict browser permissions
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setStatusMessage({
        type: 'error',
        text: 'Unable to open camera. Please check your browser webcam permissions.',
      });
      setCameraActive(false);
    }
  };

  // Turn off Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Take photo and extract facial descriptor
  const handleCapturePhoto = async () => {
    if (!videoRef.current || isProcessing) return;

    setIsProcessing(true);
    setStatusMessage({ type: 'info', text: 'Detecting face...' });

    try {
      const result = await detectSingleFaceDescriptor(videoRef.current, DetectorType.SSD_MOBILENET_V1);

      if (!result) {
        setStatusMessage({
          type: 'error',
          text: 'No face detected. Please face the camera directly and make sure the room is well lit.',
        });
        setIsProcessing(false);
        return;
      }

      playCaptureSound();

      // Create cropped avatar preview
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      const box = result.box;
      const pad = box.width * 0.25;

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

      const capturedPhoto = canvas.toDataURL('image/jpeg', 0.85);
      if (!avatarPreview) {
        setAvatarPreview(capturedPhoto);
      }

      const updatedDescriptors = [...descriptors, result.descriptor];
      setDescriptors(updatedDescriptors);

      setStatusMessage({
        type: 'success',
        text: `Photo captured successfully! (${updatedDescriptors.length} sample${updatedDescriptors.length > 1 ? 's' : ''} saved)`,
      });
    } catch (err) {
      console.error('Capture error:', err);
      setStatusMessage({ type: 'error', text: 'Error detecting face: ' + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload an image from device
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage({ type: 'info', text: 'Scanning uploaded photo...' });

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const result = await detectSingleFaceDescriptor(img, DetectorType.SSD_MOBILENET_V1);
          if (!result) {
            setStatusMessage({ type: 'error', text: 'No face found in this image. Please upload a clear portrait.' });
            return;
          }

          playCaptureSound();
          setDescriptors([result.descriptor]);
          setAvatarPreview(event.target.result);
          setStatusMessage({ type: 'success', text: 'Face recognized and saved from image!' });
        } catch (err) {
          setStatusMessage({ type: 'error', text: 'Failed to process image: ' + err.message });
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Save student to database
  const handleSaveStudent = async (e) => {
    e.preventDefault();

    if (!fullName.trim() || !studentId.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter student name and ID / USN.' });
      return;
    }

    if (descriptors.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please take a photo or upload an image first.' });
      return;
    }

    setStatusMessage({ type: 'info', text: 'Saving student record...' });

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
        text: `Student "${fullName}" enrolled successfully! ${supabaseSynced ? '(Saved to Supabase)' : '(Saved to local database)'}`,
      });

      // Clear form
      setFullName('');
      setStudentId('');
      setEmail('');
      setDescriptors([]);
      setAvatarPreview(null);
      stopCamera();

      if (onStudentUpdated) onStudentUpdated();
    } catch (err) {
      console.error('Failed to save student:', err);
      setStatusMessage({ type: 'error', text: 'Failed to save: ' + err.message });
    }
  };

  const handleDelete = async (sId, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.25rem 2rem 1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 1fr)', gap: '1.5rem' }}>
        
        {/* Registration Form */}
        <div className="clean-card" style={{ padding: '1.75rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '0.35rem' }}>Register Student</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Add student information and take a quick photo for automatic facial attendance.
            </p>
          </div>

          {/* Feedback Alert */}
          {statusMessage && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontSize: '0.875rem',
              backgroundColor: statusMessage.type === 'error' ? 'var(--danger-light)' : statusMessage.type === 'success' ? 'var(--success-light)' : 'var(--primary-light)',
              color: statusMessage.type === 'error' ? '#f87171' : statusMessage.type === 'success' ? '#34d399' : '#60a5fa',
              border: `1px solid ${statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
            }}>
              {statusMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveStudent}>
            {/* Student Info Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label className="input-label">Full Name *</label>
                <input
                  className="input-field"
                  placeholder="e.g. Aashuraj S"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="input-label">Student ID / Roll No *</label>
                <input
                  className="input-field"
                  placeholder="e.g. 1VI23AI001"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="input-label">Department / Class</label>
                <input
                  className="input-field"
                  placeholder="e.g. AI & Machine Learning"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <div>
                <label className="input-label">Email Address (Optional)</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Photo Capture Area */}
            <div style={{
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '0.15rem' }}>Student Face Photo</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Capture from webcam or upload a clear picture
                  </p>
                </div>

                {descriptors.length > 0 && (
                  <span className="badge badge-green">
                    ✓ {descriptors.length} Photo{descriptors.length > 1 ? 's' : ''} Enrolled
                  </span>
                )}
              </div>

              {/* Camera Frame (ALWAYS in DOM to avoid ref null errors) */}
              <div style={{
                position: 'relative',
                width: '100%',
                minHeight: '260px',
                maxHeight: '340px',
                backgroundColor: '#040711',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                border: '1px solid var(--border-default)'
              }}>
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    maxHeight: '320px',
                    objectFit: 'contain',
                    display: cameraActive ? 'block' : 'none'
                  }}
                />

                {/* When camera is OFF, show avatar preview or placeholder */}
                {!cameraActive && avatarPreview && (
                  <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <img
                      src={avatarPreview}
                      alt="Student"
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid var(--success)',
                        marginBottom: '0.75rem'
                      }}
                    />
                    <div style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 500 }}>
                      ✓ Photo ready for recognition
                    </div>
                  </div>
                )}

                {!cameraActive && !avatarPreview && (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                    <Camera size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.6 }} />
                    <p style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>Camera is currently off</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Click "Open Camera" below or upload a photo from your computer
                    </p>
                  </div>
                )}
              </div>

              {/* Camera Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {!cameraActive ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={startCamera}
                    disabled={!modelsReady}
                  >
                    <Camera size={16} />
                    <span>Open Camera</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={handleCapturePhoto}
                      disabled={isProcessing}
                    >
                      <Camera size={16} />
                      <span>{isProcessing ? 'Analyzing...' : 'Take Photo'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={stopCamera}
                    >
                      Stop Camera
                    </button>
                  </>
                )}

                <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                  <Upload size={16} />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>

                {descriptors.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setDescriptors([]);
                      setAvatarPreview(null);
                    }}
                    style={{ marginLeft: 'auto' }}
                  >
                    <Trash2 size={16} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
              disabled={descriptors.length === 0}
            >
              <UserPlus size={18} />
              <span>Save & Register Student</span>
            </button>
          </form>
        </div>

        {/* Enrolled Students Directory */}
        <div className="clean-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.15rem' }}>Students List</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {students.length} registered student{students.length !== 1 ? 's' : ''}
              </p>
            </div>
            <span className="badge badge-blue">{students.length} Active</span>
          </div>

          {/* Search Field */}
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="input-field"
              placeholder="Search by name or USN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', maxHeight: '520px', paddingRight: '0.25rem' }}>
            {filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No students enrolled yet.<br />Register the first student using the form.
              </div>
            ) : (
              filteredStudents.map((s) => (
                <div
                  key={s.student_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.9rem',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {s.avatar_url ? (
                      <img
                        src={s.avatar_url}
                        alt={s.full_name}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-default)' }}
                      />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                      }}>
                        {s.full_name ? s.full_name[0] : 'S'}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {s.full_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{s.student_id}</span>
                        {s.department && <span> • {s.department}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(s.student_id, s.full_name)}
                    title="Delete Student"
                    style={{ width: '32px', height: '32px', padding: 0, borderRadius: 'var(--radius-sm)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
