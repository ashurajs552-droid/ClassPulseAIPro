import React, { useState } from 'react';
import { 
  Camera, 
  UserPlus, 
  ClipboardCheck, 
  Smartphone, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Database, 
  ChevronRight, 
  Eye, 
  Smile, 
  Sliders, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight 
} from 'lucide-react';

export default function AppleLandingPage({ 
  onLaunchCamera, 
  onRegisterStudent, 
  onViewRecords,
  studentsCount = 0,
  attendanceCount = 0
}) {
  const [activePreviewTab, setActivePreviewTab] = useState('camera'); // 'camera', 'emotions', 'distraction'

  return (
    <div style={{ backgroundColor: '#000000', color: '#f5f5f7', overflowX: 'hidden' }}>
      
      {/* 1. HERO SECTION */}
      <section style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '5rem 1.5rem 3rem 1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Eyebrow badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.9rem',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.8rem',
          fontWeight: 500,
          color: '#a1a1a6',
          marginBottom: '1.75rem',
          letterSpacing: '-0.01em'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#10b981'
          }} />
          <span>VeriFace Pro Biometrics · Client-Side Neural Vision</span>
        </div>

        {/* Apple Headline */}
        <h1 className="apple-headline" style={{
          fontSize: 'clamp(2.75rem, 7.5vw, 5.25rem)',
          maxWidth: '880px',
          margin: '0 auto 1.5rem auto'
        }}>
          Attendance.<br />Re-engineered.
        </h1>

        {/* Subhead in natural human tone */}
        <p style={{
          fontSize: 'clamp(1.1rem, 2.2vw, 1.4rem)',
          color: '#86868b',
          maxWidth: '680px',
          margin: '0 auto 2.5rem auto',
          lineHeight: 1.45,
          fontWeight: 400,
          letterSpacing: '-0.015em'
        }}>
          Instant facial recognition, live 7-emotion telemetry, and real-time distraction alerts. 
          Engineered to run entirely in your browser with zero latency.
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '3.5rem'
        }}>
          <button 
            className="apple-pill-primary" 
            onClick={onLaunchCamera}
            style={{ fontSize: '1.05rem', padding: '0.75rem 1.75rem' }}
          >
            <Camera size={18} />
            <span>Launch Live Camera</span>
          </button>

          <button 
            className="apple-pill-secondary" 
            onClick={onRegisterStudent}
            style={{ fontSize: '1.05rem', padding: '0.75rem 1.75rem' }}
          >
            <UserPlus size={18} />
            <span>Register Student</span>
          </button>
        </div>

        {/* 2. APPLE STUDIO DISPLAY MOCKUP WITH INTERACTIVE PREVIEW */}
        <div style={{
          width: '100%',
          maxWidth: '1020px',
          margin: '0 auto',
          position: 'relative'
        }}>
          {/* Subtle ambient display glow */}
          <div style={{
            position: 'absolute',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '240px',
            background: 'radial-gradient(ellipse at center, rgba(0, 113, 227, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          {/* Device Frame */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            backgroundColor: '#0a0a0c',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            overflow: 'hidden'
          }}>
            
            {/* Display Top Navigation Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1.25rem',
              backgroundColor: '#121214',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              {/* Window dots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ff5f56' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#27c93f' }} />
                <span style={{ fontSize: '0.78rem', color: '#86868b', marginLeft: '0.5rem', fontWeight: 500 }}>
                  VeriFace Pro Studio Monitor · Session 1
                </span>
              </div>

              {/* View switcher tabs inside mockup */}
              <div style={{
                display: 'flex',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                padding: '0.2rem',
                borderRadius: '8px'
              }}>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('camera')}
                  style={{
                    backgroundColor: activePreviewTab === 'camera' ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                    color: activePreviewTab === 'camera' ? '#ffffff' : '#86868b',
                    border: 'none',
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.15s ease'
                  }}
                >
                  Live View
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('emotions')}
                  style={{
                    backgroundColor: activePreviewTab === 'emotions' ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                    color: activePreviewTab === 'emotions' ? '#ffffff' : '#86868b',
                    border: 'none',
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.15s ease'
                  }}
                >
                  7-Emotion Telemetry
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('distraction')}
                  style={{
                    backgroundColor: activePreviewTab === 'distraction' ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                    color: activePreviewTab === 'distraction' ? '#ffffff' : '#86868b',
                    border: 'none',
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.15s ease'
                  }}
                >
                  Phone Distraction
                </button>
              </div>
            </div>

            {/* Display Body Viewport */}
            <div style={{
              height: '420px',
              backgroundColor: '#050507',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}>
              
              {/* TAB 1: LIVE CAMERA VIEW PREVIEW */}
              {activePreviewTab === 'camera' && (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {/* Top HUD Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34d399',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                        CAMERA ACTIVE · 30.2 FPS
                      </span>

                      <span style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: '#a1a1a6',
                        fontSize: '0.72rem',
                        fontWeight: 500
                      }}>
                        SESSION 1 IN PROGRESS
                      </span>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: '#86868b', fontFamily: 'var(--font-mono)' }}>
                      09:41:04 AM
                    </span>
                  </div>

                  {/* Simulated Face Detection Viewport */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {/* Simulated student portrait silhouette */}
                    <div style={{
                      width: '210px',
                      height: '250px',
                      borderRadius: '16px',
                      border: '2px solid #0071e3',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0, 113, 227, 0.04)',
                      boxShadow: '0 0 30px rgba(0, 113, 227, 0.18)'
                    }}>
                      {/* Corner crop marks */}
                      <span style={{ position: 'absolute', top: -4, left: -4, width: 14, height: 14, borderTop: '3px solid #64b5ff', borderLeft: '3px solid #64b5ff' }} />
                      <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderTop: '3px solid #64b5ff', borderRight: '3px solid #64b5ff' }} />
                      <span style={{ position: 'absolute', bottom: -4, left: -4, width: 14, height: 14, borderBottom: '3px solid #64b5ff', borderLeft: '3px solid #64b5ff' }} />
                      <span style={{ position: 'absolute', bottom: -4, right: -4, width: 14, height: 14, borderBottom: '3px solid #64b5ff', borderRight: '3px solid #64b5ff' }} />

                      {/* Face icon silhouette */}
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.75rem'
                      }}>
                        <Smile size={42} color="#ffffff" />
                      </div>

                      {/* Recognition Tag */}
                      <div style={{
                        backgroundColor: '#0071e3',
                        color: '#ffffff',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                      }}>
                        Alexander Wright
                        <div style={{ fontSize: '0.68rem', fontWeight: 400, opacity: 0.9 }}>
                          99.4% Match · Neutral (91%)
                        </div>
                      </div>
                    </div>

                    {/* Real-time telemetry floating card */}
                    <div style={{
                      position: 'absolute',
                      right: '10px',
                      bottom: '10px',
                      backgroundColor: 'rgba(18, 18, 20, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '0.75rem 1rem',
                      backdropFilter: 'blur(16px)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      minWidth: '190px'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Currently In Frame (1)
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f7' }}>
                        Alexander Wright
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#a1a1a6' }}>
                        <span>Entry: 09:40:12 AM</span>
                        <span style={{ color: '#34d399' }}>Present</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 7-EMOTION TELEMETRY PREVIEW */}
              {activePreviewTab === 'emotions' && (
                <div style={{ width: '100%', maxWidth: '580px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff' }}>
                      Real-Time 7-Emotion Telemetry
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#86868b' }}>
                      Continuous micro-expression probability distribution across the frame
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {[
                      { label: 'Neutral', pct: 88, color: '#0071e3' },
                      { label: 'Happy', pct: 6, color: '#10b981' },
                      { label: 'Surprised', pct: 3, color: '#a855f7' },
                      { label: 'Sad', pct: 1, color: '#64748b' },
                      { label: 'Angry', pct: 1, color: '#ef4444' },
                      { label: 'Fearful', pct: 1, color: '#f59e0b' },
                      { label: 'Disgusted', pct: 0, color: '#ec4899' },
                    ].map((emo) => (
                      <div key={emo.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ width: '75px', fontSize: '0.78rem', color: '#a1a1a6', textAlign: 'right' }}>
                          {emo.label}
                        </span>
                        <div style={{ flex: 1, height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${emo.pct}%`, height: '100%', backgroundColor: emo.color, borderRadius: '4px' }} />
                        </div>
                        <span style={{ width: '40px', fontSize: '0.78rem', color: '#ffffff', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {emo.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: PHONE DISTRACTION PREVIEW */}
              {activePreviewTab === 'distraction' && (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: '320px',
                    padding: '1.5rem',
                    borderRadius: '16px',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f87171',
                      marginBottom: '1rem'
                    }}>
                      <Smartphone size={28} />
                    </div>

                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#f87171',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.25rem'
                    }}>
                      Distraction Alert
                    </div>

                    <h4 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: '0.4rem' }}>
                      Mobile Phone Detected
                    </h4>

                    <p style={{ fontSize: '0.8rem', color: '#a1a1a6', marginBottom: '1rem', lineHeight: 1.4 }}>
                      Device usage logged for student in frame. Distracted duration automatically recorded in session audit report.
                    </p>

                    <div style={{
                      display: 'flex',
                      gap: '0.75rem',
                      fontSize: '0.75rem',
                      color: '#86868b',
                      padding: '0.4rem 0.8rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      borderRadius: '8px'
                    }}>
                      <span>Confidence: 94.8%</span>
                      <span>·</span>
                      <span>Flagged: 4.2 sec</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* 3. APPLE SPEC NUMBERS STRIP */}
      <section style={{
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '3rem 1.5rem 4.5rem 1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2.5rem',
          textAlign: 'center'
        }}>
          <div>
            <div style={{
              fontSize: 'clamp(2.5rem, 4.5vw, 3.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              marginBottom: '0.35rem'
            }}>
              30+ FPS
            </div>
            <div style={{ fontSize: '0.9rem', color: '#86868b', fontWeight: 400 }}>
              Fluid real-time camera tracking with TinyFace neural engine
            </div>
          </div>

          <div>
            <div style={{
              fontSize: 'clamp(2.5rem, 4.5vw, 3.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              marginBottom: '0.35rem'
            }}>
              128D
            </div>
            <div style={{ fontSize: '0.9rem', color: '#86868b', fontWeight: 400 }}>
              Biometric vector precision for multi-angle facial identification
            </div>
          </div>

          <div>
            <div style={{
              fontSize: 'clamp(2.5rem, 4.5vw, 3.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              marginBottom: '0.35rem'
            }}>
              7 States
            </div>
            <div style={{ fontSize: '0.9rem', color: '#86868b', fontWeight: 400 }}>
              Real-time emotion & micro-expression classification channels
            </div>
          </div>

          <div>
            <div style={{
              fontSize: 'clamp(2.5rem, 4.5vw, 3.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              marginBottom: '0.35rem'
            }}>
              0 ms
            </div>
            <div style={{ fontSize: '0.9rem', color: '#86868b', fontWeight: 400 }}>
              Cloud latency. 100% on-device WebAssembly computation
            </div>
          </div>
        </div>
      </section>

      {/* 4. APPLE BENTO GRID FEATURE SHOWCASE */}
      <section style={{
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '5rem 1.5rem'
      }}>
        {/* Section Heading */}
        <div style={{ marginBottom: '3.5rem', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            color: '#f5f5f7',
            marginBottom: '0.85rem'
          }}>
            Engineered with extreme precision.
          </h2>
          <p style={{ fontSize: '1.15rem', color: '#86868b', maxWidth: '620px', margin: '0 auto' }}>
            Every layer of the recognition pipeline is tuned for speed, accuracy, and classroom reliability.
          </p>
        </div>

        {/* Bento Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '1.5rem'
        }}>
          
          {/* Card 1: 128D Face Biometrics (Span 8) */}
          <div className="apple-bento-card" style={{ gridColumn: 'span 8', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: '#2997ff',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.75rem'
              }}>
                <Eye size={16} />
                <span>BIOMETRIC RECOGNITION</span>
              </div>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.65rem', letterSpacing: '-0.02em' }}>
                Sub-Second Facial Verification.
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#86868b', lineHeight: 1.5, maxWidth: '520px' }}>
                Converts facial landmark geometry into compact 128-dimensional embedding vectors. 
                Matches enrolled students in under 400 milliseconds, invariant to lighting changes, posture, or eyewear.
              </p>
            </div>

            {/* Visual metric strip */}
            <div style={{
              display: 'flex',
              gap: '1.25rem',
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff' }}>&lt; 0.4s</div>
                <div style={{ fontSize: '0.75rem', color: '#86868b' }}>Identification Lock</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff' }}>68 Points</div>
                <div style={{ fontSize: '0.75rem', color: '#86868b' }}>Landmark Mesh</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff' }}>Strict / Balanced</div>
                <div style={{ fontSize: '0.75rem', color: '#86868b' }}>Cosine Tolerance Control</div>
              </div>
            </div>
          </div>

          {/* Card 2: Phone Distraction Detection (Span 4) */}
          <div className="apple-bento-card" style={{ gridColumn: 'span 4', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: '#f87171',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.75rem'
              }}>
                <Smartphone size={16} />
                <span>DISTRACTION VISION</span>
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.65rem', letterSpacing: '-0.02em' }}>
                Phone Distraction Watch.
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#86868b', lineHeight: 1.5 }}>
                COCO-SSD mobile neural vision spots smartphones in frame instantly. Audio distraction beeps and visual alert banners keep attention focused.
              </p>
            </div>

            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 600 }}>Phone In Frame</span>
              <span style={{ fontSize: '0.72rem', color: '#ffffff', backgroundColor: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                ALERT
              </span>
            </div>
          </div>

          {/* Card 3: 7 Emotions (Span 4) */}
          <div className="apple-bento-card" style={{ gridColumn: 'span 4', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: '#a855f7',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.75rem'
              }}>
                <Smile size={16} />
                <span>MICRO-EXPRESSIONS</span>
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.65rem', letterSpacing: '-0.02em' }}>
                7 Emotional Channels.
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#86868b', lineHeight: 1.5 }}>
                Continuous expression telemetry quantifies classroom interest, comprehension, and confusion throughout the entire lecture.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {['Neutral', 'Happy', 'Surprised', 'Sad', 'Angry', 'Fear', 'Disgust'].map((emo) => (
                <span key={emo} style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.72rem',
                  color: '#f5f5f7'
                }}>
                  {emo}
                </span>
              ))}
            </div>
          </div>

          {/* Card 4: Session Architecture & Audited CSV (Span 8) */}
          <div className="apple-bento-card" style={{ gridColumn: 'span 8', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                color: '#10b981',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.75rem'
              }}>
                <FileSpreadsheet size={16} />
                <span>SESSION ARCHITECTURE</span>
              </div>
              <h3 style={{ fontSize: '1.65rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.65rem', letterSpacing: '-0.02em' }}>
                Isolated Sessions & One-Click Audit Export.
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#86868b', lineHeight: 1.5, maxWidth: '540px' }}>
                Turning the camera on and off automatically defines discrete academic sessions (Session 1, Session 2...). 
                Logs student entry time, exit time, presence duration, and phone distraction occurrences into verified CSV logs.
              </p>
            </div>

            {/* Micro preview table */}
            <div style={{
              marginTop: '1.25rem',
              backgroundColor: '#0a0a0c',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              fontSize: '0.75rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', color: '#86868b', fontWeight: 600, paddingBottom: '0.4rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span>Student</span>
                <span>Session</span>
                <span>Entry</span>
                <span>Duration</span>
                <span>Phone Usage</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', color: '#f5f5f7', paddingTop: '0.45rem' }}>
                <span>Sarah Chen (CS-101)</span>
                <span style={{ color: '#0071e3' }}>Session 1</span>
                <span>09:00:14 AM</span>
                <span>48 mins</span>
                <span style={{ color: '#10b981' }}>0 times</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. SUPABASE CLOUD SYNC SECTION */}
      <section style={{
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '3rem 1.5rem 5rem 1.5rem'
      }}>
        <div style={{
          backgroundColor: '#0d0d0f',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '28px',
          padding: 'clamp(2rem, 5vw, 3.5rem)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle top glow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #10b981, transparent)'
          }} />

          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            marginBottom: '1.25rem'
          }}>
            <Database size={24} />
          </div>

          <h3 style={{
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 600,
            color: '#ffffff',
            letterSpacing: '-0.025em',
            marginBottom: '0.75rem'
          }}>
            Supabase Cloud Connected.
          </h3>

          <p style={{
            fontSize: '1.05rem',
            color: '#86868b',
            maxWidth: '640px',
            lineHeight: 1.5,
            marginBottom: '1.75rem'
          }}>
            Your dedicated Supabase PostgreSQL database is permanently merged with zero setup needed. 
            All student biometrics and attendance records synchronize automatically.
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.55rem 1.1rem',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)',
            color: '#a1a1a6'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span>your-project-id.supabase.co</span>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION BOTTOM BANNER */}
      <section style={{
        backgroundColor: '#0a0a0c',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '5rem 1.5rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            marginBottom: '1rem'
          }}>
            Ready to experience VeriFace?
          </h2>
          <p style={{ fontSize: '1.15rem', color: '#86868b', marginBottom: '2.5rem', lineHeight: 1.5 }}>
            Open your camera, register students, and experience instant biometric tracking with continuous emotion insights.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              className="apple-pill-primary"
              onClick={onLaunchCamera}
              style={{ fontSize: '1.05rem', padding: '0.8rem 2rem' }}
            >
              <Camera size={18} />
              <span>Launch Live Camera Now</span>
            </button>

            <button
              className="apple-pill-secondary"
              onClick={onViewRecords}
              style={{ fontSize: '1.05rem', padding: '0.8rem 2rem' }}
            >
              <ClipboardCheck size={18} />
              <span>View Attendance Records</span>
            </button>
          </div>
        </div>
      </section>

      {/* 7. APPLE MINIMALIST FOOTER */}
      <footer style={{
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '2.5rem 1.5rem 3.5rem 1.5rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        color: '#71717a',
        fontSize: '0.78rem',
        lineHeight: 1.6
      }}>
        <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <p style={{ maxWidth: '850px' }}>
            1. Recognition accuracy depends on camera focal resolution and ambient lecture hall lighting. 
            All face embeddings (128D) and emotion classifications execute locally via WebAssembly and WebGL. 
            Raw video feeds never leave the browser.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            Copyright © {new Date().getFullYear()} VeriFace Pro. Engineered with clean biometrics. All rights reserved.
          </div>

          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <button 
              type="button" 
              onClick={onLaunchCamera}
              style={{ background: 'none', border: 'none', color: '#86868b', cursor: 'pointer', fontSize: 'inherit' }}
            >
              Live Camera
            </button>
            <button 
              type="button" 
              onClick={onRegisterStudent}
              style={{ background: 'none', border: 'none', color: '#86868b', cursor: 'pointer', fontSize: 'inherit' }}
            >
              Register Student
            </button>
            <button 
              type="button" 
              onClick={onViewRecords}
              style={{ background: 'none', border: 'none', color: '#86868b', cursor: 'pointer', fontSize: 'inherit' }}
            >
              Attendance Records
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
