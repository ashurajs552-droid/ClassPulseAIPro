import React from 'react';
import { 
  Camera, 
  UserPlus, 
  ClipboardCheck, 
  Settings, 
  LayoutGrid,
  ShieldCheck
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenSettings 
}) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      marginBottom: activeTab === 'overview' ? '0' : '1.25rem'
    }}>
      <div style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '0.65rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Brand with clean, human, non-AI styling */}
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            cursor: 'pointer',
            textAlign: 'left',
            padding: 0
          }}
        >
          {/* Subtle aperture mark */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#161617',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f5f5f7'
          }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f5f5f7', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              VeriFace <span style={{ fontWeight: 400, color: '#86868b' }}>Pro</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#6e6e73', letterSpacing: '-0.01em' }}>
              Biometric Presence Engine
            </div>
          </div>
        </button>

        {/* Navigation Links in Apple SF style */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{
              backgroundColor: activeTab === 'overview' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeTab === 'overview' ? '#ffffff' : '#86868b',
              padding: '0.4rem 0.85rem',
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <LayoutGrid size={14} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            style={{
              backgroundColor: activeTab === 'scanner' ? 'var(--apple-blue)' : 'transparent',
              color: activeTab === 'scanner' ? '#ffffff' : '#86868b',
              padding: '0.4rem 0.85rem',
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Camera size={14} />
            <span>Live Camera</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('enrollment')}
            style={{
              backgroundColor: activeTab === 'enrollment' ? 'var(--apple-blue)' : 'transparent',
              color: activeTab === 'enrollment' ? '#ffffff' : '#86868b',
              padding: '0.4rem 0.85rem',
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <UserPlus size={14} />
            <span>Register Student</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            style={{
              backgroundColor: activeTab === 'logs' ? 'var(--apple-blue)' : 'transparent',
              color: activeTab === 'logs' ? '#ffffff' : '#86868b',
              padding: '0.4rem 0.85rem',
              fontSize: '0.82rem',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <ClipboardCheck size={14} />
            <span>Attendance Records</span>
          </button>
        </nav>

        {/* Right Controls: Quick Launch / Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {activeTab === 'overview' ? (
            <button
              type="button"
              className="apple-pill-primary"
              onClick={() => setActiveTab('scanner')}
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}
            >
              <Camera size={14} />
              <span>Launch Camera</span>
            </button>
          ) : (
            <button
              type="button"
              className="apple-pill-secondary"
              onClick={() => setActiveTab('overview')}
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}
            >
              <span>Overview</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            title="System Settings"
            className="btn btn-outline"
            style={{
              width: '34px',
              height: '34px',
              padding: 0,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <Settings size={15} color="#a1a1a6" />
          </button>
        </div>
      </div>
    </header>
  );
}
