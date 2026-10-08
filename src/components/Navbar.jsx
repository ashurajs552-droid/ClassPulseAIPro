import React from 'react';
import { 
  Camera, 
  UserPlus, 
  ClipboardCheck, 
  Settings, 
  GraduationCap 
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenSettings 
}) {
  return (
    <header style={{
      maxWidth: '1280px',
      width: '100%',
      margin: '0.75rem auto 1.25rem auto',
      padding: '0.65rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      flexWrap: 'wrap',
      gap: '0.75rem'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff'
        }}>
          <GraduationCap size={20} />
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.2 }}>
            VeriFace <span style={{ color: 'var(--primary)', fontWeight: 400 }}>Attendance</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Real-Time Face Recognition & Emotion Analytics
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Home fully deleted as requested) */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--bg-input)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
        <button
          className="btn"
          onClick={() => setActiveTab('scanner')}
          style={{
            backgroundColor: activeTab === 'scanner' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'scanner' ? '#ffffff' : 'var(--text-muted)',
            padding: '0.45rem 0.85rem',
            fontSize: '0.82rem',
            border: 'none',
          }}
        >
          <Camera size={15} />
          <span>Live Camera</span>
        </button>

        <button
          className="btn"
          onClick={() => setActiveTab('enrollment')}
          style={{
            backgroundColor: activeTab === 'enrollment' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'enrollment' ? '#ffffff' : 'var(--text-muted)',
            padding: '0.45rem 0.85rem',
            fontSize: '0.82rem',
            border: 'none',
          }}
        >
          <UserPlus size={15} />
          <span>Register Student</span>
        </button>

        <button
          className="btn"
          onClick={() => setActiveTab('logs')}
          style={{
            backgroundColor: activeTab === 'logs' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'logs' ? '#ffffff' : 'var(--text-muted)',
            padding: '0.45rem 0.85rem',
            fontSize: '0.82rem',
            border: 'none',
          }}
        >
          <ClipboardCheck size={15} />
          <span>Attendance Records</span>
        </button>
      </nav>

      {/* Right Controls: Only Settings button (Local Mode & Speaker completely removed as requested) */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={onOpenSettings}
          title="Open Settings"
          className="btn btn-outline"
          style={{ width: '36px', height: '36px', padding: 0 }}
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
