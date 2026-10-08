import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Check, 
  Copy, 
  UploadCloud, 
  Cpu, 
  ShieldCheck, 
  AlertCircle, 
  HelpCircle,
  ExternalLink,
  Sliders
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  testSupabaseConnection 
} from '../services/supabaseClient';
import { syncLocalToSupabase } from '../services/storageService';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  onConfigUpdated,
  distanceThreshold,
  onThresholdChange
}) {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setSupabaseUrl(cfg.url || '');
      setSupabaseAnonKey(cfg.anonKey || '');
      setTestResult(null);
      setSyncResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = () => {
    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
    if (onConfigUpdated) onConfigUpdated();
    setTestResult({ success: true, message: 'Settings saved and Supabase client reloaded.' });
  };

  const handleSyncToSupabase = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncLocalToSupabase();
      setSyncResult(res);
      if (onConfigUpdated) onConfigUpdated();
    } catch (err) {
      setSyncResult({ success: false, message: 'Sync failed: ' + err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleCopySchema = () => {
    const sqlSchema = `-- VeriFace AI Supabase SQL Schema
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    department TEXT DEFAULT 'Computer Science',
    face_descriptors JSONB NOT NULL DEFAULT '[]'::jsonb,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'Present',
    confidence_score NUMERIC(5, 2) NOT NULL,
    dominant_emotion TEXT NOT NULL,
    emotion_scores JSONB DEFAULT '{}'::jsonb,
    snapshot_url TEXT,
    device_info TEXT DEFAULT 'Webcam Client',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public students all" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public attendance all" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);
`;

    navigator.clipboard.writeText(sqlSchema);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 3000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(3, 5, 10, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem'
    }}>
      <div className="glass-panel-elevated" style={{
        width: '100%',
        maxWidth: '620px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Database size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>System & Supabase Settings</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Configure cloud database and biometric AI precision
              </p>
            </div>
          </div>

          <button
            className="vf-btn vf-btn-ghost"
            onClick={onClose}
            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Section 1: Supabase Configuration */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={16} color="var(--cyan-400)" />
              <span>Supabase Cloud Integration</span>
            </h4>
            <button
              className="vf-btn vf-btn-ghost"
              onClick={handleCopySchema}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
            >
              {copiedSchema ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copiedSchema ? 'SQL Copied!' : 'Copy SQL Schema'}</span>
            </button>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
            Enter your Supabase Project URL and Anon Public Key. (You can find these in your Supabase Dashboard → Project Settings → API).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1rem' }}>
            <div>
              <label className="vf-label">Supabase Project URL</label>
              <input
                className="vf-input"
                placeholder="https://xyzabcdefghijklm.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="vf-label">Supabase Anon Public API Key</label>
              <input
                type="password"
                className="vf-input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
              />
            </div>
          </div>

          {/* Test & Save buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button
              className="vf-btn vf-btn-ghost"
              onClick={handleTestConnection}
              disabled={testing || !supabaseUrl || !supabaseAnonKey}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              className="vf-btn vf-btn-primary"
              onClick={handleSaveConfig}
            >
              Save Configuration
            </button>

            <button
              className="vf-btn vf-btn-violet"
              onClick={handleSyncToSupabase}
              disabled={syncing || !supabaseUrl || !supabaseAnonKey}
            >
              <UploadCloud size={16} />
              <span>{syncing ? 'Syncing...' : 'Sync Local Data to Supabase'}</span>
            </button>
          </div>

          {/* Test Connection Results */}
          {testResult && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              color: testResult.success ? '#34d399' : '#f87171',
              border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            }}>
              {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Sync Results */}
          {syncResult && (
            <div style={{
              marginTop: '0.65rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: syncResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              color: syncResult.success ? '#34d399' : '#f87171',
              border: `1px solid ${syncResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            }}>
              {syncResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{syncResult.message}</span>
            </div>
          )}
        </div>

        {/* Section 2: Biometric AI Accuracy Calibration */}
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={16} color="var(--violet-400)" />
            <span>Biometric AI Precision Calibration</span>
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Adjust the Euclidean distance matching threshold. A lower threshold enforces strict matching to eliminate false positives.
          </p>

          <div style={{
            background: 'rgba(7, 10, 18, 0.5)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Strictness Threshold:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan-400)', fontWeight: 700 }}>
                {distanceThreshold.toFixed(2)} {distanceThreshold <= 0.48 ? '(Ultra-Strict)' : distanceThreshold <= 0.53 ? '(High Accuracy)' : '(Relaxed)'}
              </span>
            </div>
            <input
              type="range"
              min="0.40"
              max="0.60"
              step="0.01"
              value={distanceThreshold}
              onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--cyan-500)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              <span>0.40 (Zero False Matches)</span>
              <span>0.50 (Recommended)</span>
              <span>0.60 (Lenient)</span>
            </div>
          </div>
        </div>

        {/* Vercel Deployment Note */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          lineHeight: '1.4'
        }}>
          <strong style={{ color: 'var(--cyan-400)' }}>Ready for Vercel Deployment:</strong>
          <br />
          This application includes bundled neural weights in <code>/public/models/</code> and <code>vercel.json</code> rewrites for seamless zero-config deployment to Vercel.
        </div>
      </div>
    </div>
  );
}
