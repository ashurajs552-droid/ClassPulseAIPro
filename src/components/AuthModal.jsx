import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  ArrowRight,
  Send,
  HelpCircle
} from 'lucide-react';
import { 
  signInWithGoogle, 
  signInWithEmail, 
  signUpWithEmail,
  resendConfirmationEmail
} from '../services/authService';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isUnconfirmedEmail, setIsUnconfirmedEmail] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    setIsUnconfirmedEmail(false);
    try {
      await signInWithGoogle();
      // Browser will redirect to Google OAuth
    } catch (err) {
      console.warn('Google Auth Error:', err);
      setErrorMsg(err.message || 'Google OAuth failed to initialize. Please verify Google provider is enabled in Supabase.');
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
    setIsUnconfirmedEmail(false);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          setErrorMsg('Please enter your full name.');
          setLoading(false);
          return;
        }
        const res = await signUpWithEmail(email, password, fullName);
        if (res.needsConfirmation) {
          setSuccessMsg(`Account created! A confirmation link was sent to ${email}. Please confirm your email in your inbox to sign in.`);
          setIsSignUp(false);
        } else {
          setSuccessMsg('Account registered successfully! Redirecting to dashboard...');
          setTimeout(() => {
            if (onAuthSuccess) onAuthSuccess(res.user);
            onClose();
          }, 800);
        }
      } else {
        const user = await signInWithEmail(email, password);
        setSuccessMsg('Signed in successfully! Loading your dashboard...');
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess(user);
          onClose();
        }, 500);
      }
    } catch (err) {
      console.error('Auth Error:', err);
      const msg = err.message || '';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setIsUnconfirmedEmail(true);
        setErrorMsg('Email not confirmed. Please check your email inbox for the Supabase confirmation link.');
      } else if (msg.toLowerCase().includes('invalid login credentials')) {
        setErrorMsg('Invalid email or password. Please verify your credentials or create a new account.');
      } else {
        setErrorMsg(msg || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setErrorMsg('Please enter your email above to resend confirmation.');
      return;
    }
    setResending(true);
    try {
      await resendConfirmationEmail(email);
      setSuccessMsg(`Confirmation email resent to ${email}! Please check your inbox and spam folder.`);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend confirmation email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
        padding: '2.25rem 2rem',
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
            {isSignUp ? 'Create Faculty Account' : 'Sign in to ClassPulse AI Pro'}
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#86868b' }}>
            {isSignUp 
              ? 'Register with your institutional email to access the biometric dashboard' 
              : 'Sign in to access your attendance intelligence dashboard'}
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

        {/* Error Message & Email Unconfirmed Recovery */}
        {errorMsg && (
          <div style={{
            padding: '0.75rem 0.95rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.8rem',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>

            {isUnconfirmedEmail && (
              <div style={{
                marginTop: '0.25rem',
                paddingTop: '0.5rem',
                borderTop: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '0.74rem', color: '#fca5a5' }}>
                  Didn't receive the email?
                </span>
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#ffffff',
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Send size={12} />
                  <span>{resending ? 'Sending...' : 'Resend Link'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Success Message */}
        {successMsg && (
          <div style={{
            padding: '0.75rem 0.95rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '1rem'
          }}>
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
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
                  placeholder="Your Full Name"
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
              Academic / Work Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="#71717a" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              <input
                type="email"
                placeholder="faculty@institution.edu"
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
        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: '#86868b' }}>
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMsg(null); setIsUnconfirmedEmail(false); }}
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
                onClick={() => { setIsSignUp(true); setErrorMsg(null); setIsUnconfirmedEmail(false); }}
                style={{ background: 'none', border: 'none', color: '#2997ff', cursor: 'pointer', fontWeight: 500 }}
              >
                Create Account
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
