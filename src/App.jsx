import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import LiveScanner from './components/LiveScanner';
import StudentEnrollment from './components/StudentEnrollment';
import AttendanceLogs from './components/AttendanceLogs';
import SettingsModal from './components/SettingsModal';
import { loadFaceModels, DetectorType } from './services/faceEngine';
import { loadPhoneDetector } from './services/phoneDetector';
import { getStudents, getAttendanceRecords } from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  // Default to scanner (Home tab fully removed as requested)
  const [activeTab, setActiveTab] = useState('scanner');
  const [modelsReady, setModelsReady] = useState(false);
  const [modelLoadingStatus, setModelLoadingStatus] = useState('Starting camera and recognition service...');
  const [modelError, setModelError] = useState(null);

  // Data states
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);

  // System Settings (Configured via Settings Modal)
  const [detectorType, setDetectorType] = useState(DetectorType.TINY_FACE_DETECTOR);
  const [phoneDetectionEnabled, setPhoneDetectionEnabled] = useState(true);
  const [phoneSensitivity, setPhoneSensitivity] = useState('balanced');
  const [distanceThreshold, setDistanceThreshold] = useState(0.55);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Pre-load Neural Recognition & Phone Detection Models
  useEffect(() => {
    async function initModels() {
      try {
        await Promise.all([
          loadFaceModels(({ status, message }) => {
            setModelLoadingStatus(message);
          }),
          loadPhoneDetector(),
        ]);
        setModelsReady(true);
      } catch (err) {
        console.error('Failed to load recognition models:', err);
        setModelError('Error loading recognition models: ' + err.message);
      }
    }
    initModels();
  }, []);

  // 2. Fetch Students and Attendance Records
  const refreshData = useCallback(async () => {
    try {
      const studentList = await getStudents();
      setStudents(studentList || []);

      const allRecords = await getAttendanceRecords();
      setAttendanceRecords(allRecords || []);

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayList = (allRecords || []).filter((r) => r.date === todayStr);
      setTodayAttendance(todayList);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handle new attendance marked
  const handleAttendanceMarked = (newRecord) => {
    setTodayAttendance((prev) => [newRecord, ...prev]);
    setAttendanceRecords((prev) => [newRecord, ...prev]);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navigation Header (Clean without Home, Local Mode or Speaker button) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Model Loading Status Banner (If initializing) */}
      {!modelsReady && !modelError && (
        <div style={{
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto 1rem auto',
          padding: '0.6rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          color: '#60a5fa',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.82rem'
        }}>
          <Loader2 size={15} className="animate-spin" />
          <span>{modelLoadingStatus}</span>
        </div>
      )}

      {modelError && (
        <div style={{
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto 1rem auto',
          padding: '0.6rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.82rem'
        }}>
          <AlertCircle size={15} />
          <span>{modelError}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {activeTab === 'scanner' && (
          <LiveScanner
            students={students}
            todayAttendance={todayAttendance}
            onAttendanceMarked={handleAttendanceMarked}
            modelsReady={modelsReady}
            detectorType={detectorType}
            phoneDetectionEnabled={phoneDetectionEnabled}
            phoneSensitivity={phoneSensitivity}
            distanceThreshold={distanceThreshold}
            soundAlertsEnabled={soundAlertsEnabled}
          />
        )}

        {activeTab === 'enrollment' && (
          <StudentEnrollment
            students={students}
            onStudentUpdated={refreshData}
            modelsReady={modelsReady}
          />
        )}

        {activeTab === 'logs' && (
          <AttendanceLogs
            attendanceRecords={attendanceRecords}
            students={students}
            onRefresh={refreshData}
            onRecordsCleared={refreshData}
          />
        )}
      </main>

      {/* Settings Modal (Contains FPS, Phone, Sensitivity, and Cloud config) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigUpdated={refreshData}
        detectorType={detectorType}
        onDetectorTypeChange={setDetectorType}
        phoneDetectionEnabled={phoneDetectionEnabled}
        onPhoneDetectionToggle={setPhoneDetectionEnabled}
        phoneSensitivity={phoneSensitivity}
        onPhoneSensitivityChange={setPhoneSensitivity}
        distanceThreshold={distanceThreshold}
        onThresholdChange={setDistanceThreshold}
        soundAlertsEnabled={soundAlertsEnabled}
        onSoundAlertsToggle={setSoundAlertsEnabled}
      />
    </div>
  );
}
