const SESSIONS_KEY = 'classpulse_sessions_v1';
const LEGACY_SESSIONS_KEY = 'veriface_sessions_v1';

export function getSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY) || localStorage.getItem(LEGACY_SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse sessions from localStorage:', e);
  }

  // Pure production: No fake or hardcoded mock sessions
  return [];
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
    department: sessionData.department || '',
    instructor: sessionData.instructor || '',
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
