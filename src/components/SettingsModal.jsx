import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Sliders, 
  Activity, 
  Database, 
  Check, 
  Copy, 
  UploadCloud, 
  AlertCircle,
  Volume2
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  testSupabaseConnection 
} from '../services/supabaseClient';
import { syncLocalToSupabase } from '../services/storageService';
import { DetectorType } from '../services/faceEngine';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  onConfigUpdated,
  // Live camera settings moved here
  detectorType,
  onDetectorTypeChange,
  phoneDetectionEnabled,
  onPhoneDetectionToggle,
  phoneSensitivity,
  onPhoneSensitivityChange,
  distanceThreshold,
  onThresholdChange,
  soundAlertsEnabled,
  onSoundAlertsToggle
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
    setTestResult({ success: true, message: 'Database configuration saved.' });
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
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1rem'
    }}>
      <div className="clean-card" style={{
        width: '100%',
        maxWidth: '580px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '1.75rem',
        backgroundColor: '#0d0d0d',
        border: '1px solid #262626'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>System & Detection Settings</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Configure camera FPS, phone alert AI, and cloud connection
            </p>
          </div>
          <button
            className="btn btn-outline"
            onClick={onClose}
            style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* 1. FPS & Real-Time Tracking Engine */}
        <div style={{ paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <Activity size={16} color="var(--primary)" />
            <h4 style={{ fontSize: '0.92rem' }}>Camera Tracking Speed & FPS</h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              className={`btn ${detectorType === DetectorType.TINY_FACE_DETECTOR ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => onDetectorTypeChange(DetectorType.TINY_FACE_DETECTOR)}
              style={{ padding: '0.65rem 0.85rem', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}
            >
              <span style={{ fontWeight: 600 }}>30+ FPS Smooth Tracking</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>Fast real-time tracking (TinyFace)</span>
            </button>

            <button
              type="button"
              className={`btn ${detectorType === DetectorType.SSD_MOBILENET_V1 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => onDetectorTypeChange(DetectorType.SSD_MOBILENET_V1)}
              style={{ padding: '0.65rem 0.85rem', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}
            >
              <span style={{ fontWeight: 600 }}>High Precision Mode</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>Detailed features (SSD MobileNet)</span>
            </button>
          </div>
        </div>

        {/* 2. Phone Detection Settings */}
        <div style={{ paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Smartphone size={16} color="var(--danger)" />
              <h4 style={{ fontSize: '0.92rem' }}>Phone Distraction Detection</h4>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={phoneDetectionEnabled}
                onChange={(e) => onPhoneDetectionToggle(e.target.checked)}
                style={{ accentColor: 'var(--danger)', width: '16px', height: '16px' }}
              />
              <span style={{ color: phoneDetectionEnabled ? '#f87171' : 'var(--text-muted)', fontWeight: 600 }}>
                {phoneDetectionEnabled ? 'Active' : 'Disabled'}
              </span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div>
              <label className="input-label">Detection Sensitivity</label>
              <select
                className="input-field"
                value={phoneSensitivity}
                disabled={!phoneDetectionEnabled}
                onChange={(e) => onPhoneSensitivityChange(e.target.value)}
              >
                <option value="balanced">Balanced (Recommended)</option>
                <option value="high">High Sensitivity (Partial Phones)</option>
                <option value="strict">Strict (Confirmed Devices)</option>
              </select>
            </div>

            <div>
              <label className="input-label">Audio Distraction Beep</label>
              <button
                type="button"
                className={`btn ${soundAlertsEnabled ? 'btn-primary' : 'btn-outline'}`}
                style={{ width: '100%', height: '38px', justifyContent: 'center' }}
                onClick={() => onSoundAlertsToggle(!soundAlertsEnabled)}
              >
                <Volume2 size={15} />
                <span>{soundAlertsEnabled ? 'Audio Alert On' : 'Muted'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Face Recognition Strictness */}
        <div style={{ paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Face Match Tolerance:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>
              {distanceThreshold.toFixed(2)} ({distanceThreshold <= 0.50 ? 'Strict' : distanceThreshold <= 0.58 ? 'Balanced' : 'Lenient'})
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

        {/* 4. Supabase Database Configuration */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Database size={15} color="var(--primary)" />
              <h4 style={{ fontSize: '0.92rem' }}>Supabase Database Connection</h4>
            </div>

            <button
              className="btn btn-outline"
              onClick={handleCopySchema}
              style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
            >
              {copiedSchema ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              <span>{copiedSchema ? 'SQL Copied!' : 'Copy SQL Schema'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div>
              <label className="input-label">Project URL</label>
              <input
                className="input-field"
                placeholder="https://your-project.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">Anon Public Key</label>
              <input
                type="password"
                className="input-field"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              onClick={handleTestConnection}
              disabled={testing || !supabaseUrl || !supabaseAnonKey}
              style={{ fontSize: '0.8rem' }}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>

            <button className="btn btn-primary" onClick={handleSaveConfig} style={{ fontSize: '0.8rem' }}>
              Save Database Config
            </button>

            <button
              className="btn btn-outline"
              onClick={handleSyncToSupabase}
              disabled={syncing || !supabaseUrl || !supabaseAnonKey}
              style={{ fontSize: '0.8rem' }}
            >
              <UploadCloud size={14} />
              <span>{syncing ? 'Syncing...' : 'Upload Local Data'}</span>
            </button>
          </div>

          {testResult && (
            <div style={{
              marginTop: '0.65rem',
              padding: '0.55rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: testResult.success ? 'var(--success-light)' : 'var(--danger-light)',
              color: testResult.success ? '#34d399' : '#f87171',
              border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {testResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{testResult.message}</span>
            </div>
          )}

          {syncResult && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.55rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: syncResult.success ? 'var(--success-light)' : 'var(--danger-light)',
              color: syncResult.success ? '#34d399' : '#f87171',
              border: `1px solid ${syncResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {syncResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{syncResult.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
