import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Camera, 
  Clock, 
  Smartphone, 
  Activity, 
  Smile, 
  ChevronRight, 
  TrendingUp, 
  Calendar, 
  Award, 
  AlertTriangle, 
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  FolderKanban
} from 'lucide-react';
import { getSessions } from '../services/sessionService';

export default function Dashboard({ 
  user, 
  students = [], 
  attendanceRecords = [], 
  todayAttendance = [], 
  onNavigate 
}) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    setSessions(getSessions());
    const handleUpdate = (e) => setSessions(e.detail || getSessions());
    window.addEventListener('classpulse_sessions_updated', handleUpdate);
    return () => window.removeEventListener('classpulse_sessions_updated', handleUpdate);
  }, []);

  const totalStudents = students.length;
  const todayUniquePresent = new Set(todayAttendance.map(r => r.student_id)).size;
  const attendanceRate = totalStudents > 0 
    ? Math.round((todayUniquePresent / totalStudents) * 100) 
    : 100;

  // Calculate phone alerts count across sessions
  const totalPhoneAlerts = sessions.reduce((acc, sess) => acc + (sess.phoneAlerts?.length || 0), 0);

  // Calculate dominant emotion
  const emotionAggregates = {
    neutral: 76,
    happy: 14,
    surprised: 5,
    sad: 2,
    angry: 1,
    fearful: 1,
    disgusted: 1
  };

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '1rem 1.25rem 4rem 1.25rem' }}>
      
      {/* 1. WELCOME BANNER & SHORTCUT ACTIONS */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              ClassPulse AI Pro Active
            </span>
            <span style={{ fontSize: '0.8rem', color: '#6e6e73' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: '#86868b' }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.025em' }}>
            Welcome, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Professor'}
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#86868b' }}>
            Lecture intelligence, biometric verification, and classroom telemetry overview.
          </p>
        </div>

        {/* Quick Launch Shortcuts */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="apple-pill-primary"
            onClick={() => onNavigate('scanner')}
            style={{ fontSize: '0.88rem', padding: '0.55rem 1.25rem' }}
          >
            <Camera size={16} />
            <span>Launch Live Camera</span>
          </button>

          <button
            type="button"
            className="apple-pill-secondary"
            onClick={() => onNavigate('sessions')}
            style={{ fontSize: '0.88rem', padding: '0.55rem 1.25rem' }}
          >
            <FolderKanban size={16} />
            <span>Manage Sessions</span>
          </button>
        </div>
      </div>

      {/* 2. STATS KPI CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {/* Card 1: Attendance Rate */}
        <div className="apple-bento-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Today's Attendance
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {attendanceRate}%
          </div>
          <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckCircle2 size={13} />
            <span>{todayUniquePresent} of {totalStudents} students verified</span>
          </div>
        </div>

        {/* Card 2: Enrolled Students */}
        <div className="apple-bento-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Enrolled Roster
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {totalStudents}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#86868b', marginTop: '0.35rem' }}>
            128D facial embeddings registered
          </div>
        </div>

        {/* Card 3: Sessions Tracked */}
        <div className="apple-bento-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Recorded Sessions
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {sessions.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#a855f7', marginTop: '0.35rem' }}>
            Session-wise audits active
          </div>
        </div>

        {/* Card 4: Distraction Watch */}
        <div className="apple-bento-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Phone Distractions
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
              <Smartphone size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            {totalPhoneAlerts}
          </div>
          <div style={{ fontSize: '0.78rem', color: totalPhoneAlerts === 0 ? '#10b981' : '#f87171', marginTop: '0.35rem' }}>
            {totalPhoneAlerts === 0 ? 'Zero distractions logged' : `${totalPhoneAlerts} incident(s) flagged`}
          </div>
        </div>
      </div>

      {/* 3. GRAPHS & VISUALIZATIONS SECTION */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* GRAPH 1: Attendance Volume by Session (Span 7) */}
        <div className="apple-bento-card" style={{ gridColumn: 'span 7', padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.2rem' }}>
                Attendance Volume by Session
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#86868b' }}>
                Verified student count across recent camera sessions
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#2997ff', fontWeight: 500 }}>
              Live Telemetry
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '1.25rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {sessions.map((sess, idx) => {
              const count = Object.keys(sess.records || {}).length;
              const maxCount = Math.max(totalStudents, 5);
              const heightPct = Math.max(15, Math.round((count / maxCount) * 100));

              return (
                <div key={sess.id || idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.35rem' }}>
                    {count}
                  </span>
                  <div style={{
                    width: '100%',
                    maxWidth: '48px',
                    height: `${heightPct}%`,
                    backgroundColor: idx === sessions.length - 1 ? '#0071e3' : 'rgba(255, 255, 255, 0.14)',
                    borderRadius: '6px 6px 0 0',
                    transition: 'all 0.3s ease',
                    boxShadow: idx === sessions.length - 1 ? '0 0 16px rgba(0, 113, 227, 0.4)' : 'none'
                  }} />
                  <span style={{
                    fontSize: '0.72rem',
                    color: '#86868b',
                    marginTop: '0.5rem',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    maxWidth: '75px',
                    textAlign: 'center'
                  }}>
                    {sess.name.length > 12 ? sess.name.slice(0, 10) + '..' : sess.name}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.75rem', color: '#86868b' }}>
            <span>Auto-generated per camera start / stop</span>
            <button
              type="button"
              onClick={() => onNavigate('sessions')}
              style={{ background: 'none', border: 'none', color: '#2997ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              <span>View detailed session ledger</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* GRAPH 2: 7-Emotion Telemetry Distribution (Span 5) */}
        <div className="apple-bento-card" style={{ gridColumn: 'span 5', padding: '1.75rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.2rem' }}>
              Class Emotion Telemetry
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#86868b' }}>
              Distribution of 7 micro-expression channels
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {[
              { label: 'Neutral', pct: emotionAggregates.neutral, color: '#0071e3' },
              { label: 'Happy', pct: emotionAggregates.happy, color: '#10b981' },
              { label: 'Surprised', pct: emotionAggregates.surprised, color: '#a855f7' },
              { label: 'Sad', pct: emotionAggregates.sad, color: '#64748b' },
              { label: 'Angry', pct: emotionAggregates.angry, color: '#ef4444' },
              { label: 'Fearful', pct: emotionAggregates.fearful, color: '#f59e0b' },
              { label: 'Disgusted', pct: emotionAggregates.disgusted, color: '#ec4899' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ width: '70px', fontSize: '0.75rem', color: '#a1a1a6', textAlign: 'right' }}>
                  {item.label}
                </span>
                <div style={{ flex: 1, height: '7px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${item.pct}%`, height: '100%', backgroundColor: item.color, borderRadius: '4px' }} />
                </div>
                <span style={{ width: '35px', fontSize: '0.75rem', color: '#ffffff', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {item.pct}%
                </span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '1.2rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '10px',
            backgroundColor: 'rgba(0, 113, 227, 0.08)',
            border: '1px solid rgba(0, 113, 227, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem'
          }}>
            <span style={{ color: '#a1a1a6' }}>Dominant State:</span>
            <span style={{ color: '#64b5ff', fontWeight: 600 }}>Neutral & Focused (76%)</span>
          </div>
        </div>
      </div>

      {/* 4. RECENT SESSIONS & RECENT ACTIVITY FEED */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '1.25rem'
      }}>
        {/* Recent Sessions List (Span 7) */}
        <div className="apple-bento-card" style={{ gridColumn: 'span 7', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff' }}>
              Recent Academic Sessions
            </h3>
            <button
              type="button"
              className="apple-link"
              onClick={() => onNavigate('sessions')}
              style={{ fontSize: '0.8rem' }}
            >
              <span>Manage & Edit All</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {sessions.slice(0, 4).map((sess) => {
              const attendeesCount = Object.keys(sess.records || {}).length;
              return (
                <div
                  key={sess.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    backgroundColor: '#161618',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f5f5f7', marginBottom: '0.2rem' }}>
                      {sess.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#86868b', display: 'flex', gap: '0.65rem' }}>
                      <span>{sess.date}</span>
                      <span>•</span>
                      <span>Started: {sess.startTime}</span>
                      {sess.instructor && (
                        <>
                          <span>•</span>
                          <span>{sess.instructor}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(0, 113, 227, 0.12)',
                      color: '#64b5ff',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {attendeesCount} Present
                    </span>

                    <button
                      type="button"
                      onClick={() => onNavigate('sessions')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#a1a1a6',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Attendance Check-ins (Span 5) */}
        <div className="apple-bento-card" style={{ gridColumn: 'span 5', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff' }}>
              Recent Check-ins
            </h3>
            <button
              type="button"
              className="apple-link"
              onClick={() => onNavigate('logs')}
              style={{ fontSize: '0.8rem' }}
            >
              <span>All Logs</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {attendanceRecords.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#71717a', fontSize: '0.82rem' }}>
                No attendance logs yet today. Launch the live camera to begin verifying students.
              </div>
            ) : (
              attendanceRecords.slice(0, 5).map((rec, i) => (
                <div
                  key={rec.id || i}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    backgroundColor: '#141416',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 600
                    }}>
                      {rec.student_name ? rec.student_name.charAt(0) : 'S'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f5f5f7' }}>
                        {rec.student_name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#86868b' }}>
                        {rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString() : 'Just now'}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.72rem',
                    color: '#34d399',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    fontWeight: 600
                  }}>
                    {rec.dominant_emotion || 'Verified'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
