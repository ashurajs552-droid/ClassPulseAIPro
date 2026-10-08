import React, { useState, useEffect } from 'react';
import { 
  FolderKanban, 
  Calendar, 
  Clock, 
  Users, 
  Smartphone, 
  Edit3, 
  Trash2, 
  Download, 
  Plus, 
  X, 
  Check, 
  AlertTriangle, 
  Search, 
  Smile, 
  FileSpreadsheet,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { 
  getSessions, 
  updateSession, 
  deleteSession, 
  createNewSession 
} from '../services/sessionService';

export default function SessionManager({ onNavigateToScanner }) {
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [editingSession, setEditingSession] = useState(null);
  const [viewingSession, setViewingSession] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editInstructor, setEditInstructor] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Create form state
  const [newSessionName, setNewSessionName] = useState('');
  const [newDepartment, setNewDepartment] = useState('Computer Science');
  const [newInstructor, setNewInstructor] = useState('Dr. Evelyn Reed');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    setSessions(getSessions());
    const handleUpdate = (e) => setSessions(e.detail || getSessions());
    window.addEventListener('classpulse_sessions_updated', handleUpdate);
    return () => window.removeEventListener('classpulse_sessions_updated', handleUpdate);
  }, []);

  const handleOpenEdit = (sess) => {
    setEditingSession(sess);
    setEditName(sess.name);
    setEditDate(sess.date || new Date().toISOString().slice(0, 10));
    setEditInstructor(sess.instructor || 'Dr. Evelyn Reed');
    setEditDepartment(sess.department || 'Computer Science');
    setEditNotes(sess.notes || '');
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingSession || !editName.trim()) return;

    updateSession(editingSession.id, {
      name: editName.trim(),
      date: editDate,
      instructor: editInstructor.trim(),
      department: editDepartment.trim(),
      notes: editNotes.trim()
    });

    setEditingSession(null);
  };

  const handleConfirmDelete = () => {
    if (sessionToDelete) {
      deleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    }
  };

  const handleCreateSession = (e) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    createNewSession({
      name: newSessionName.trim(),
      department: newDepartment.trim(),
      instructor: newInstructor.trim(),
      notes: newNotes.trim()
    });

    setIsCreateOpen(false);
    setNewSessionName('');
    setNewNotes('');
  };

  const handleExportSessionCSV = (sess) => {
    const records = Object.values(sess.records || {});
    const dateStr = sess.date || new Date().toISOString().slice(0, 10);
    const durationMin = Math.round((sess.durationSec || 0) / 60);

    const headers = [
      'Session Name',
      'Date',
      'Start Time',
      'End Time',
      'Duration (Mins)',
      'Student ID',
      'Student Name',
      'Department',
      'First Entry Time',
      'Last Exit Time',
      'Active Presence (Mins)',
      'Phone Distraction Flags',
      'Dominant Emotion'
    ];

    const rows = records.length > 0 
      ? records.map(r => [
          `"${sess.name}"`,
          `"${dateStr}"`,
          `"${sess.startTime || 'N/A'}"`,
          `"${sess.endTime || 'N/A'}"`,
          durationMin,
          `"${r.student_id}"`,
          `"${r.student_name}"`,
          `"${r.department || sess.department || 'General'}"`,
          `"${r.firstEntryTime || 'N/A'}"`,
          `"${r.exitTime || 'Present'}"`,
          Math.round((r.activeSeconds || 0) / 60),
          r.phoneViolations || 0,
          `"${r.currentEmotion || 'neutral'}"`
        ])
      : [[
          `"${sess.name}"`,
          `"${dateStr}"`,
          `"${sess.startTime || 'N/A'}"`,
          `"${sess.endTime || 'N/A'}"`,
          durationMin,
          'N/A',
          'No students recorded',
          'N/A',
          'N/A',
          'N/A',
          0,
          0,
          'N/A'
        ]];

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ClassPulseAIPro_${sess.name.replace(/\\s+/g, '_')}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredSessions = sessions.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.instructor && s.instructor.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.date && s.date.includes(searchQuery))
  );

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '1rem 1.25rem 4rem 1.25rem' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#2997ff', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            <FolderKanban size={15} />
            <span>SESSION LEDGER & AUDITS</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.025em' }}>
            Academic Sessions
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#86868b' }}>
            Manage lecture sessions, edit metadata, inspect attendee breakdowns, and download audited reports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="apple-pill-secondary"
            onClick={() => setIsCreateOpen(true)}
            style={{ fontSize: '0.88rem', padding: '0.55rem 1.25rem' }}
          >
            <Plus size={16} />
            <span>New Session</span>
          </button>

          <button
            type="button"
            className="apple-pill-primary"
            onClick={onNavigateToScanner}
            style={{ fontSize: '0.88rem', padding: '0.55rem 1.25rem' }}
          >
            <span>Start Live Camera Session</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
          <Search size={16} color="#86868b" style={{ position: 'absolute', left: '14px', top: '13px' }} />
          <input
            type="text"
            placeholder="Search sessions by title, date, instructor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              backgroundColor: '#121214',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-pill)',
              color: '#ffffff',
              fontSize: '0.86rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ fontSize: '0.82rem', color: '#86868b' }}>
          Showing {filteredSessions.length} session(s)
        </div>
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="apple-bento-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <FolderKanban size={48} color="#6e6e73" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '0.4rem' }}>
            No matching sessions found
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#86868b', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
            Start a live camera session or create a new session template to begin logging student attendance.
          </p>
          <button
            type="button"
            className="apple-pill-primary"
            onClick={() => setIsCreateOpen(true)}
          >
            Create Session Template
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredSessions.map((sess) => {
            const records = Object.values(sess.records || {});
            const attendeeCount = records.length;
            const phoneAlertsCount = sess.phoneAlerts?.length || 0;
            const durationMin = Math.round((sess.durationSec || 0) / 60);

            return (
              <div
                key={sess.id}
                className="apple-bento-card"
                style={{
                  padding: '1.5rem 1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1.25rem'
                }}
              >
                {/* Session Info */}
                <div style={{ flex: '1 1 320px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                    <h3 style={{ fontSize: '1.18rem', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.015em' }}>
                      {sess.name}
                    </h3>
                    <span style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(0, 113, 227, 0.12)',
                      color: '#64b5ff',
                      fontSize: '0.72rem',
                      fontWeight: 600
                    }}>
                      {sess.department || 'General'}
                    </span>
                  </div>

                  {/* Metadata Chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#86868b', marginBottom: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={13} />
                      <span>{sess.date}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} />
                      <span>{sess.startTime || '09:00 AM'} - {sess.endTime || 'Active'}</span>
                    </span>
                    {durationMin > 0 && (
                      <span style={{ color: '#a1a1a6' }}>
                        ({durationMin} mins)
                      </span>
                    )}
                    {sess.instructor && (
                      <span style={{ color: '#a1a1a6' }}>
                        • {sess.instructor}
                      </span>
                    )}
                  </div>

                  {sess.notes && (
                    <p style={{ fontSize: '0.8rem', color: '#71717a', lineHeight: 1.4, margin: 0 }}>
                      {sess.notes}
                    </p>
                  )}
                </div>

                {/* Session Telemetry Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {/* Attendees */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff' }}>
                      {attendeeCount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#86868b' }}>
                      Students Present
                    </div>
                  </div>

                  {/* Distractions */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 700, color: phoneAlertsCount > 0 ? '#f87171' : '#10b981' }}>
                      {phoneAlertsCount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#86868b' }}>
                      Phone Flags
                    </div>
                  </div>

                  {/* Dominant Emotion */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#64b5ff', textTransform: 'capitalize' }}>
                      {sess.dominantEmotion || 'Neutral'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#86868b' }}>
                      Dominant State
                    </div>
                  </div>
                </div>

                {/* Actions: View, Edit, Export, Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <button
                    type="button"
                    title="View Student Roster"
                    className="btn btn-outline"
                    onClick={() => setViewingSession(sess)}
                    style={{ fontSize: '0.78rem', padding: '0.45rem 0.8rem' }}
                  >
                    <Users size={14} />
                    <span>Roster</span>
                  </button>

                  <button
                    type="button"
                    title="Download Session CSV"
                    className="btn btn-outline"
                    onClick={() => handleExportSessionCSV(sess)}
                    style={{ fontSize: '0.78rem', padding: '0.45rem 0.8rem' }}
                  >
                    <Download size={14} />
                    <span>CSV</span>
                  </button>

                  <button
                    type="button"
                    title="Edit Session Details"
                    className="btn btn-outline"
                    onClick={() => handleOpenEdit(sess)}
                    style={{ width: '34px', height: '34px', padding: 0 }}
                  >
                    <Edit3 size={15} color="#60a5fa" />
                  </button>

                  <button
                    type="button"
                    title="Delete Session"
                    className="btn btn-outline"
                    onClick={() => setSessionToDelete(sess)}
                    style={{ width: '34px', height: '34px', padding: 0 }}
                  >
                    <Trash2 size={15} color="#f87171" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: EDIT SESSION */}
      {editingSession && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 150,
          padding: '1rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: '#0d0d0f',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '2rem',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff' }}>
                  Edit Session Details
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#86868b' }}>
                  Update lecture title, instructor, and classroom notes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="input-label">Session Name / Title</label>
                <input
                  className="input-field"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Session 1 - Advanced Neural Algorithms"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="input-label">Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label">Department</label>
                  <input
                    className="input-field"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    placeholder="Computer Science"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Instructor</label>
                <input
                  className="input-field"
                  value={editInstructor}
                  onChange={(e) => setEditInstructor(e.target.value)}
                  placeholder="Dr. Evelyn Reed"
                />
              </div>

              <div>
                <label className="input-label">Notes & Lecture Agenda</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Topics covered, student questions, assignments discussed..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingSession(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="apple-pill-primary">
                  <Check size={16} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE SESSION */}
      {isCreateOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 150,
          padding: '1rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: '#0d0d0f',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '2rem',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff' }}>
                  Create Session Template
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#86868b' }}>
                  Define a scheduled session for upcoming lecture attendance
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="input-label">Session Name</label>
                <input
                  className="input-field"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder={`Session ${sessions.length + 1} - Systems Architecture`}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="input-label">Department</label>
                  <input
                    className="input-field"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="Computer Science"
                  />
                </div>
                <div>
                  <label className="input-label">Instructor</label>
                  <input
                    className="input-field"
                    value={newInstructor}
                    onChange={(e) => setNewInstructor(e.target.value)}
                    placeholder="Dr. Evelyn Reed"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Session Notes / Agenda</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Syllabus topic, exam announcement, homework due date..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="apple-pill-primary">
                  <Plus size={16} />
                  <span>Create Session</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {sessionToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 160,
          padding: '1rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '420px',
            backgroundColor: '#0d0d0f',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '24px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.45rem' }}>
              Delete "{sessionToDelete.name}"?
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#86868b', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              This will permanently remove this session and all its associated telemetry and presence timestamps. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSessionToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
              >
                <Trash2 size={15} />
                <span>Delete Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW ROSTER DETAILS */}
      {viewingSession && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 150,
          padding: '1rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            overflowY: 'auto',
            backgroundColor: '#0d0d0f',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '2rem',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff' }}>
                  {viewingSession.name} Roster
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#86868b' }}>
                  {viewingSession.date} • {viewingSession.startTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingSession(null)}
                style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            {Object.keys(viewingSession.records || {}).length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#86868b', fontSize: '0.85rem' }}>
                No student biometric records logged in this session yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {Object.values(viewingSession.records).map((r) => (
                  <div
                    key={r.student_id}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      backgroundColor: '#161618',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ffffff' }}>
                        {r.student_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#86868b', display: 'flex', gap: '0.65rem' }}>
                        <span>ID: {r.student_id}</span>
                        <span>•</span>
                        <span>First Entry: {r.firstEntryTime || 'N/A'}</span>
                        <span>•</span>
                        <span>Last Exit: {r.exitTime || 'Present'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {r.phoneViolations > 0 && (
                        <span style={{ fontSize: '0.72rem', color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                          {r.phoneViolations} Phone Flag(s)
                        </span>
                      )}
                      <span style={{ fontSize: '0.72rem', color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 600, textTransform: 'capitalize' }}>
                        {r.currentEmotion || 'Present'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="apple-pill-secondary"
                onClick={() => handleExportSessionCSV(viewingSession)}
                style={{ fontSize: '0.84rem' }}
              >
                <Download size={15} />
                <span>Export CSV Audit</span>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setViewingSession(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
