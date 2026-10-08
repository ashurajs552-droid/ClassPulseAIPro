import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Check, 
  Copy, 
  UploadCloud, 
  AlertCircle 
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
    setTestResult({ success: true, message: 'Settings saved.' });
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
    const sqlSchema = `-- VeriFace Supabase Database Schema
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

CREATE POLICY "Allow public all on students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on attendance" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);
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
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem'
    }}>
      <div className="clean-card" style={{
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-default)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>Database & Settings</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Connect Supabase cloud database and adjust matching strictness
            </p>
          </div>
          <button
            className="btn btn-outline"
            onClick={onClose}
            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Supabase Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ fontSize: '0.95rem' }}>Supabase Configuration</h4>
            <button
              className="btn btn-outline"
              onClick={handleCopySchema}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
            >
              {copiedSchema ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copiedSchema ? 'SQL Copied!' : 'Copy SQL Script'}</span>
            </button>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
            Enter your project credentials from your Supabase Dashboard (Project Settings → API).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1rem' }}>
            <div>
              <label className="input-label">Supabase URL</label>
              <input
                className="input-field"
                placeholder="https://your-project.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">Supabase Anon Key</label>
              <input
                type="password"
                className="input-field"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button
              className="btn btn-outline"
              onClick={handleTestConnection}
              disabled={testing || !supabaseUrl || !supabaseAnonKey}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>

            <button className="btn btn-primary" onClick={handleSaveConfig}>
              Save Config
            </button>

            <button
              className="btn btn-outline"
              onClick={handleSyncToSupabase}
              disabled={syncing || !supabaseUrl || !supabaseAnonKey}
            >
              <UploadCloud size={15} />
              <span>{syncing ? 'Syncing...' : 'Upload Local Data'}</span>
            </button>
          </div>

          {testResult && (
            <div style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: testResult.success ? 'var(--success-light)' : 'var(--danger-light)',
              color: testResult.success ? '#34d399' : '#f87171',
              border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          {syncResult && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: syncResult.success ? 'var(--success-light)' : 'var(--danger-light)',
              color: syncResult.success ? '#34d399' : '#f87171',
              border: `1px solid ${syncResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {syncResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{syncResult.message}</span>
            </div>
          )}
        </div>

        {/* Accuracy Sensitivity */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>Recognition Sensitivity</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
            Adjust how strictly faces must match enrolled photos.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
            <span>Tolerance:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {distanceThreshold <= 0.50 ? 'Strict (Zero False Positives)' : distanceThreshold <= 0.58 ? 'Balanced (Recommended)' : 'Lenient'}
            </span>
          </div>

          <input
            type="range"
            min="0.45"
            max="0.65"
            step="0.01"
            value={distanceThreshold}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
        </div>
      </div>
    </div>
  );
}
