import React from 'react';
import { 
  Camera, 
  UserPlus, 
  ClipboardCheck, 
  Settings, 
  Volume2, 
  VolumeX, 
  Database,
  GraduationCap
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
      maxWidth: '1240px',
      width: '100%',
      margin: '1rem auto 1.5rem auto',
      padding: '0.75rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff'
        }}>
          <GraduationCap size={22} />
        </div>
        <div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.2 }}>
            VeriFace <span style={{ color: 'var(--primary)', fontWeight: 400 }}>Attendance</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Facial Recognition & Attendance Portal
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--bg-app)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
        <button
          className="btn"
          onClick={() => setActiveTab('scanner')}
          style={{
            backgroundColor: activeTab === 'scanner' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'scanner' ? '#ffffff' : 'var(--text-muted)',
            padding: '0.5rem 0.9rem',
            fontSize: '0.85rem',
            border: 'none',
          }}
        >
          <Camera size={16} />
          <span>Live Camera</span>
        </button>

        <button
          className="btn"
          onClick={() => setActiveTab('enrollment')}
          style={{
            backgroundColor: activeTab === 'enrollment' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'enrollment' ? '#ffffff' : 'var(--text-muted)',
            padding: '0.5rem 0.9rem',
            fontSize: '0.85rem',
            border: 'none',
          }}
        >
          <UserPlus size={16} />
          <span>Register Student</span>
        </button>

        <button
          className="btn"
          onClick={() => setActiveTab('logs')}
          style={{
            backgroundColor: activeTab === 'logs' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'logs' ? '#ffffff' : 'var(--text-muted)',
            padding: '0.5rem 0.9rem',
            fontSize: '0.85rem',
            border: 'none',
          }}
        >
          <ClipboardCheck size={16} />
          <span>Attendance Records</span>
        </button>
      </nav>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Supabase status badge */}
        <button
          onClick={onOpenSettings}
          title="Supabase Database Status"
          className="btn btn-outline"
          style={{
            padding: '0.45rem 0.75rem',
            fontSize: '0.78rem',
            borderRadius: 'var(--radius-md)',
            borderColor: isSupabaseActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)',
            color: isSupabaseActive ? '#34d399' : '#fbbf24'
          }}
        >
          <Database size={14} />
          <span>{isSupabaseActive ? 'Supabase Connected' : 'Local Mode'}</span>
        </button>

        {/* Audio Mute/Unmute */}
        <button
          onClick={handleToggleSound}
          title={isMuted ? 'Turn on sound' : 'Mute sound'}
          className="btn btn-outline"
          style={{ width: '36px', height: '36px', padding: 0 }}
        >
          {isMuted ? <VolumeX size={16} color="var(--danger)" /> : <Volume2 size={16} />}
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="btn btn-outline"
          style={{ width: '36px', height: '36px', padding: 0 }}
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
