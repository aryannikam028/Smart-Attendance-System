'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ShieldCheck,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Award,
  RefreshCw,
  Search,
  Download,
  Edit2,
  Key,
  LogOut,
  FileText,
  Activity,
  Check,
  X,
  Loader2,
  ChevronDown,
  Menu
} from 'lucide-react';
import type { LeaveApplication, AuditLogEntry, LectureColumn } from '@/lib/types';

export default function AdminDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'attendance' | 'leaves' | 'audit'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Month selector
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'defaulters' | 'top'>('all');

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPrn, setEditPrn] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Attendance Cell Correction Modal State
  const [correctingCell, setCorrectingCell] = useState<{
    student: any;
    column: LectureColumn;
    colIndex: number;
    currentStatus: string;
  } | null>(null);
  const [newStatus, setNewStatus] = useState<'P' | 'A'>('P');
  const [correctReason, setCorrectReason] = useState('');
  const [correctLoading, setCorrectLoading] = useState(false);
  const [correctMsg, setCorrectMsg] = useState<string | null>(null);

  // Leave Action Modal State
  const [rejectingLeave, setRejectingLeave] = useState<LeaveApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [leaveActionLoading, setLeaveActionLoading] = useState(false);

  // Reset Password State
  const [resettingRoll, setResettingRoll] = useState<string | null>(null);

  // Fetch Attendance Data
  const fetchData = useCallback(async (isRefresh = false) => {
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

  // Fetch Leaves & Audits
  const fetchLeaves = useCallback(async () => {
    try {
      const res = await fetch('/api/leaves');
      if (res.ok) {
        const json = await res.json();
        setLeaves(json.applications || []);
      }
    } catch {}
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/audit');
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.logs || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    fetchLeaves();
    fetchAuditLogs();
  }, [fetchData, fetchLeaves, fetchAuditLogs]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  // ── SAVE STUDENT PROFILE EDITS ──
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditMsg(null);
    setEditLoading(true);

    try {
      const res = await fetch('/api/students/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll: editingStudent.roll,
          name: editName.trim(),
          phone: editPhone.trim(),
          prn: editPrn.trim(),
          reason: editReason.trim()
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to update student profile');

      setEditMsg({ type: 'success', text: 'Student profile updated successfully in Google Sheets.' });
      fetchData(true);
      fetchAuditLogs();
      setTimeout(() => setEditingStudent(null), 1200);
    } catch (err: any) {
      setEditMsg({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      setEditLoading(false);
    }
  };

  // ── ATTENDANCE CELL OVERRIDE ──
  const handleSaveAttendanceCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingCell) return;
    setCorrectMsg(null);
    setCorrectLoading(true);

    try {
      const res = await fetch('/api/attendance/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          col: correctingCell.column.col,
          roll: correctingCell.student.roll,
          status: newStatus,
          reason: correctReason.trim(),
          year: selectedMonth?.year,
          month: selectedMonth?.month
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to update attendance cell');

      setCorrectingCell(null);
      fetchData(true);
      fetchAuditLogs();
    } catch (err: any) {
      setCorrectMsg(err.message || 'Correction failed');
    } finally {
      setCorrectLoading(false);
    }
  };

  // ── LEAVE APPROVAL & REJECTION ──
  const handleApproveLeave = async (app: LeaveApplication) => {
    setLeaveActionLoading(true);
    try {
      const res = await fetch('/api/leaves/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: app.id,
          remarks: 'Approved by Administrator'
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Approval failed');

      fetchLeaves();
      fetchData(true);
      fetchAuditLogs();
    } catch (err: any) {
      alert(`Approval Error: ${err.message}`);
    } finally {
      setLeaveActionLoading(false);
    }
  };

  const handleRejectLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingLeave) return;
    setLeaveActionLoading(true);

    try {
      const res = await fetch('/api/leaves/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: rejectingLeave.id,
          reason: rejectionReason.trim()
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Rejection failed');

      setRejectingLeave(null);
      setRejectionReason('');
      fetchLeaves();
      fetchData(true);
      fetchAuditLogs();
    } catch (err: any) {
      alert(`Rejection Error: ${err.message}`);
    } finally {
      setLeaveActionLoading(false);
    }
  };

  // ── PASSWORD RESET ──
  const handleResetPassword = async (roll: string) => {
    if (!confirm(`Are you sure you want to reset the password for Roll No. ${roll}? The student will be assigned a temporary password and required to change it.`)) {
      return;
    }
    setResettingRoll(roll);
    try {
      const res = await fetch('/api/students/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roll })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Reset failed');
      alert(`Success: ${json.message}`);
      fetchAuditLogs();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setResettingRoll(null);
    }
  };

  // ── CSV EXPORT (SANITIZED AGAINST FORMULA INJECTION) ──
  const handleExportCSV = () => {
    if (!data?.students || data.students.length === 0) return;

    const sanitizeCell = (val: any) => {
      let str = String(val == null ? '' : val).trim();
      // Prefix dangerous formula injection starters with single quote
      if (/^[=+@-]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['Roll No', 'Student Name', 'PRN', 'Conducted', 'Attended', 'Missed', 'Attendance %', 'Status'];
    const rows = data.students.map((s: any) => [
      sanitizeCell(s.roll),
      sanitizeCell(s.name),
      sanitizeCell(s.prn),
      sanitizeCell(s.totalConducted),
      sanitizeCell(s.totalAttended),
      sanitizeCell(s.totalMissed),
      sanitizeCell(`${s.percent}%`),
      sanitizeCell(s.isDefaulter ? 'Defaulter' : 'Eligible')
    ]);

    const csvContent = [headers.map(sanitizeCell).join(','), ...rows.map((r: any[]) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Report_${selectedMonth?.year || 2026}_${selectedMonth?.month || 10}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    return data.students.filter((s: any) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roll.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.prn.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (attendanceFilter === 'defaulters') return s.isDefaulter;
      if (attendanceFilter === 'top') return s.isTopPerformer;
      return true;
    });
  }, [data?.students, searchQuery, attendanceFilter]);

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
          <Loader2 size={36} className="animate-spin" color="var(--accent-teal)" style={{ marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '15px' }}>
            Loading class attendance registers...
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Synchronizing live records from Google Sheets
          </p>
        </div>
      </div>
    );
  }

  const overview = data?.overview;
  const columns: LectureColumn[] = data?.columns || [];

  return (
    <div className="dashboard-layout" style={{ position: 'relative', overflow: 'hidden' }}>
      
      {/* Ambient Floating Glow Backdrop */}
      <div className="ambient-glow-wrapper">
        <div className="glow-orb-teal" />
        <div className="glow-orb-blue" />
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
              <p style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 700 }}>Administrator Hub</p>
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

        {/* Admin Badge */}
        <div className="neu-card-sm" style={{ padding: '14px', marginBottom: '24px', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-teal)', flexShrink: 0 }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Faculty / HOD</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Class Teacher: Prof. S. Suman</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {[
            { id: 'overview', label: 'Class Overview & Analytics', icon: Activity },
            { id: 'students', label: 'Student Directory (73)', icon: Users },
            { id: 'attendance', label: 'Attendance Management', icon: Calendar },
            { id: 'leaves', label: `Leave Queue (${leaves.filter(l => l.status === 'Pending').length})`, icon: FileText },
            { id: 'audit', label: 'Audit Trail', icon: Clock }
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
                  color: active ? 'var(--accent-teal)' : 'var(--text-secondary)',
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

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(200, 208, 222, 0.4)', paddingTop: '16px' }}>
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
              <span style={{ fontSize: '13px', fontWeight: 800 }}>Admin Portal</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-approved" style={{ fontSize: '11px', padding: '3px 8px' }}>
              Admin
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

        {/* Header Bar */}
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.35rem, 4.5vw, 1.75rem)', marginBottom: '4px' }}>
              {activeTab === 'overview' && 'Class Overview & Performance Analytics'}
              {activeTab === 'students' && 'Enrolled Students Directory'}
              {activeTab === 'attendance' && 'Daily Attendance Cell Management'}
              {activeTab === 'leaves' && 'Formal Leave Approval Center'}
              {activeTab === 'audit' && 'Immutable Administrative Audit Trail'}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Final Year B.Tech (Division B) | Electronics & Telecommunication | YSPM Satara
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

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="neu-btn"
              style={{ padding: '8px 14px', fontSize: '12px' }}
              title="Export sanitized CSV register"
            >
              <Download size={14} /> Export CSV
            </button>

            {/* Sync Refresh */}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="neu-btn"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: CLASS OVERVIEW & ANALYTICS
            ───────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="tab-transition">
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '16px', marginBottom: '24px' }}>
              
              <div className="neu-card interactive-card animate-slide-up delay-1" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Students</span>
                  <Users size={18} color="var(--accent-primary)" />
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{overview?.totalStudents || 73}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Roll 25 to 97 Enrolled</div>
              </div>

              <div className="neu-card interactive-card animate-slide-up delay-2" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Class Average</span>
                  <CheckCircle size={18} color="#16a34a" />
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>
                  {overview?.classAveragePercent}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Overall Attendance</div>
              </div>

              <div className="neu-card interactive-card animate-slide-up delay-3" style={{ padding: '22px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>Defaulters (&lt;75%)</span>
                  <AlertTriangle size={18} color="#dc2626" />
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
                  {overview?.defaulterCount}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Requires Warning Notice</div>
              </div>

              <div className="neu-card interactive-card animate-slide-up delay-4" style={{ padding: '22px', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#047857' }}>Top Performers (≥90%)</span>
                  <Award size={18} color="#047857" />
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#047857', lineHeight: 1 }}>
                  {overview?.topPerformerCount}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Excellent Standing</div>
              </div>

              <div className="neu-card interactive-card animate-slide-up delay-5" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Lectures Conducted</span>
                  <Clock size={18} color="var(--accent-teal)" />
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>
                  {overview?.totalConductedLectures}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Out of {overview?.totalScheduledLectures} scheduled
                </div>
              </div>
            </div>

            {/* Defaulters Notice Table */}
            <div className="neu-card interactive-card" style={{ padding: '24px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={20} /> Defaulter Notice Board (Attendance &lt; 75%)
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Students with attendance below institutional minimum. Automatically calculated from live Google Sheets.
                  </p>
                </div>
                <span className="badge badge-defaulter pulse-badge-defaulter">{overview?.defaulterCount} Students</span>
              </div>

              <div className="mobile-swipe-hint">
                <span>⇄ Swipe horizontally to see PRN & shortfall</span>
              </div>
              <div className="table-responsive-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(200, 208, 222, 0.6)' }}>
                      <th style={{ padding: '10px' }}>Roll</th>
                      <th style={{ padding: '10px' }}>Student Name</th>
                      <th style={{ padding: '10px' }}>PRN</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Attended / Held</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Current %</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Shortfall for 75%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.filter((s: any) => s.isDefaulter).length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                          ✓ No students currently in defaulter status. Class performance is optimal.
                        </td>
                      </tr>
                    ) : (
                      data.students
                        .filter((s: any) => s.isDefaulter)
                        .map((s: any) => (
                          <tr key={s.roll} className="interactive-row" style={{ borderBottom: '1px solid rgba(200, 208, 222, 0.3)' }}>
                            <td style={{ padding: '10px', fontWeight: 700 }}>{s.roll}</td>
                            <td style={{ padding: '10px', fontWeight: 600 }}>{s.name}</td>
                            <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{s.prn}</td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>{s.totalAttended} / {s.totalConducted}</td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              <span className="badge badge-defaulter">{s.percent}%</span>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>
                              Need {s.needed75} lecture(s)
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: STUDENT DIRECTORY
            ───────────────────────────────────────────────────────────── */}
        {activeTab === 'students' && (
          <div className="tab-transition">
            <div className="neu-card" style={{ padding: '24px' }}>
              {/* Search & Filter Toolbar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div className="neu-inset" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: 'var(--radius-sm)', maxWidth: '100%', width: '100%', flex: 1, minWidth: '220px' }}>
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, roll, PRN..."
                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: 'var(--text-primary)' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(['all', 'defaulters', 'top'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setAttendanceFilter(filter)}
                      className="neu-btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: attendanceFilter === filter ? 'var(--bg-input)' : 'var(--bg-card)',
                        boxShadow: attendanceFilter === filter ? 'var(--neu-inset-sm)' : 'var(--neu-raised-sm)',
                        color: attendanceFilter === filter ? 'var(--accent-teal)' : 'var(--text-secondary)'
                      }}
                    >
                      {filter === 'all' && 'All Students'}
                      {filter === 'defaulters' && 'Defaulters (<75%)'}
                      {filter === 'top' && 'Top Performers (≥90%)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Students Table */}
              <div className="mobile-swipe-hint">
                <span>⇄ Swipe horizontally to see PRN & actions</span>
              </div>
              <div className="table-responsive-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '660px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(200, 208, 222, 0.6)' }}>
                      <th style={{ padding: '12px 10px' }}>Roll</th>
                      <th style={{ padding: '12px 10px' }}>Student Name</th>
                      <th style={{ padding: '12px 10px' }}>PRN</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>Attended / Held</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>Attendance %</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s: any) => (
                      <tr key={s.roll} className="interactive-row" style={{ borderBottom: '1px solid rgba(200, 208, 222, 0.3)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 700 }}>{s.roll}</td>
                        <td style={{ padding: '12px 10px', fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>{s.prn}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>{s.totalAttended} / {s.totalConducted}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700 }}>
                          <span className={`badge ${s.isDefaulter ? 'badge-defaulter' : 'badge-present'}`}>
                            {s.percent}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {s.isDefaulter ? (
                            <span style={{ color: '#dc2626', fontSize: '11px', fontWeight: 700 }}>Defaulter</span>
                          ) : s.isTopPerformer ? (
                            <span style={{ color: '#047857', fontSize: '11px', fontWeight: 700 }}>Top Performer</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Good</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              onClick={() => {
                                setEditingStudent(s);
                                setEditName(s.name);
                                setEditPhone(s.phone || '');
                                setEditPrn(s.prn);
                                setEditReason('');
                                setEditMsg(null);
                              }}
                              className="neu-btn"
                              style={{ padding: '6px 10px', fontSize: '11px' }}
                              title="Edit Profile"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              onClick={() => handleResetPassword(s.roll)}
                              disabled={resettingRoll === s.roll}
                              className="neu-btn"
                              style={{ padding: '6px 10px', fontSize: '11px' }}
                              title="Reset Password"
                            >
                              <Key size={13} /> {resettingRoll === s.roll ? 'Resetting...' : 'Reset'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: ATTENDANCE MANAGEMENT (CELL CORRECTION)
            ───────────────────────────────────────────────────────────── */}
        {activeTab === 'attendance' && (
          <div className="tab-transition">
            <div className="neu-card" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Lecture-Wise Class Attendance Register</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Click on any cell to update attendance (Present / Absent). All changes require a justification reason and are committed directly to Google Sheets with full audit logging.
                </p>
              </div>

              <div className="mobile-swipe-hint">
                <span>⇄ Swipe horizontally to scroll across all lectures</span>
              </div>
              <div className="table-responsive-container" style={{ maxHeight: '680px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
                    <tr style={{ borderBottom: '2px solid rgba(200, 208, 222, 0.8)' }}>
                      <th style={{ padding: '10px 8px', minWidth: '50px', position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 12 }}>Roll</th>
                      <th style={{ padding: '10px 8px', minWidth: '170px', position: 'sticky', left: '50px', background: 'var(--bg-card)', zIndex: 12, boxShadow: '2px 0 6px rgba(0,0,0,0.06)' }}>Name</th>
                      {columns.map((col, idx) => (
                        <th key={idx} style={{ padding: '8px', minWidth: '70px', textAlign: 'center', borderLeft: '1px solid rgba(200, 208, 222, 0.4)' }}>
                          <div style={{ fontWeight: 700 }}>{col.dayName} {col.date}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{col.label}</div>
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{col.time || ''}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.students?.map((s: any) => (
                      <tr key={s.roll} style={{ borderBottom: '1px solid rgba(200, 208, 222, 0.3)' }}>
                        <td style={{ padding: '8px', fontWeight: 700, position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 5 }}>{s.roll}</td>
                        <td style={{ padding: '8px', fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', left: '50px', background: 'var(--bg-card)', zIndex: 5, boxShadow: '2px 0 6px rgba(0,0,0,0.06)' }}>{s.name}</td>
                        {columns.map((col, cIdx) => {
                          const val = s.cells ? s.cells[cIdx] : '';
                          const isHoliday = col.nonWorking;

                          if (isHoliday) {
                            return (
                              <td key={cIdx} style={{ padding: '8px', textAlign: 'center', background: 'rgba(0,0,0,0.02)', color: 'var(--text-muted)' }}>
                                —
                              </td>
                            );
                          }

                          return (
                            <td key={cIdx} style={{ padding: '4px', textAlign: 'center', borderLeft: '1px solid rgba(200, 208, 222, 0.3)' }}>
                              <button
                                onClick={() => {
                                  setCorrectingCell({
                                    student: s,
                                    column: col,
                                    colIndex: cIdx,
                                    currentStatus: val || '-'
                                  });
                                  setNewStatus(val === 'P' ? 'A' : 'P');
                                  setCorrectReason('');
                                  setCorrectMsg(null);
                                }}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  background: val === 'P' ? 'var(--status-present-bg)' : val === 'A' ? 'var(--status-absent-bg)' : 'transparent',
                                  color: val === 'P' ? 'var(--status-present-text)' : val === 'A' ? 'var(--status-absent-text)' : 'var(--text-muted)',
                                  boxShadow: val ? 'var(--neu-raised-sm)' : 'none',
                                  transition: 'transform 0.1s ease'
                                }}
                                title={`Click to edit ${s.name} on ${col.dayName} ${col.date}`}
                              >
                                {val || '·'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: LEAVE MANAGEMENT (APPROVAL QUEUE)
            ───────────────────────────────────────────────────────────── */}
        {activeTab === 'leaves' && (
          <div className="tab-transition">
            <div className="neu-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Leave Requests Queue</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Approving a leave will automatically mark ALL lectures for that student on the requested date as Present in Google Sheets.
                  </p>
                </div>
                <span className="badge badge-pending">
                  {leaves.filter((l) => l.status === 'Pending').length} Pending
                </span>
              </div>

              {leaves.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <FileText size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                  <p>No leave applications in queue.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {leaves.map((app) => (
                    <div
                      key={app.id}
                      className="neu-card-sm"
                      style={{ padding: '20px', background: 'var(--bg-card)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700 }}>{app.studentName}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Roll: {app.rollNo} | PRN: {app.prn} | Requested Date: <strong>{app.date || (app as any).startDate}</strong>
                          </div>
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

                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', background: 'rgba(0,0,0,0.02)', padding: '10px 14px', borderRadius: '6px' }}>
                        <strong>Reason:</strong> {app.reason}
                      </p>

                      {app.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setRejectingLeave(app);
                              setRejectionReason('');
                            }}
                            disabled={leaveActionLoading}
                            className="neu-btn neu-btn-danger"
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                          >
                            <X size={15} /> Reject
                          </button>
                          <button
                            onClick={() => handleApproveLeave(app)}
                            disabled={leaveActionLoading}
                            className="neu-btn neu-btn-primary"
                            style={{ padding: '8px 16px', fontSize: '13px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                          >
                            <Check size={15} /> Approve (Mark All Present)
                          </button>
                        </div>
                      )}

                      {app.status === 'Approved' && (
                        <div style={{ fontSize: '12px', color: '#047857' }}>
                          ✓ Approved. All lectures on that date were atomically marked Present in Google Sheets.
                        </div>
                      )}

                      {app.status === 'Rejected' && app.rejectionReason && (
                        <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                          Rejection Reason: {app.rejectionReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: AUDIT TRAIL
            ───────────────────────────────────────────────────────────── */}
        {activeTab === 'audit' && (
          <div className="tab-transition">
            <div className="neu-card" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Administrative Audit Log</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Chronological record of every attendance cell modification, profile change, and leave decision.
                </p>
              </div>

              <div className="mobile-swipe-hint">
                <span>⇄ Swipe horizontally to inspect full audit entries</span>
              </div>
              <div className="table-responsive-container" style={{ maxHeight: '600px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', minWidth: '700px' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                    <tr style={{ borderBottom: '2px solid rgba(200, 208, 222, 0.6)' }}>
                      <th style={{ padding: '10px' }}>Timestamp</th>
                      <th style={{ padding: '10px' }}>Actor</th>
                      <th style={{ padding: '10px' }}>Action</th>
                      <th style={{ padding: '10px' }}>Target</th>
                      <th style={{ padding: '10px' }}>Previous</th>
                      <th style={{ padding: '10px' }}>New</th>
                      <th style={{ padding: '10px' }}>Justification Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No audit log entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log, idx) => (
                        <tr key={idx} className="interactive-row" style={{ borderBottom: '1px solid rgba(200, 208, 222, 0.3)' }}>
                          <td style={{ padding: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                          <td style={{ padding: '10px', fontWeight: 600 }}>{log.adminId}</td>
                          <td style={{ padding: '10px', fontWeight: 700, color: 'var(--accent-teal)' }}>{log.action}</td>
                          <td style={{ padding: '10px' }}>{log.targetStudentName || log.targetPrn || '—'}</td>
                          <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{log.previousStatus || '—'}</td>
                          <td style={{ padding: '10px', fontWeight: 600 }}>{log.newStatus || '—'}</td>
                          <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{log.reason || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: EDIT STUDENT PROFILE
          ───────────────────────────────────────────────────────────── */}
      {editingStudent && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
          <div className="neu-card modal-dialog" style={{ maxWidth: '440px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>Edit Student: Roll {editingStudent.roll}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Changes will write back directly to the Google Sheets register and reflect immediately.
            </p>

            {editMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  marginBottom: '16px',
                  background: editMsg.type === 'success' ? 'var(--status-approved-bg)' : 'var(--status-defaulter-bg)',
                  color: editMsg.type === 'success' ? 'var(--status-approved-text)' : 'var(--status-defaulter-text)'
                }}
              >
                {editMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveStudent}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Student Full Name
                </label>
                <input
                  type="text"
                  required
                  className="neu-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Permanent Registration Number (PRN)
                </label>
                <input
                  type="text"
                  required
                  className="neu-input"
                  value={editPrn}
                  onChange={(e) => setEditPrn(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Parent Mobile Phone (10 digits)
                </label>
                <input
                  type="tel"
                  pattern="[0-9]{10}"
                  placeholder="10-digit number"
                  className="neu-input"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Reason for Update (Audit trail)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Corrected spelling per university marksheet"
                  className="neu-input"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="neu-btn"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="neu-btn neu-btn-primary"
                  style={{ flex: 1 }}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: ATTENDANCE CELL OVERRIDE (JUSTIFICATION MANDATORY)
          ───────────────────────────────────────────────────────────── */}
      {correctingCell && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
          <div className="neu-card modal-dialog" style={{ maxWidth: '420px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>Attendance Override</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Student: <strong>{correctingCell.student.name}</strong> (Roll {correctingCell.student.roll})<br />
              Lecture: {correctingCell.column.label} ({correctingCell.column.dayName} {correctingCell.column.date})
            </p>

            {correctMsg && (
              <div style={{ padding: '10px', background: 'var(--status-defaulter-bg)', color: 'var(--status-defaulter-text)', borderRadius: '6px', fontSize: '12px', marginBottom: '14px' }}>
                {correctMsg}
              </div>
            )}

            <form onSubmit={handleSaveAttendanceCorrection}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  New Attendance Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setNewStatus('P')}
                    className="neu-btn"
                    style={{
                      padding: '10px',
                      background: newStatus === 'P' ? 'var(--status-present-bg)' : 'var(--bg-card)',
                      color: newStatus === 'P' ? 'var(--status-present-text)' : 'var(--text-secondary)',
                      borderColor: newStatus === 'P' ? '#16a34a' : 'transparent',
                      fontWeight: 700
                    }}
                  >
                    Present (P)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('A')}
                    className="neu-btn"
                    style={{
                      padding: '10px',
                      background: newStatus === 'A' ? 'var(--status-absent-bg)' : 'var(--bg-card)',
                      color: newStatus === 'A' ? 'var(--status-absent-text)' : 'var(--text-secondary)',
                      borderColor: newStatus === 'A' ? '#dc2626' : 'transparent',
                      fontWeight: 700
                    }}
                  >
                    Absent (A)
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Mandatory Justification Reason
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Biometric scanner offline / Verified medical slip"
                  className="neu-input"
                  value={correctReason}
                  onChange={(e) => setCorrectReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCorrectingCell(null)}
                  className="neu-btn"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correctLoading}
                  className="neu-btn neu-btn-primary"
                  style={{ flex: 1 }}
                >
                  {correctLoading ? 'Writing...' : 'Commit to Sheets'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: LEAVE REJECTION REASON
          ───────────────────────────────────────────────────────────── */}
      {rejectingLeave && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
          <div className="neu-card modal-dialog" style={{ maxWidth: '400px', width: '100%', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>Reject Leave Application</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Student: {rejectingLeave.studentName} (Roll {rejectingLeave.rollNo})<br />
              Requested Date: {rejectingLeave.date || (rejectingLeave as any).startDate}
            </p>

            <form onSubmit={handleRejectLeave}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Rejection Reason (Visible to Student)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Incomplete documentation / Date conflicts with university midterm"
                  className="neu-input"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRejectingLeave(null)}
                  className="neu-btn"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leaveActionLoading}
                  className="neu-btn neu-btn-danger"
                  style={{ flex: 1 }}
                >
                  {leaveActionLoading ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
