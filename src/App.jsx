import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import AppleLandingPage from './components/AppleLandingPage';
import Dashboard from './components/Dashboard';
import LiveScanner from './components/LiveScanner';
import SessionManager from './components/SessionManager';
import StudentEnrollment from './components/StudentEnrollment';
import AttendanceLogs from './components/AttendanceLogs';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import { loadFaceModels, DetectorType } from './services/faceEngine';
import { loadPhoneDetector } from './services/phoneDetector';
import { getStudents, getAttendanceRecords } from './services/storageService';
import { getCurrentUser, signOutUser, onAuthStateChange } from './services/authService';
import { Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Active navigation tab ('overview', 'dashboard', 'scanner', 'sessions', 'enrollment', 'logs')
  const [activeTab, setActiveTab] = useState('overview');

  // AI model states
  const [modelsReady, setModelsReady] = useState(false);
  const [modelLoadingStatus, setModelLoadingStatus] = useState('Starting biometric and recognition models...');
  const [modelError, setModelError] = useState(null);

  // Data states
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);

  // System Settings
  const [detectorType, setDetectorType] = useState(DetectorType.TINY_FACE_DETECTOR);
  const [phoneDetectionEnabled, setPhoneDetectionEnabled] = useState(true);
  const [phoneSensitivity, setPhoneSensitivity] = useState('balanced');
  const [distanceThreshold, setDistanceThreshold] = useState(0.55);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Check initial user auth state
  useEffect(() => {
    async function initAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setActiveTab('dashboard'); // Enters dashboard when authenticated
        } else {
          setActiveTab('overview'); // Public landing page
        }
      } catch (e) {
        console.warn('Error reading auth state:', e);
      } finally {
        setAuthChecked(true);
      }
    }
    initAuth();

    const unsubscribe = onAuthStateChange((updatedUser) => {
      setUser(updatedUser);
      if (updatedUser && activeTab === 'overview') {
        setActiveTab('dashboard');
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Pre-load Neural Recognition & Phone Detection Models
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

  // 3. Fetch Students and Attendance Records
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

  // Auth Handlers
  const handleAuthSuccess = (authedUser) => {
    setUser(authedUser);
    setActiveTab('dashboard'); // Automatically enter dashboard after login!
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setActiveTab('overview'); // Return to public landing page
  };

  // Guard for protected features
  const handleGuardedNavigation = (targetTab) => {
    if (user) {
      setActiveTab(targetTab);
    } else {
      setIsAuthOpen(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Model Loading Status Banner (Shown on scanner tab if still initializing) */}
      {!modelsReady && !modelError && activeTab === 'scanner' && (
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

      {/* Main View Router */}
      <main style={{ flex: 1 }}>
        {/* 1. Landing Page (Overview - Public entry only, hidden after login) */}
        {!user && activeTab === 'overview' && (
          <AppleLandingPage
            onLaunchCamera={() => handleGuardedNavigation('scanner')}
            onRegisterStudent={() => handleGuardedNavigation('enrollment')}
            onViewRecords={() => handleGuardedNavigation('logs')}
            onOpenAuth={() => setIsAuthOpen(true)}
            onEnterDashboard={() => setActiveTab('dashboard')}
            user={user}
            studentsCount={students.length}
            attendanceCount={attendanceRecords.length}
          />
        )}

        {/* 2. Intelligence Dashboard (With stats & graphs) */}
        {(activeTab === 'dashboard' || (user && activeTab === 'overview')) && (
          <Dashboard
            user={user}
            students={students}
            attendanceRecords={attendanceRecords}
            todayAttendance={todayAttendance}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {/* 3. Live Camera Biometric Recognition */}
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

        {/* 4. Academic Sessions Ledger (View, Edit, Delete, Export) */}
        {activeTab === 'sessions' && (
          <SessionManager
            onNavigateToScanner={() => setActiveTab('scanner')}
            user={user}
          />
        )}

        {/* 5. Student Biometric Registration */}
        {activeTab === 'enrollment' && (
          <StudentEnrollment
            students={students}
            onStudentUpdated={refreshData}
            modelsReady={modelsReady}
          />
        )}

        {/* 6. Attendance Logs & Audit Tables */}
        {activeTab === 'logs' && (
          <AttendanceLogs
            attendanceRecords={attendanceRecords}
            students={students}
            onRefresh={refreshData}
            onRecordsCleared={refreshData}
          />
        )}
      </main>

      {/* Auth Modal (Google OAuth, Email/Password, Demo Access) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Settings Modal (FPS, Phone Vision, Strictly Managed Database) */}
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
