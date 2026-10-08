const SESSIONS_KEY = 'classpulse_sessions_v1';
const LEGACY_SESSIONS_KEY = 'veriface_sessions_v1';

export function getSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY) || localStorage.getItem(LEGACY_SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse sessions from localStorage:', e);
  }

  // If no sessions exist yet, return sample default sessions
  return getSampleSessions();
}

export function saveSessions(sessions) {
  try {
    const data = JSON.stringify(sessions);
    localStorage.setItem(SESSIONS_KEY, data);
    localStorage.setItem(LEGACY_SESSIONS_KEY, data);
    window.dispatchEvent(new CustomEvent('classpulse_sessions_updated', { detail: sessions }));
    return true;
  } catch (e) {
    console.error('Failed to save sessions:', e);
    return false;
  }
}

export function updateSession(sessionId, updatedFields) {
  const current = getSessions();
  const updated = current.map(sess => {
    if (sess.id === sessionId || sess.name === sessionId) {
      return {
        ...sess,
        ...updatedFields,
        updatedAt: new Date().toISOString()
      };
    }
    return sess;
  });
  saveSessions(updated);
  return updated;
}

export function deleteSession(sessionId) {
  const current = getSessions();
  const filtered = current.filter(sess => sess.id !== sessionId && sess.name !== sessionId);
  saveSessions(filtered);
  return filtered;
}

export function createNewSession(sessionData) {
  const current = getSessions();
  const newSession = {
    id: 'session-' + Date.now(),
    name: sessionData.name || `Session ${current.length + 1}`,
    date: sessionData.date || new Date().toISOString().slice(0, 10),
    startTime: sessionData.startTime || new Date().toLocaleTimeString(),
    endTime: sessionData.endTime || null,
    durationSec: sessionData.durationSec || 0,
    department: sessionData.department || 'Computer Science',
    instructor: sessionData.instructor || 'Dr. Evelyn Reed',
    notes: sessionData.notes || '',
    records: sessionData.records || {},
    phoneAlerts: sessionData.phoneAlerts || [],
    dominantEmotion: sessionData.dominantEmotion || 'Neutral',
    createdAt: new Date().toISOString()
  };
  const updated = [newSession, ...current];
  saveSessions(updated);
  return newSession;
}

function getSampleSessions() {
  const today = new Date().toISOString().slice(0, 10);
  const sample = [
    {
      id: 'session-demo-01',
      name: 'Session 1 - Advanced Neural Algorithms',
      date: today,
      startTime: '09:00:12 AM',
      endTime: '09:50:30 AM',
      durationSec: 3018,
      department: 'Computer Science',
      instructor: 'Dr. Evelyn Reed',
      notes: 'Convolutional neural networks & transformer architecture discussion.',
      dominantEmotion: 'Neutral',
      phoneAlerts: [
        { studentName: 'David Kim', timestamp: '09:24:18 AM', confidence: 0.94 }
      ],
      records: {
        'CS-2024-001': {
          student_id: 'CS-2024-001',
          student_name: 'Sarah Chen',
          department: 'Computer Science',
          firstEntryTime: '09:00:20 AM',
          exitTime: '09:50:15 AM',
          activeSeconds: 2995,
          phoneViolations: 0,
          currentEmotion: 'neutral',
          emotionScores: { neutral: 0.88, happy: 0.08, surprised: 0.02, sad: 0.01, angry: 0.0, fearful: 0.01, disgusted: 0.0 }
        },
        'CS-2024-002': {
          student_id: 'CS-2024-002',
          student_name: 'Alexander Wright',
          department: 'Computer Science',
          firstEntryTime: '09:02:44 AM',
          exitTime: '09:48:10 AM',
          activeSeconds: 2726,
          phoneViolations: 0,
          currentEmotion: 'happy',
          emotionScores: { neutral: 0.42, happy: 0.52, surprised: 0.04, sad: 0.01, angry: 0.0, fearful: 0.01, disgusted: 0.0 }
        },
        'CS-2024-003': {
          student_id: 'CS-2024-003',
          student_name: 'David Kim',
          department: 'Computer Science',
          firstEntryTime: '09:05:12 AM',
          exitTime: '09:49:00 AM',
          activeSeconds: 2628,
          phoneViolations: 1,
          currentEmotion: 'neutral',
          emotionScores: { neutral: 0.79, happy: 0.11, surprised: 0.03, sad: 0.04, angry: 0.02, fearful: 0.01, disgusted: 0.0 }
        }
      }
    },
    {
      id: 'session-demo-02',
      name: 'Session 2 - Distributed Systems & Database Sharding',
      date: today,
      startTime: '11:15:00 AM',
      endTime: '12:10:45 PM',
      durationSec: 3345,
      department: 'Computer Science',
      instructor: 'Dr. Evelyn Reed',
      notes: 'Consensus protocols, Raft, and Supabase PostgreSQL replication.',
      dominantEmotion: 'Happy',
      phoneAlerts: [],
      records: {
        'CS-2024-001': {
          student_id: 'CS-2024-001',
          student_name: 'Sarah Chen',
          department: 'Computer Science',
          firstEntryTime: '11:15:10 AM',
          exitTime: '12:10:00 PM',
          activeSeconds: 3290,
          phoneViolations: 0,
          currentEmotion: 'happy',
          emotionScores: { neutral: 0.35, happy: 0.60, surprised: 0.03, sad: 0.01, angry: 0.0, fearful: 0.01, disgusted: 0.0 }
        },
        'CS-2024-002': {
          student_id: 'CS-2024-002',
          student_name: 'Alexander Wright',
          department: 'Computer Science',
          firstEntryTime: '11:16:30 AM',
          exitTime: '12:08:15 PM',
          activeSeconds: 3105,
          phoneViolations: 0,
          currentEmotion: 'neutral',
          emotionScores: { neutral: 0.81, happy: 0.14, surprised: 0.03, sad: 0.01, angry: 0.01, fearful: 0.0, disgusted: 0.0 }
        }
      }
    }
  ];

  // Save the samples so they can be immediately edited/deleted
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sample));
  } catch (e) {}

  return sample;
}
