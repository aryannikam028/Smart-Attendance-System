'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  GraduationCap,
  Calendar,
  BookOpen,
  Clock,
  User,
  LogOut,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Key,
  Shield,
  Send,
  Loader2,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import type { SubjectStats, LeaveApplication, LectureColumn } from '@/lib/types';

export default function StudentDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'subjects' | 'leaves' | 'profile'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Month selection
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);

  // Leave Form
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveMsg, setLeaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change Password Form
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch Attendance
  const fetchAttendance = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (isRefresh) params.set('refresh', 'true');
      if (selectedMonth) {
        params.set('year', String(selectedMonth.year));
        params.set('month', String(selectedMonth.month));
      }

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load attendance');

      setData(json);
      if (!selectedMonth && json.activeMonth) {
        setSelectedMonth({ year: json.activeMonth.year, month: json.activeMonth.month });
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, selectedMonth]);

  // Fetch Leaves
  const fetchLeaves = useCallback(async () => {
    try {
      const res = await fetch('/api/leaves');
      if (res.ok) {
        const json = await res.json();
        setLeaves(json.applications || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAttendance();
    fetchLeaves();
  }, [fetchAttendance, fetchLeaves]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveMsg(null);
    setLeaveSubmitting(true);

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: leaveDate, reason: leaveReason })
      });

      if (res.status === 401 || res.status === 403) {
        setLeaveMsg({
          type: 'error',
          text: 'Your session has expired. Please sign in again to submit your leave request.'
        });
        setTimeout(() => {
          router.push('/login?redirect=/student');
        }, 2000);
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to submit leave application');

      setLeaveMsg({ type: 'success', text: 'Leave application submitted successfully for review.' });
      setLeaveDate('');
      setLeaveReason('');
      fetchLeaves();
    } catch (err: any) {
      let msg = err.message || 'Failed to submit leave application';
      if (msg === 'AUTH' || msg.includes('Session expired') || msg.includes('authenticated')) {
        msg = 'Your session has expired. Please sign out and sign in again.';
      }
      setLeaveMsg({ type: 'error', text: msg });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    setPassLoading(true);

    try {
      const res = await fetch('/api/students/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to update password');

      setPassMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.message || 'Password update failed' });
    } finally {
      setPassLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', position: 'relative', overflow: 'hidden' }}>
        <div className="ambient-glow-wrapper">
          <div className="glow-orb-blue" />
          <div className="glow-orb-teal" />
        </div>
        <div className="neu-card animate-scale-in" style={{ padding: '36px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, maxWidth: '400px', width: '90%' }}>
          <div style={{ position: 'relative', width: '56px', height: '56px', marginBottom: '16px', borderRadius: '50%', overflow: 'hidden', boxShadow: 'var(--neu-inset-sm)' }}>
            <Image src="/logo.jpg" alt="Logo" fill style={{ objectFit: 'contain' }} priority />
          </div>
          <Loader2 size={36} className="animate-spin" color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '15px' }}>
            Loading your attendance register...
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Synchronizing live with Google Sheets
          </p>
        </div>
      </div>
    );
  }

  const student = data?.student;
  const subjects: SubjectStats[] = data?.subjects || [];
  const columns: LectureColumn[] = data?.columns || [];
  const isDefaulter = student?.isDefaulter || false;

  return (
    <div className="dashboard-layout" style={{ position: 'relative', overflow: 'hidden' }}>
      
      {/* Ambient Floating Glow Backdrop */}
      <div className="ambient-glow-wrapper">
        <div className="glow-orb-blue" />
        <div className="glow-orb-teal" />
      </div>

      {/* Backdrop overlay for mobile drawer */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative', width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', boxShadow: 'var(--neu-inset-sm)', flexShrink: 0 }}>
              <Image src="/logo.jpg" alt="Logo" fill style={{ objectFit: 'contain' }} priority />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Smart Attendance</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Student Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="sidebar-close-btn"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Student Mini Profile Card in Sidebar */}
        <div className="neu-card-sm" style={{ padding: '14px', marginBottom: '24px', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
              <User size={20} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {student?.name || 'Student'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Roll: {student?.roll} | PRN: {student?.prn}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {[
            { id: 'overview', label: 'Attendance Overview', icon: GraduationCap },
            { id: 'calendar', label: 'Lecture Calendar', icon: Calendar },
            { id: 'subjects', label: 'Subject-Wise Analysis', icon: BookOpen },
            { id: 'leaves', label: 'Leave Applications', icon: FileText },
            { id: 'profile', label: 'Academic Profile', icon: User }
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setSidebarOpen(false);
                }}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: active ? 'var(--bg-card)' : 'transparent',
                  boxShadow: active ? 'var(--neu-inset-sm)' : 'none',
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: active ? 'translateX(4px)' : 'none'
                }}
              >
                <Icon size={18} /> {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div style={{ borderTop: '1px solid rgba(200, 208, 222, 0.4)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="neu-btn"
            style={{ width: '100%', fontSize: '13px', padding: '9px 12px' }}
          >
            <Key size={16} /> Change Password
          </button>
          <button
            onClick={handleLogout}
            className="neu-btn"
            style={{ width: '100%', fontSize: '13px', padding: '9px 12px', color: '#dc2626' }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* Mobile Top Bar */}
        <div className="mobile-top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="neu-btn"
              style={{ padding: '8px', minWidth: '38px', minHeight: '38px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ position: 'relative', width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                <Image src="/logo.jpg" alt="Logo" fill style={{ objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>Smart Attendance</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`badge ${student?.isDefaulter ? 'badge-defaulter' : 'badge-present'}`} style={{ fontSize: '11px', padding: '3px 8px' }}>
              {student?.overallPercent}%
            </span>
            <button
              onClick={handleLogout}
              className="neu-btn"
              style={{ padding: '6px 10px', fontSize: '12px', color: '#dc2626' }}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Top Header Bar */}
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.35rem, 4.5vw, 1.75rem)', marginBottom: '4px' }}>
              {activeTab === 'overview' && 'Attendance Overview'}
              {activeTab === 'calendar' && 'Day-by-Day Lecture Calendar'}
              {activeTab === 'subjects' && 'Subject-Wise Attendance'}
              {activeTab === 'leaves' && 'Formal Leave Applications'}
              {activeTab === 'profile' && 'Verified Academic Profile'}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Final Year B.Tech (Division B) | Electronics & Telecommunication Engineering
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Month Selector */}
            {data?.months && data.months.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedMonth ? `${selectedMonth.year}-${selectedMonth.month}` : ''}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split('-');
                    setSelectedMonth({ year: parseInt(y, 10), month: parseInt(m, 10) });
                  }}
                  className="neu-card-sm"
                  style={{
                    padding: '8px 30px 8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.7)',
                    background: 'var(--bg-card)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    appearance: 'none',
                    outline: 'none'
                  }}
                >
                  {data.months.map((m: any) => (
                    <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              </div>
            )}

            {/* Sync Refresh Button */}
            <button
              onClick={() => fetchAttendance(true)}
              disabled={refreshing}
              className="neu-btn"
              style={{ padding: '8px 14px', fontSize: '12px' }}
              title="Sync latest records from Google Sheets"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: OVERVIEW & 75% PREDICTOR
            ───────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="tab-transition">
            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '16px', marginBottom: '24px' }}>
              
              {/* Overall Percentage Card */}
              <div className="neu-card interactive-card animate-slide-up delay-1" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Overall Attendance</span>
                  <span className={`badge ${isDefaulter ? 'badge-defaulter pulse-badge-defaulter' : 'badge-present'}`}>
                    {isDefaulter ? 'Defaulter' : 'Eligible'}
                  </span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: isDefaulter ? '#b91c1c' : '#15803d', lineHeight: 1 }}>
                  {student?.overallPercent}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Required Minimum: {data?.minPercent || 75}%
                </div>
              </div>

              {/* Attended Card */}
              <div className="neu-card interactive-card animate-slide-up delay-2" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Lectures Attended</span>
                  <CheckCircle2 size={18} color="#16a34a" />
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>
                  {student?.totalAttended}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Out of {student?.totalConducted} held
                </div>
              </div>

              {/* Missed Card */}
              <div className="neu-card interactive-card animate-slide-up delay-3" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Lectures Missed</span>
                  <XCircle size={18} color="#dc2626" />
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
                  {student?.totalMissed}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Absences recorded
                </div>
              </div>

              {/* Total Conducted Card */}
              <div className="neu-card interactive-card animate-slide-up delay-4" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Conducted (Held)</span>
                  <Clock size={18} color="var(--accent-primary)" />
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {student?.totalConducted}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Excludes cancelled/skipped lectures
                </div>
              </div>
            </div>

            {/* 75% ATTENDANCE SHORTFALL PREDICTOR CARD */}
            <div
              className={`neu-card interactive-card animate-slide-up delay-5 ${isDefaulter ? 'pulse-badge-defaulter' : ''}`}
              style={{
                padding: '28px',
                marginBottom: '28px',
                borderLeft: isDefaulter ? '6px solid #ef4444' : '6px solid #10b981',
                background: isDefaulter ? 'var(--status-defaulter-bg)' : 'var(--bg-card)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ maxWidth: '640px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    {isDefaulter ? <AlertTriangle size={22} color="#dc2626" /> : <Shield size={22} color="#16a34a" />}
                    <h2 style={{ fontSize: '1.3rem', color: isDefaulter ? '#991b1b' : 'var(--text-primary)' }}>
                      75% Attendance Eligibility Calculator
                    </h2>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Institutional Regulation: Students must maintain at least <strong>75% attendance</strong> to be eligible for end-semester university examinations.
                    Formula: <code style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>x = ceil(3T − 4A)</code>
                  </p>
                </div>

                <div className="neu-card-sm" style={{ padding: '16px 24px', textAlign: 'center', minWidth: '180px', background: 'var(--bg-card)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Lectures Needed
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: isDefaulter ? '#dc2626' : '#16a34a' }}>
                    {student?.overallNeeded75}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {student?.overallNeeded75 === 0 ? 'Currently Safe' : 'Must attend consecutively'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Subject Summary Cards */}
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Subject-Wise Snapshot</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {subjects.map((sub, idx) => (
                <div key={sub.subjectName} className={`neu-card-sm interactive-card animate-slide-up delay-${Math.min(idx + 1, 6)}`} style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', maxWidth: '170px' }}>
                      {sub.subjectName}
                    </div>
                    <span className={`badge ${sub.isDefaulter ? 'badge-defaulter' : 'badge-present'}`}>
                      {sub.percentage}%
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Attended: {sub.attended}/{sub.conducted}</span>
                    <span>Missed: {sub.missed}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden', boxShadow: 'var(--neu-inset-sm)' }}>
                    <div
                      style={{
                        width: `${Math.min(100, sub.percentage)}%`,
                        height: '100%',
                        background: sub.isDefaulter ? '#ef4444' : '#10b981',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                  {sub.needed75 > 0 && (
                    <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '6px', fontWeight: 600 }}>
                      Shortfall: Need {sub.needed75} more lecture(s) for 75%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: DAY-BY-DAY LECTURE CALENDAR
            ───────────────────────────────────────────────────────────── */}
        {activeTab === 'calendar' && (
          <div className="tab-transition">
            <div className="neu-card" style={{ padding: 'clamp(14px, 4vw, 24px)' }}>
              <div className="mobile-swipe-hint">
                <span>⇄ Swipe horizontally for complete timetable</span>
              </div>
              <div className="table-responsive-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '620px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(200, 208, 222, 0.6)' }}>
                      <th style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>Day / Date</th>
                      <th style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>Time Slot</th>
                      <th style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>Course Subject</th>
                      <th style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>Type</th>
                      <th style={{ padding: '12px 14px', color: 'var(--text-secondary)', textAlign: 'center' }}>Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((col, idx) => {
                      const status = student?.cells ? student.cells[idx] : '';
                      const isHoliday = col.nonWorking;

                      return (
                        <tr
                          key={idx}
                          className="interactive-row"
                          style={{
                            borderBottom: '1px solid rgba(200, 208, 222, 0.3)',
                            background: isHoliday ? 'rgba(0,0,0,0.02)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                            {col.dayName} {col.date}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                            {col.time || '—'}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: isHoliday ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                            {col.label}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {col.practical ? (
                              <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                Practical
                              </span>
                            ) : isHoliday ? (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Non-Working</span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lecture</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            {isHoliday ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{col.nonLabel || 'Holiday'}</span>
                            ) : status === 'P' ? (
                              <span className="badge badge-present">Present</span>
                            ) : status === 'A' ? (
                              <span className="badge badge-absent">Absent</span>
                            ) : col.held === 0 ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Not Held / Cancelled</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: SUBJECT-WISE ANALYSIS
            ───────────────────────────────────────────────────────────── */}
        {activeTab === 'subjects' && (
          <div className="tab-transition">
            <div className="neu-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Detailed Course Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {subjects.map((sub) => (
                  <div key={sub.subjectName} className="interactive-row" style={{ borderBottom: '1px solid rgba(200, 208, 222, 0.4)', paddingBottom: '16px', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '15px' }}>{sub.subjectName}</span>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Held: {sub.conducted} | Attended: {sub.attended} | Missed: {sub.missed}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: sub.isDefaulter ? '#dc2626' : '#16a34a' }}>
                          {sub.percentage}%
                        </span>
                        <div style={{ fontSize: '11px', color: sub.isDefaulter ? '#dc2626' : 'var(--text-muted)' }}>
                          {sub.needed75 > 0 ? `Need ${sub.needed75} more for 75%` : 'Eligible'}
                        </div>
                      </div>
                    </div>
                    {/* Progress Bar with smooth ease */}
                    <div style={{ width: '100%', height: '10px', background: 'var(--bg-input)', borderRadius: '5px', overflow: 'hidden', boxShadow: 'var(--neu-inset-sm)' }}>
                      <div
                        style={{
                          width: `${Math.min(100, sub.percentage)}%`,
                          height: '100%',
                          background: sub.isDefaulter ? 'linear-gradient(90deg, #f87171, #dc2626)' : 'linear-gradient(90deg, #34d178, #10b981)',
                          borderRadius: '5px',
                          transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: LEAVE APPLICATIONS
            ───────────────────────────────────────────────────────────── */}
        {activeTab === 'leaves' && (
          <div className="tab-transition">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
              
              {/* Submission Form */}
              <div className="neu-card interactive-card" style={{ padding: 'clamp(18px, 4vw, 28px)' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Apply for Leave</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Upon administrator approval, all lectures scheduled on the selected date will be automatically marked as Present.
                </p>

                {leaveMsg && (
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                      marginBottom: '16px',
                      background: leaveMsg.type === 'success' ? 'var(--status-approved-bg)' : 'var(--status-defaulter-bg)',
                      color: leaveMsg.type === 'success' ? 'var(--status-approved-text)' : 'var(--status-defaulter-text)'
                    }}
                  >
                    {leaveMsg.text}
                  </div>
                )}

                <form onSubmit={handleApplyLeave}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Date of Absence
                    </label>
                    <input
                      type="date"
                      required
                      className="neu-input"
                      value={leaveDate}
                      onChange={(e) => setLeaveDate(e.target.value)}
                    />
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Reason for Absence
                    </label>
                    <textarea
                      required
                      rows={3}
                      className="neu-input"
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="e.g. Medical emergency / Academic conference / Inter-college competition"
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={leaveSubmitting}
                    className="neu-btn neu-btn-primary"
                    style={{ width: '100%', padding: '12px' }}
                  >
                    {leaveSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Submit Leave Request
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Leave History List */}
              <div className="neu-card" style={{ padding: '28px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Leave Application History</h3>

                {leaves.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                    <FileText size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                    <p style={{ fontSize: '14px' }}>No leave applications submitted yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {leaves.map((app) => (
                      <div
                        key={app.id}
                        className="neu-card-sm"
                        style={{ padding: '16px', background: 'var(--bg-card)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '14px' }}>{app.date || app.startDate}</span>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Applied: {app.appliedDate}</div>
                          </div>
                          <span
                            className={`badge ${
                              app.status === 'Approved'
                                ? 'badge-approved'
                                : app.status === 'Rejected'
                                ? 'badge-rejected'
                                : 'badge-pending'
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          {app.reason}
                        </p>
                        {app.status === 'Rejected' && app.rejectionReason && (
                          <div style={{ fontSize: '12px', color: '#b91c1c', background: '#ffe4e6', padding: '6px 10px', borderRadius: '6px', marginTop: '6px' }}>
                            <strong>Rejection Reason:</strong> {app.rejectionReason}
                          </div>
                        )}
                        {app.status === 'Approved' && (
                          <div style={{ fontSize: '12px', color: '#047857', background: '#d1fae5', padding: '6px 10px', borderRadius: '6px', marginTop: '6px' }}>
                            ✓ All lectures on this date marked Present in Google Sheets.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: ACADEMIC PROFILE (VIEW ONLY)
            ───────────────────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="tab-transition" style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div className="neu-card interactive-card" style={{ padding: 'clamp(20px, 5vw, 36px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
                <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--neu-raised-sm)', color: 'var(--accent-primary)' }}>
                  <User size={44} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{student?.name}</h2>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Permanent Registration No (PRN): <strong>{student?.prn}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Verified Student Record | Yashoda Technical Campus, Satara
                  </div>
                </div>
              </div>

              {/* Profile Details List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                <div className="neu-inset" style={{ padding: '14px 18px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Roll Number</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {student?.roll}
                  </div>
                </div>

                <div className="neu-inset" style={{ padding: '14px 18px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Branch & Discipline</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    Electronics & Telecommunication
                  </div>
                </div>

                <div className="neu-inset" style={{ padding: '14px 18px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Class & Division</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    Final Year B.Tech (Division B)
                  </div>
                </div>

                <div className="neu-inset" style={{ padding: '14px 18px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Academic Year & Term</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    2026–2027 (Semester VII)
                  </div>
                </div>

                <div className="neu-inset" style={{ padding: '14px 18px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Registered Parent Mobile</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {student?.phone ? `******${String(student.phone).slice(-4)}` : 'On file with administration'}
                  </div>
                </div>

                <div className="neu-inset" style={{ padding: '14px 18px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Biometric Device Tap</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {student?.time || 'No scan recorded today'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '28px', padding: '14px', background: 'rgba(0,0,0,0.03)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-muted)' }}>
                ℹ️ Student profile details are synchronized from the official college register. To update any information, please submit an official request to the Department Office.
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
          <div className="neu-card modal-dialog" style={{ maxWidth: '400px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '6px' }}>Change Account Password</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Minimum 8 characters. Must contain letters and numbers.
            </p>

            {passMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  marginBottom: '16px',
                  background: passMsg.type === 'success' ? 'var(--status-approved-bg)' : 'var(--status-defaulter-bg)',
                  color: passMsg.type === 'success' ? 'var(--status-approved-text)' : 'var(--status-defaulter-text)'
                }}
              >
                {passMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  className="neu-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="neu-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="neu-btn"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="neu-btn neu-btn-primary"
                  style={{ flex: 1 }}
                >
                  {passLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
