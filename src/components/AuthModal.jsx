import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { 
  signInWithGoogle, 
  signInWithEmail, 
  signUpWithEmail, 
  loginAsDemo 
} from '../services/authService';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      // Browser will redirect to Google OAuth
    } catch (err) {
      console.warn('Google Auth Error:', err);
      setErrorMsg(err.message || 'Google OAuth failed to initialize. You can also sign in with email or use instant Demo access.');
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        if (!fullName) {
          setErrorMsg('Please enter your full name.');
          setLoading(false);
          return;
        }
        const user = await signUpWithEmail(email, password, fullName);
        setSuccessMsg('Account registered successfully! Logging you in...');
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess(user);
          onClose();
        }, 800);
      } else {
        const user = await signInWithEmail(email, password);
        setSuccessMsg('Signed in successfully!');
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess(user);
          onClose();
        }, 500);
      }
    } catch (err) {
      console.error('Auth Error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials or use Demo Access.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setLoading(true);
    const demoUser = loginAsDemo();
    setSuccessMsg('Welcome, Dr. Evelyn Reed (Demo Faculty)! Loading dashboard...');
    setTimeout(() => {
      setLoading(false);
      if (onAuthSuccess) onAuthSuccess(demoUser);
      onClose();
    }, 600);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.82)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '1.25rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#0d0d0f',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '24px',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        padding: '2rem 1.75rem',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            color: '#a1a1a6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <X size={16} />
        </button>

        {/* Modal Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: '#161618',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f5f5f7',
            marginBottom: '0.85rem'
          }}>
            <ShieldCheck size={24} />
          </div>

          <h3 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            {isSignUp ? 'Create an Account' : 'Sign in to ClassPulse AI Pro'}
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#86868b' }}>
            Enter your credentials or continue with Google to access the dashboard
          </p>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            height: '46px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: '#ffffff',
            color: '#1a1a1a',
            border: 'none',
            fontSize: '0.92rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
            transition: 'transform 0.15s ease, background-color 0.15s ease',
            marginBottom: '1rem'
          }}
        >
          {/* Google G logo SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          margin: '1.25rem 0',
          color: '#6e6e73',
          fontSize: '0.75rem'
        }}>
          <span style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
          <span>or sign in with email</span>
          <span style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
        </div>

        {/* Error / Success Messages */}
        {errorMsg && (
          <div style={{
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '1rem'
          }}>
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#34d399',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '1rem'
          }}>
            <CheckCircle2 size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#a1a1a6', marginBottom: '0.35rem' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="#71717a" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                <input
                  type="text"
                  placeholder="Prof. Evelyn Reed"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                    backgroundColor: '#141416',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#a1a1a6', marginBottom: '0.35rem' }}>
              Academic Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="#71717a" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              <input
                type="email"
                placeholder="faculty@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                  backgroundColor: '#141416',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: '#a1a1a6', marginBottom: '0.35rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="#71717a" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                  backgroundColor: '#141416',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="apple-pill-primary"
            style={{ width: '100%', height: '42px', marginTop: '0.4rem', justifyContent: 'center' }}
          >
            <span>{loading ? 'Authenticating...' : isSignUp ? 'Create Faculty Account' : 'Sign In'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Toggle between Sign In and Sign Up */}
        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: '#86868b' }}>
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMsg(null); }}
                style={{ background: 'none', border: 'none', color: '#2997ff', cursor: 'pointer', fontWeight: 500 }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Need an educator account?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setErrorMsg(null); }}
                style={{ background: 'none', border: 'none', color: '#2997ff', cursor: 'pointer', fontWeight: 500 }}
              >
                Create Account
              </button>
            </span>
          )}
        </div>

        {/* 1-Click Demo Access for Instant Evaluation */}
        <div style={{
          marginTop: '1.25rem',
          paddingTop: '1.1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          textAlign: 'center'
        }}>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.55rem',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#d1d1d6',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={14} color="#f59e0b" />
            <span>Instant Demo Access (Dr. Evelyn Reed)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
