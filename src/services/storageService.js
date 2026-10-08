import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STUDENTS_KEY = 'veriface_students_v1';
const LOCAL_ATTENDANCE_KEY = 'veriface_attendance_v1';

// Seed demo students for zero-setup out of the box testing if local storage is empty
const DEMO_STUDENTS = [];

/**
 * Get all students
 */
export async function getStudents() {
  const supabase = getSupabaseClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase getStudents error, falling back to local:', error);
      } else if (data) {
        // Cache to local storage
        localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(data));
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetch failed, using local storage:', err);
    }
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem(LOCAL_STUDENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read local students:', e);
  }

  return DEMO_STUDENTS;
}

/**
 * Save or update student (with multi-angle face descriptors)
 */
export async function saveStudent(studentData) {
  const newStudent = {
    id: studentData.id || crypto.randomUUID(),
    student_id: studentData.student_id.trim(),
    full_name: studentData.full_name.trim(),
    email: studentData.email ? studentData.email.trim() : '',
    department: studentData.department ? studentData.department.trim() : 'General',
    face_descriptors: studentData.face_descriptors || [], // array of 128D Float32 vectors
    avatar_url: studentData.avatar_url || '',
    created_at: studentData.created_at || new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  let supabaseSuccess = false;

  if (supabase && isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('students').upsert([newStudent], {
        onConflict: 'student_id',
      });
      if (error) {
        console.error('Supabase save student error:', error);
        throw error;
      }
      supabaseSuccess = true;
    } catch (err) {
      console.warn('Supabase save failed, saving locally:', err);
      // Still proceed to save locally so student isn't lost
    }
  }

  // Always update local cache
  const localList = await getStudents();
  const existingIndex = localList.findIndex((s) => s.student_id === newStudent.student_id);
  let updatedList;
  if (existingIndex >= 0) {
    updatedList = [...localList];
    updatedList[existingIndex] = newStudent;
  } else {
    updatedList = [newStudent, ...localList];
  }
  localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(updatedList));

  return { student: newStudent, supabaseSynced: supabaseSuccess };
}

/**
 * Delete a student by student_id
 */
export async function deleteStudent(studentId) {
  const supabase = getSupabaseClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('students').delete().eq('student_id', studentId);
      if (error) console.error('Supabase delete error:', error);
    } catch (err) {
      console.warn('Supabase delete failed:', err);
    }
  }

  // Delete from local
  const localList = await getStudents();
  const filtered = localList.filter((s) => s.student_id !== studentId);
  localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(filtered));

  return true;
}

/**
 * Check if student has already been marked today
 */
export async function isStudentMarkedToday(studentId, targetDateStr = null) {
  const today = targetDateStr || new Date().toISOString().slice(0, 10);
  const records = await getAttendanceRecords(today);
  return records.some((r) => r.student_id === studentId);
}

/**
 * Record attendance entry
 */
export async function markAttendance(record) {
  const newRecord = {
    id: record.id || crypto.randomUUID(),
    student_id: record.student_id,
    student_name: record.student_name,
    date: record.date || new Date().toISOString().slice(0, 10),
    timestamp: record.timestamp || new Date().toISOString(),
    status: record.status || 'Present',
    confidence_score: Number(record.confidence_score) || 95.0,
    dominant_emotion: record.dominant_emotion || 'neutral',
    emotion_scores: record.emotion_scores || {},
    snapshot_url: record.snapshot_url || null,
    device_info: record.device_info || 'Webcam Client',
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  let supabaseSuccess = false;

  if (supabase && isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('attendance_records').insert([newRecord]);
      if (error) {
        console.error('Supabase attendance insert error:', error);
      } else {
        supabaseSuccess = true;
      }
    } catch (err) {
      console.warn('Supabase insert failed, saving locally:', err);
    }
  }

  // Update local storage
  const local = getLocalAttendance();
  const updated = [newRecord, ...local];
  localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(updated));

  return { record: newRecord, supabaseSynced: supabaseSuccess };
}

function getLocalAttendance() {
  try {
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Get attendance records, optionally filtered by date (YYYY-MM-DD)
 */
export async function getAttendanceRecords(filterDate = null) {
  const supabase = getSupabaseClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase.from('attendance_records').select('*').order('timestamp', { ascending: false });
      if (filterDate) {
        query = query.eq('date', filterDate);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetch attendance failed, using local storage:', err);
    }
  }

  // Local fallback
  const local = getLocalAttendance();
  if (filterDate) {
    return local.filter((r) => r.date === filterDate);
  }
  return local;
}

/**
 * Clear all attendance records
 */
export async function clearAttendanceRecords() {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('attendance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {
      console.warn('Supabase clear failed:', err);
    }
  }
  localStorage.removeItem(LOCAL_ATTENDANCE_KEY);
  return true;
}

/**
 * Sync local data into Supabase
 */
export async function syncLocalToSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return { success: false, message: 'Supabase is not configured' };
  }

  try {
    const localStudents = JSON.parse(localStorage.getItem(LOCAL_STUDENTS_KEY) || '[]');
    const localAttendance = JSON.parse(localStorage.getItem(LOCAL_ATTENDANCE_KEY) || '[]');

    let studentsSynced = 0;
    let attendanceSynced = 0;

    if (localStudents.length > 0) {
      const { error: sErr } = await supabase.from('students').upsert(localStudents, { onConflict: 'student_id' });
      if (!sErr) studentsSynced = localStudents.length;
    }

    if (localAttendance.length > 0) {
      const { error: aErr } = await supabase.from('attendance_records').upsert(localAttendance, { onConflict: 'id' });
      if (!aErr) attendanceSynced = localAttendance.length;
    }

    return {
      success: true,
      message: `Successfully synced ${studentsSynced} students and ${attendanceSynced} attendance records to Supabase!`,
    };
  } catch (err) {
    return { success: false, message: 'Sync failed: ' + err.message };
  }
}

/**
 * Export attendance records to CSV file
 */
export function exportAttendanceToCSV(records) {
  if (!records || records.length === 0) {
    alert('No attendance records to export.');
    return;
  }

  const headers = [
    'Student ID',
    'Student Name',
    'Date',
    'Timestamp',
    'Status',
    'Confidence (%)',
    'Dominant Emotion',
    'Happy %',
    'Neutral %',
    'Surprised %',
    'Sad %',
    'Angry %',
  ];

  const rows = records.map((r) => {
    const timeFormatted = new Date(r.timestamp).toLocaleTimeString();
    const scores = r.emotion_scores || {};
    return [
      `"${r.student_id || ''}"`,
      `"${r.student_name || ''}"`,
      r.date || '',
      `"${timeFormatted}"`,
      r.status || 'Present',
      r.confidence_score || '',
      `"${r.dominant_emotion || ''}"`,
      scores.happy ? (scores.happy * 100).toFixed(1) : '0',
      scores.neutral ? (scores.neutral * 100).toFixed(1) : '0',
      scores.surprised ? (scores.surprised * 100).toFixed(1) : '0',
      scores.sad ? (scores.sad * 100).toFixed(1) : '0',
      scores.angry ? (scores.angry * 100).toFixed(1) : '0',
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `VeriFace_Attendance_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
