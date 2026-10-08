import React from 'react';
import { 
  ScanFace, 
  UserPlus, 
  ClipboardCheck, 
  Settings, 
  Volume2, 
  VolumeX, 
  Database, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { setSoundMuted } from '../utils/audio';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  isSupabaseActive, 
  modelsReady, 
  isMuted, 
  setIsMuted,
  onOpenSettings 
}) {
  const handleToggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setSoundMuted(nextMuted);
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.85rem 1.75rem',
      margin: '0.75rem 1rem 1.25rem 1rem',
      backgroundColor: 'var(--bg-surface)',
      backdropFilter: 'blur(16px)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{
          position: 'relative',
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)'
        }}>
          <ScanFace size={24} color="#ffffff" />
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: modelsReady ? '#10b981' : '#f59e0b',
            border: '2px solid #07090e',
            boxShadow: modelsReady ? '0 0 8px #10b981' : 'none'
          }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              VeriFace <span className="gradient-text-cyan">AI</span>
            </h1>
            <span className="vf-badge vf-badge-cyan" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
              PRO VISION
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Biometric Attendance & Real-Time Emotion Intelligence
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(7, 10, 18, 0.6)', padding: '0.3rem', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
        <button
          className="vf-btn"
          onClick={() => setActiveTab('scanner')}
          style={{
            background: activeTab === 'scanner' ? 'linear-gradient(135deg, #06b6d4, #0284c7)' : 'transparent',
            color: activeTab === 'scanner' ? '#ffffff' : 'var(--text-muted)',
            padding: '0.55rem 1rem',
            fontSize: '0.82rem',
            border: 'none',
            boxShadow: activeTab === 'scanner' ? '0 4px 12px rgba(6, 182, 212, 0.3)' : 'none'
          }}
        >
          <ScanFace size={17} />
          <span>Live Scanner</span>
        </button>

        <button
          className="vf-btn"
          onClick={() => setActiveTab('enrollment')}
          style={{
            background: activeTab === 'enrollment' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'transparent',
            color: activeTab === 'enrollment' ? '#ffffff' : 'var(--text-muted)',
            padding: '0.55rem 1rem',
            fontSize: '0.82rem',
            border: 'none',
            boxShadow: activeTab === 'enrollment' ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none'
          }}
        >
          <UserPlus size={17} />
          <span>Enroll Student</span>
        </button>

        <button
          className="vf-btn"
          onClick={() => setActiveTab('logs')}
          style={{
            background: activeTab === 'logs' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
            color: activeTab === 'logs' ? '#ffffff' : 'var(--text-muted)',
            padding: '0.55rem 1rem',
            fontSize: '0.82rem',
            border: 'none',
            boxShadow: activeTab === 'logs' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
          }}
        >
          <ClipboardCheck size={17} />
          <span>Attendance & Emotions</span>
        </button>
      </nav>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Supabase Status Pill */}
        <button
          onClick={onOpenSettings}
          title="Supabase Cloud Database Status"
          className="vf-btn"
          style={{
            backgroundColor: isSupabaseActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            border: isSupabaseActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
            color: isSupabaseActive ? '#34d399' : '#fbbf24',
            padding: '0.45rem 0.8rem',
            fontSize: '0.75rem',
            borderRadius: '9999px',
            gap: '0.4rem'
          }}
        >
          <Database size={14} />
          <span>{isSupabaseActive ? 'Supabase Connected' : 'Local Storage (Click to connect)'}</span>
          <span className={`status-dot ${isSupabaseActive ? 'status-dot-emerald' : 'status-dot-amber'}`} />
        </button>

        {/* Audio Mute/Unmute */}
        <button
          onClick={handleToggleSound}
          title={isMuted ? 'Unmute Audio Chimes' : 'Mute Audio Chimes'}
          className="vf-btn vf-btn-ghost"
          style={{ width: '38px', height: '38px', padding: 0, borderRadius: '10px' }}
        >
          {isMuted ? <VolumeX size={18} color="var(--rose-500)" /> : <Volume2 size={18} color="var(--cyan-400)" />}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title="Settings & Supabase Configuration"
          className="vf-btn vf-btn-ghost"
          style={{ width: '38px', height: '38px', padding: 0, borderRadius: '10px' }}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
