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
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [modelsReady, setModelsReady] = useState(false);
  const [modelLoadingStatus, setModelLoadingStatus] = useState('Initializing Face Recognition Engine...');
  const [modelError, setModelError] = useState(null);

  // Data states
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);

  // App settings states
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);
  const [isMuted, setIsMuted] = useState(getSoundMuted());
  const [distanceThreshold, setDistanceThreshold] = useState(0.50);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Load Neural Networks Models
  useEffect(() => {
    async function initModels() {
      try {
        setModelLoadingStatus('Loading Deep Neural Weights (SSD MobileNet & ResNet-34)...');
        await loadFaceModels(({ status, message }) => {
          setModelLoadingStatus(message);
        });
        setModelsReady(true);
      } catch (err) {
        console.error('Failed to load face models:', err);
        setModelError('Neural network loading error: ' + err.message);
      }
    }
    initModels();
  }, []);

  // 2. Fetch Students and Attendance Data
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

  // Handle new attendance marked in live scanner
  const handleAttendanceMarked = (newRecord) => {
    setTodayAttendance((prev) => [newRecord, ...prev]);
    setAttendanceRecords((prev) => [newRecord, ...prev]);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Cyber Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSupabaseActive={isSupabaseActive}
        modelsReady={modelsReady}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Model Loading / Error Banner */}
      {!modelsReady && !modelError && (
        <div style={{
          margin: '0 1rem 1rem 1rem',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(6, 182, 212, 0.1)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#38bdf8',
          fontSize: '0.85rem'
        }}>
          <Loader2 size={18} className="animate-spin" />
          <span>{modelLoadingStatus}</span>
        </div>
      )}

      {modelError && (
        <div style={{
          margin: '0 1rem 1rem 1rem',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#f87171',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={18} />
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
