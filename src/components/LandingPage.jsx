import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  UserPlus, 
  ClipboardCheck, 
  Smartphone, 
  Clock, 
  Smile, 
  ArrowRight, 
  CheckCircle2, 
  Database, 
  ShieldCheck, 
  Sparkles, 
  Play, 
  BarChart3,
  Layers,
  GraduationCap,
  AlertTriangle
} from 'lucide-react';

export default function LandingPage({ onNavigate, totalStudents = 0, isSupabaseActive = false }) {
  // Simulated dynamic demo state for hero preview
  const [mockTime, setMockTime] = useState('09:42:15 AM');
  const [mockEmotionIdx, setMockEmotionIdx] = useState(0);

  const mockEmotions = [
    { label: 'Attentive', emoji: '😐', color: '#94a3b8', pct: 96 },
    { label: 'Happy', emoji: '😊', color: '#10b981', pct: 92 },
    { label: 'Curious', emoji: '💡', color: '#38bdf8', pct: 88 },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setMockTime(new Date().toLocaleTimeString());
    }, 1000);
    const emoTimer = setInterval(() => {
      setMockEmotionIdx((prev) => (prev + 1) % mockEmotions.length);
    }, 3200);

    return () => {
      clearInterval(timer);
      clearInterval(emoTimer);
    };
  }, []);

  const currentMockEmotion = mockEmotions[mockEmotionIdx];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', padding: '1rem 1.5rem 4rem 1.5rem', maxWidth: '1240px', margin: '0 auto' }}>
      
      {/* 1. HERO SECTION */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, 1fr)',
        gap: '2.5rem',
        alignItems: 'center',
        padding: '2.5rem 0 1rem 0'
      }}>
        {/* Left Column: Headline & Action */}
        <div>
          {/* Eyebrow Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            backgroundColor: 'var(--primary-light)',
            color: '#60a5fa',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
            border: '1px solid rgba(59, 130, 246, 0.25)'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'inline-block' }} />
            <span>Next-Gen Biometric Classroom Attendance</span>
          </div>

          <h1 style={{ fontSize: '2.75rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.25rem', letterSpacing: '-0.025em' }}>
            Smart Facial Attendance & <span style={{ color: 'var(--primary)' }}>Real-Time Attention</span> Intelligence.
          </h1>

          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '560px' }}>
            Zero-touch facial recognition, automatic entry & exit timestamping, 7-emotion classroom telemetry, and mobile phone distraction alerts — running directly in your browser with Supabase cloud backup.
          </p>

          {/* Action CTAs */}
          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => onNavigate('scanner')}
              style={{ padding: '0.85rem 1.75rem', fontSize: '1rem', borderRadius: 'var(--radius-md)' }}
            >
              <Camera size={18} />
              <span>Launch Live Camera</span>
              <ArrowRight size={16} />
            </button>

            <button
              className="btn btn-outline"
              onClick={() => onNavigate('enrollment')}
              style={{ padding: '0.85rem 1.5rem', fontSize: '1rem', borderRadius: 'var(--radius-md)' }}
            >
              <UserPlus size={18} />
              <span>Register Students ({totalStudents})</span>
            </button>
          </div>

          {/* Trust Features */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="var(--success)" />
              <span>30+ FPS Real-Time Tracking</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="var(--success)" />
              <span>AI Phone Detection</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="var(--success)" />
              <span>Accurate CSV Session Export</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Animated Live Scanner Preview */}
        <div className="clean-card" style={{
          position: 'relative',
          padding: '1.25rem',
          backgroundColor: '#070a14',
          border: '1px solid var(--border-default)',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7)'
        }}>
          {/* Mock Camera Viewport */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '340px',
            backgroundColor: '#0a0f1d',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            {/* Live Indicator */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              display: 'flex',
              gap: '0.5rem',
              zIndex: 10
            }}>
              <span className="badge badge-green">● Live Classroom</span>
              <span className="badge badge-blue">1 In Frame</span>
            </div>

            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              {mockTime}
            </div>

            {/* Simulated Student Face Box with Animated Tracking */}
            <div style={{
              position: 'relative',
              width: '170px',
              height: '210px',
              border: '2.5px solid #3b82f6',
              borderRadius: '4px',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px'
            }}>
              {/* Floating Name Badge */}
              <div style={{
                position: 'absolute',
                top: '-32px',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                padding: '3px 10px',
                whiteSpace: 'nowrap',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.78rem', color: '#fff' }}>Aashuraj S</div>
                <div style={{ fontSize: '0.68rem', color: '#60a5fa' }}>1VI23AI001 • In Frame</div>
              </div>

              {/* Center Silhouette */}
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '2px solid rgba(59, 130, 246, 0.4)',
                marginTop: '25px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem'
              }}>
                🎓
              </div>

              {/* Floating Emotion Tag */}
              <div style={{
                position: 'absolute',
                bottom: '-28px',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: `1px solid ${currentMockEmotion.color}`,
                borderRadius: '6px',
                padding: '2px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                color: currentMockEmotion.color,
                fontWeight: 600,
                transition: 'all 0.3s ease'
              }}>
                <span>{currentMockEmotion.emoji}</span>
                <span>{currentMockEmotion.label} ({currentMockEmotion.pct}%)</span>
              </div>
            </div>

            {/* Simulated Detected Phone Box */}
            <div style={{
              position: 'absolute',
              bottom: '24px',
              right: '24px',
              border: '2px dashed #ef4444',
              borderRadius: '4px',
              padding: '4px 8px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)'
            }}>
              <div style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Smartphone size={11} />
                <span>PHONE DETECTED (88%)</span>
              </div>
            </div>
          </div>

          {/* Under-Preview Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '0.85rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}>
            <div>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>● Automated Entry:</span> 09:00:12 AM
            </div>
            <div>
              <span style={{ color: '#60a5fa', fontWeight: 600 }}>Duration:</span> 42m 03s
            </div>
            <div>
              <span style={{ color: '#f87171', fontWeight: 600 }}>Warnings:</span> 1 Phone
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS & ARCHITECTURE BAR */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        <div className="clean-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem' }}>
            &lt; 30ms
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
            Real-Time 30+ FPS Tracking
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Instant face following without webcam stutter or lag.
          </div>
        </div>

        <div className="clean-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)', marginBottom: '0.25rem' }}>
            7 Emotions
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
            Real-Time Expression Telemetry
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Neutral, Happy, Sad, Angry, Fearful, Disgusted, Surprised.
          </div>
        </div>

        <div className="clean-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', marginBottom: '0.25rem' }}>
            AI Phone Watch
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
            Smart Distraction Alerts
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            COCO-SSD detects cell phones and logs incidents.
          </div>
        </div>

        <div className="clean-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a855f7', marginBottom: '0.25rem' }}>
            Session CSV
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
            Accurate Audit Reports
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Entry, exit, minutes in class, and phone violation counts.
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES GRID */}
      <section>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Everything You Need for Modern Classroom Attendance
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
            Engineered with deep learning vision models running client-side, zero cloud latency, and complete privacy.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Feature 1 */}
          <div className="clean-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              marginBottom: '1rem'
            }}>
              <Camera size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
              Multi-Angle 128D Face Recognition
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Register students with high-accuracy embeddings. Multi-descriptor cluster matching ensures reliable recognition across poses and lighting.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="clean-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--success-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--success)',
              marginBottom: '1rem'
            }}>
              <Clock size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
              Automated Entry & Exit Timestamps
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              No calling names. When a student enters camera view, entry is stamped. If they leave the room, their exit timestamp is logged automatically.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="clean-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              marginBottom: '1rem'
            }}>
              <Smartphone size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
              Mobile Phone Distraction AI
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Detects smartphones in camera view in real time. Highlights the distraction with a dashed red alert box, warns the student, and logs the incident.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="clean-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              marginBottom: '1rem'
            }}>
              <Smile size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
              Live 7-Emotion Radar
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Track classroom mood in real time. See exact distributions of Neutral (Attentive), Happy, Curious, Fatigued, and Stressed students.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="clean-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(168, 85, 247, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#a855f7',
              marginBottom: '1rem'
            }}>
              <BarChart3 size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
              Accurate Session CSV Reports
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Download complete lecture attendance spreadsheets with student names, USN, entry and exit times, duration in minutes, and phone distraction counts.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="clean-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06b6d4',
              marginBottom: '1rem'
            }}>
              <Database size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
              Supabase Cloud & Offline Ready
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Connect your Supabase database with one click, or run completely offline with local storage. Pre-bundled models ensure zero Vercel deployment hurdles.
            </p>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS (3 Simple Steps) */}
      <section className="clean-card" style={{ padding: '2.5rem', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            Simple 3-Step Workflow
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Designed for busy educators and university staff — zero manual data entry.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '2rem'
        }}>
          <div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              marginBottom: '1rem'
            }}>
              1
            </div>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>Enroll Students Once</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Take a webcam photo or upload a picture for each student. Feature descriptors are computed instantly.
            </p>
          </div>

          <div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              marginBottom: '1rem'
            }}>
              2
            </div>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>Turn on Camera in Class</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              The system identifies students, tracks their entry time, measures emotion in real time, and alerts on phone usage.
            </p>
          </div>

          <div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              marginBottom: '1rem'
            }}>
              3
            </div>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>Download Verified CSV</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Export complete session logs with exact entry, exit, duration in minutes, and phone distraction statistics.
            </p>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CALL TO ACTION BANNER */}
      <section style={{
        padding: '3rem 2rem',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff'
        }}>
          <GraduationCap size={28} />
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>
          Ready to Automate Classroom Attendance?
        </h2>

        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '520px', margin: 0 }}>
          Start taking attendance with live facial recognition, emotion insights, and phone alerts in under 30 seconds.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => onNavigate('scanner')}
            style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
          >
            <Play size={18} />
            <span>Launch Live Camera</span>
          </button>

          <button
            className="btn btn-outline"
            onClick={() => onNavigate('enrollment')}
            style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}
          >
            <UserPlus size={18} />
            <span>Register a Student</span>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <GraduationCap size={18} color="var(--primary)" />
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>VeriFace Attendance</span>
          <span>•</span>
          <span>Built for High-Precision Classroom Intelligence</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>Vercel Optimized</span>
          <span>•</span>
          <span>Supabase Ready</span>
          <span>•</span>
          <span>Offline Fallback</span>
        </div>
      </footer>
    </div>
  );
}
