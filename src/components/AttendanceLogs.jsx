import React, { useState } from 'react';
import { 
  Download, 
  Search, 
  Calendar, 
  Trash2, 
  Filter, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Smile, 
  Percent,
  FileSpreadsheet,
  AlertTriangle,
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
  const [filterAllDates, setFilterAllDates] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter records
  const filteredRecords = attendanceRecords.filter((rec) => {
    // Date filter
    if (!filterAllDates && rec.date !== selectedDate) {
      return false;
    }
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = rec.student_name?.toLowerCase().includes(q);
      const idMatch = rec.student_id?.toLowerCase().includes(q);
      if (!nameMatch && !idMatch) return false;
    }
    // Status filter
    if (statusFilter !== 'ALL' && rec.status !== statusFilter) {
      return false;
    }
    return true;
  });

  // Calculate statistics
  const totalCount = filteredRecords.length;
  const avgConfidence = totalCount > 0
    ? (filteredRecords.reduce((sum, r) => sum + Number(r.confidence_score || 95), 0) / totalCount).toFixed(1)
    : 0;

  // Dominant mood calculation
  const moodCounts = {};
  filteredRecords.forEach((r) => {
    const emo = r.dominant_emotion || 'neutral';
    moodCounts[emo] = (moodCounts[emo] || 0) + 1;
  });

  let dominantClassMood = { emotion: 'neutral', label: 'Neutral', emoji: '😐', count: 0 };
  Object.entries(moodCounts).forEach(([emo, count]) => {
    if (count > dominantClassMood.count) {
      const meta = EMOTIONS[emo] || EMOTIONS.neutral;
      dominantClassMood = { emotion: emo, label: meta.label, emoji: meta.emoji, count };
    }
  });

  const attendanceRate = students.length > 0
    ? Math.min(100, Math.round((totalCount / students.length) * 100))
    : 0;

  const handleExport = () => {
    exportAttendanceToCSV(filteredRecords);
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear all attendance logs? This cannot be undone.')) {
      await clearAttendanceRecords();
      if (onRecordsCleared) onRecordsCleared();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 1rem 2rem 1rem' }}>
      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1: Total Attendance */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#06b6d4'
          }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ATTENDANCE COUNT</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-white)' }}>
              {totalCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 500 }}>/ {students.length}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{attendanceRate}% attendance rate</div>
          </div>
        </div>

        {/* Card 2: Recognition Accuracy */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981'
          }}>
            <Percent size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>AVG ACCURACY SCORE</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--emerald-400)' }}>
              {avgConfidence}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>High-precision biometric match</div>
          </div>
        </div>

        {/* Card 3: Dominant Class Emotion */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b'
          }}>
            <Smile size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>DOMINANT MOOD</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>{dominantClassMood.emoji}</span>
              <span>{dominantClassMood.label}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--amber-500)' }}>
              {totalCount > 0 ? `${Math.round((dominantClassMood.count / totalCount) * 100)}% of students` : 'No data'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Controls & Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                className="vf-input"
                placeholder="Search student or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.4rem', paddingRight: '0.75rem' }}
              />
            </div>

            {/* Date Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="date"
                className="vf-input"
                value={selectedDate}
                disabled={filterAllDates}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: 'auto', padding: '0.65rem 0.85rem' }}
              />
              <button
                className={`vf-btn ${filterAllDates ? 'vf-btn-primary' : 'vf-btn-ghost'}`}
                style={{ padding: '0.55rem 0.85rem', fontSize: '0.8rem' }}
                onClick={() => setFilterAllDates(!filterAllDates)}
              >
                {filterAllDates ? 'All Dates' : 'Show All'}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="vf-btn vf-btn-ghost"
              onClick={onRefresh}
              title="Refresh Records"
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>

            <button
              className="vf-btn vf-btn-success"
              onClick={handleExport}
              disabled={filteredRecords.length === 0}
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>

            {attendanceRecords.length > 0 && (
              <button
                className="vf-btn vf-btn-danger"
                onClick={handleClear}
                title="Clear Records"
              >
                <Trash2 size={16} />
                <span>Clear Logs</span>
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(7, 10, 18, 0.8)', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem' }}>Student Profile</th>
                <th style={{ padding: '1rem' }}>USN / Student ID</th>
                <th style={{ padding: '1rem' }}>Date & Time</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Accuracy Confidence</th>
                <th style={{ padding: '1rem' }}>Recorded Emotion</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No attendance records found for this criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, index) => {
                  const emoMeta = EMOTIONS[r.dominant_emotion] || EMOTIONS.neutral;
                  const timeStr = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                  return (
                    <tr
                      key={r.id || index}
                      style={{
                        borderBottom: '1px solid var(--glass-border)',
                        background: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Student Profile */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {r.snapshot_url ? (
                            <img
                              src={r.snapshot_url}
                              alt=""
                              style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--glass-border)' }}
                            />
                          ) : (
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.85rem'
                            }}>
                              {r.student_name ? r.student_name[0] : 'S'}
                            </div>
                          )}
                          <span style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                            {r.student_name}
                          </span>
                        </div>
                      </td>

                      {/* USN / Student ID */}
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--cyan-400)' }}>
                        {r.student_id}
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--text-light)' }}>
                        <div>{r.date}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{timeStr}</div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="vf-badge vf-badge-emerald">
                          <CheckCircle size={12} />
                          <span>{r.status || 'Present'}</span>
                        </span>
                      </td>

                      {/* Match Confidence */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '60px', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, Number(r.confidence_score))}%`,
                              backgroundColor: '#10b981'
                            }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--emerald-400)' }}>
                            {Number(r.confidence_score).toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Emotion */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="vf-badge" style={{ backgroundColor: emoMeta.color + '25', color: emoMeta.color, border: `1px solid ${emoMeta.color}50` }}>
                          <span>{emoMeta.emoji}</span>
                          <span style={{ textTransform: 'capitalize' }}>{emoMeta.label}</span>
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
