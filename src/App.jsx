import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import LiveScanner from './components/LiveScanner';
import StudentEnrollment from './components/StudentEnrollment';
import AttendanceLogs from './components/AttendanceLogs';
import SettingsModal from './components/SettingsModal';
import { loadFaceModels } from './services/faceEngine';
import { getStudents, getAttendanceRecords } from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { getSoundMuted } from './utils/audio';
import { Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [modelsReady, setModelsReady] = useState(false);
  const [modelLoadingStatus, setModelLoadingStatus] = useState('Starting camera and recognition service...');
  const [modelError, setModelError] = useState(null);

  // Data states
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);

  // App settings states
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);
  const [isMuted, setIsMuted] = useState(getSoundMuted());
  const [distanceThreshold, setDistanceThreshold] = useState(0.55);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Load Recognition Engine
  useEffect(() => {
    async function initModels() {
      try {
        await loadFaceModels(({ status, message }) => {
          setModelLoadingStatus(message);
        });
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
    setIsSupabaseActive(isSupabaseConfigured());
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSupabaseActive={isSupabaseActive}
        modelsReady={modelsReady}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Model Loading Status */}
      {!modelsReady && !modelError && (
        <div style={{
          maxWidth: '1240px',
          width: '100%',
          margin: '0 auto 1.25rem auto',
          padding: '0.65rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--primary-light)',
          color: '#60a5fa',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.85rem'
        }}>
          <Loader2 size={16} className="animate-spin" />
          <span>{modelLoadingStatus}</span>
        </div>
      )}

      {modelError && (
        <div style={{
          maxWidth: '1240px',
          width: '100%',
          margin: '0 auto 1.25rem auto',
          padding: '0.65rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--danger-light)',
          color: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={16} />
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
            distanceThreshold={distanceThreshold}
            onThresholdChange={setDistanceThreshold}
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigUpdated={refreshData}
        distanceThreshold={distanceThreshold}
        onThresholdChange={setDistanceThreshold}
      />
    </div>
  );
}
