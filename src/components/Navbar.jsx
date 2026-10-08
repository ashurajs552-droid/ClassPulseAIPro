import React from 'react';
import { 
  Camera, 
  UserPlus, 
  ClipboardCheck, 
  Settings, 
  LayoutDashboard,
  FolderKanban,
  ShieldCheck,
  LogOut,
  LogIn,
  Globe
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenSettings,
  user,
  onOpenAuth,
  onSignOut
}) {
  const isAuthenticated = Boolean(user);
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Faculty Member';

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      marginBottom: activeTab === 'overview' ? '0' : '1.25rem'
    }}>
      <div style={{
        maxWidth: '1180px',
        margin: '0 auto',
        padding: '0.65rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Brand: ClassPulseAIPro */}
        <button
          type="button"
          onClick={() => setActiveTab(isAuthenticated ? 'dashboard' : 'overview')}
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
          {/* Aperture shield mark */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#161618',
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
              ClassPulse<span style={{ fontWeight: 400, color: '#2997ff' }}>AIPro</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#86868b', letterSpacing: '-0.01em' }}>
              Biometric Attendance & Telemetry
            </div>
          </div>
        </button>

        {/* Navigation Bar (Role / Auth Dependent) */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {/* Public or Switchable Landing Page */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{
              backgroundColor: activeTab === 'overview' ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
              color: activeTab === 'overview' ? '#ffffff' : '#86868b',
              padding: '0.4rem 0.8rem',
              fontSize: '0.8rem',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Globe size={13} />
            <span>Overview</span>
          </button>

          {isAuthenticated ? (
            <>
              {/* Dashboard */}
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                style={{
                  backgroundColor: activeTab === 'dashboard' ? 'var(--apple-blue)' : 'transparent',
                  color: activeTab === 'dashboard' ? '#ffffff' : '#86868b',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <LayoutDashboard size={13} />
                <span>Dashboard</span>
              </button>

              {/* Live Camera */}
              <button
                type="button"
                onClick={() => setActiveTab('scanner')}
                style={{
                  backgroundColor: activeTab === 'scanner' ? 'var(--apple-blue)' : 'transparent',
                  color: activeTab === 'scanner' ? '#ffffff' : '#86868b',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Camera size={13} />
                <span>Live Camera</span>
              </button>

              {/* Sessions Management */}
              <button
                type="button"
                onClick={() => setActiveTab('sessions')}
                style={{
                  backgroundColor: activeTab === 'sessions' ? 'var(--apple-blue)' : 'transparent',
                  color: activeTab === 'sessions' ? '#ffffff' : '#86868b',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <FolderKanban size={13} />
                <span>Sessions</span>
              </button>

              {/* Register Student */}
              <button
                type="button"
                onClick={() => setActiveTab('enrollment')}
                style={{
                  backgroundColor: activeTab === 'enrollment' ? 'var(--apple-blue)' : 'transparent',
                  color: activeTab === 'enrollment' ? '#ffffff' : '#86868b',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <UserPlus size={13} />
                <span>Register</span>
              </button>

              {/* Attendance Records */}
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                style={{
                  backgroundColor: activeTab === 'logs' ? 'var(--apple-blue)' : 'transparent',
                  color: activeTab === 'logs' ? '#ffffff' : '#86868b',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <ClipboardCheck size={13} />
                <span>Records</span>
              </button>
            </>
          ) : null}
        </nav>

        {/* Right Controls: Auth Actions & Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {isAuthenticated ? (
            <>
              {/* User Profile Avatar / Chip */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.25rem 0.65rem 0.25rem 0.35rem',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.78rem',
                color: '#f5f5f7'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#0071e3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#ffffff'
                }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span style={{ maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userName}
                </span>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={onSignOut}
                title="Sign Out"
                className="btn btn-outline"
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.75rem',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#a1a1a6'
                }}
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              {/* Sign In button */}
              <button
                type="button"
                onClick={onOpenAuth}
                className="apple-pill-secondary"
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.95rem' }}
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>

              {/* Get Started / Google OAuth quick trigger */}
              <button
                type="button"
                onClick={onOpenAuth}
                className="apple-pill-primary"
                style={{ fontSize: '0.82rem', padding: '0.4rem 1rem' }}
              >
                <span>Get Started</span>
              </button>
            </>
          )}

          {/* Settings Icon */}
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
