import React, { useState } from 'react';
import { 
  Download, 
  Search, 
  Calendar, 
  Trash2, 
  CheckCircle2, 
  Percent, 
  Smile, 
  RefreshCw 
} from 'lucide-react';
import { exportAttendanceToCSV, clearAttendanceRecords } from '../services/storageService';
import { EMOTIONS } from '../services/faceEngine';

export default function AttendanceLogs({ 
  attendanceRecords, 
  students, 
  onRefresh, 
  onRecordsCleared 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [showAllDates, setShowAllDates] = useState(false);

  // Filter records
  const filteredRecords = attendanceRecords.filter((rec) => {
    if (!showAllDates && rec.date !== selectedDate) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = rec.student_name?.toLowerCase().includes(q);
      const idMatch = rec.student_id?.toLowerCase().includes(q);
      if (!nameMatch && !idMatch) return false;
    }
    return true;
  });

  const totalCount = filteredRecords.length;
  const avgConfidence = totalCount > 0
    ? (filteredRecords.reduce((sum, r) => sum + Number(r.confidence_score || 95), 0) / totalCount).toFixed(1)
    : 0;

  // Dominant emotion
  const moodCounts = {};
  filteredRecords.forEach((r) => {
    const emo = r.dominant_emotion || 'neutral';
    moodCounts[emo] = (moodCounts[emo] || 0) + 1;
  });

  let dominantClassMood = { label: 'Attentive', emoji: '🎯', count: 0 };
  Object.entries(moodCounts).forEach(([emo, count]) => {
    if (count > dominantClassMood.count) {
      const meta = EMOTIONS[emo] || EMOTIONS.neutral;
      dominantClassMood = { label: meta.label, emoji: meta.emoji, count };
    }
  });

  const handleExport = () => {
    exportAttendanceToCSV(filteredRecords);
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear all attendance records?')) {
      await clearAttendanceRecords();
      if (onRecordsCleared) onRecordsCleared();
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 1.25rem 2rem 1.25rem' }}>
      
      {/* Top Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        {/* Metric 1: Total Attendance */}
        <div className="clean-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>TOTAL ATTENDANCE</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
            {totalCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {students.length} enrolled</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
            {students.length > 0 ? Math.round((totalCount / students.length) * 100) : 0}% turn-out rate
          </div>
        </div>

        {/* Metric 2: Average Confidence */}
        <div className="clean-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>MATCH ACCURACY</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.2rem' }}>
            {avgConfidence}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Biometric verification confidence
          </div>
        </div>

        {/* Metric 3: Dominant Class Expression */}
        <div className="clean-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>DOMINANT MOOD</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{dominantClassMood.emoji}</span>
            <span>{dominantClassMood.label}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {totalCount > 0 ? `${Math.round((dominantClassMood.count / totalCount) * 100)}% of students` : 'No data recorded'}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="clean-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Controls Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            
            {/* Search */}
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                className="input-field"
                placeholder="Search student or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.3rem' }}
              />
            </div>

            {/* Date selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="date"
                className="input-field"
                value={selectedDate}
                disabled={showAllDates}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: 'auto' }}
              />
              <button
                className={`btn ${showAllDates ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowAllDates(!showAllDates)}
              >
                {showAllDates ? 'All Dates' : 'Show All'}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" onClick={onRefresh} title="Refresh records">
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>

            <button
              className="btn btn-success"
              onClick={handleExport}
              disabled={filteredRecords.length === 0}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>

            {attendanceRecords.length > 0 && (
              <button className="btn btn-danger" onClick={handleClear} title="Clear logs">
                <Trash2 size={15} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Student</th>
                <th style={{ padding: '0.85rem 1rem' }}>Student ID / USN</th>
                <th style={{ padding: '0.85rem 1rem' }}>Date & Time</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem' }}>Match Confidence</th>
                <th style={{ padding: '0.85rem 1rem' }}>Expression</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, i) => {
                  const emo = EMOTIONS[r.dominant_emotion] || EMOTIONS.neutral;
                  const time = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr
                      key={r.id || i}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          {r.snapshot_url ? (
                            <img
                              src={r.snapshot_url}
                              alt=""
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '0.8rem'
                            }}>
                              {r.student_name ? r.student_name[0] : 'S'}
                            </div>
                          )}
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.student_name}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--primary)' }}>
                        {r.student_id}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>
                        <div>{r.date}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{time}</div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className="badge badge-green">✓ Present</span>
                      </td>

                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--success)' }}>
                        {Number(r.confidence_score).toFixed(0)}%
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className="badge badge-blue">
                          {emo.emoji} {emo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
