import Link from 'next/link';
import Image from 'next/image';
import { GraduationCap, ShieldCheck, CheckCircle2, Cpu, Calendar, Clock } from 'lucide-react';

export default function LandingPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', position: 'relative', overflow: 'hidden' }}>
      
      {/* Ambient Floating Glow Backdrop */}
      <div className="ambient-glow-wrapper">
        <div className="glow-orb-blue" />
        <div className="glow-orb-teal" />
        <div className="glow-orb-indigo" />
      </div>

      <div style={{ maxWidth: '960px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        
        {/* College Logo */}
        <div
          className="neu-card-sm animate-slide-down"
          style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center', gap: '14px', marginBottom: '24px', background: 'var(--bg-card)', maxWidth: '100%', boxSizing: 'border-box', textAlign: 'left' }}
        >
          <div style={{ position: 'relative', width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', boxShadow: 'var(--neu-inset-sm)', flexShrink: 0 }}>
            <Image
              src="/logo.jpg"
              alt="YSPM Logo"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <div>
            <div style={{ fontSize: 'clamp(11px, 2.8vw, 13px)', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3 }}>
              Yashoda Technical Campus, Satara (YSPM)
            </div>
            <div style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
              Faculty of Engineering | Dept. of Electronics & Telecommunication
            </div>
          </div>
        </div>

        {/* Title & Banner */}
        <h1
          className="animate-slide-up delay-1"
          style={{ fontSize: 'clamp(1.75rem, 6vw, 3.25rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px', lineHeight: 1.15 }}
        >
          Smart Attendance System
        </h1>
        <p
          className="animate-slide-up delay-2"
          style={{ fontSize: 'clamp(0.9rem, 3vw, 1.15rem)', color: 'var(--text-secondary)', maxWidth: '680px', marginBottom: '32px', padding: '0 8px' }}
        >
          Real-time biometric attendance tracking, automated leave workflows, and 75% eligibility prediction for <strong>Final Year B.Tech (Division B)</strong> — Academic Year 2026–27.
        </p>

        {/* Two Clearly Distinct Login Options */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', width: '100%', maxWidth: '760px', marginBottom: '36px' }}>
          
          {/* Student Login Card */}
          <Link
            href="/login?role=student"
            className="neu-card interactive-card animate-scale-in delay-3"
            style={{ textDecoration: 'none', padding: '36px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer' }}
          >
            <div
              className="neu-card-sm"
              style={{ width: '74px', height: '74px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: 'var(--accent-primary)', background: 'var(--bg-card)', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              <GraduationCap size={38} />
            </div>
            <h2 style={{ fontSize: '1.45rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Student Portal</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', flex: 1, lineHeight: 1.6 }}>
              Access your personal attendance register, subject-wise statistics, 75% shortfall predictor, and submit leave applications.
            </p>
            <span className="neu-btn neu-btn-primary" style={{ width: '100%' }}>
              Student Login (PRN)
            </span>
          </Link>

          {/* Admin Login Card */}
          <Link
            href="/login?role=admin"
            className="neu-card interactive-card animate-scale-in delay-4"
            style={{ textDecoration: 'none', padding: '36px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer' }}
          >
            <div
              className="neu-card-sm"
              style={{ width: '74px', height: '74px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: 'var(--accent-teal)', background: 'var(--bg-card)', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              <ShieldCheck size={38} />
            </div>
            <h2 style={{ fontSize: '1.45rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Faculty & Admin</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', flex: 1, lineHeight: 1.6 }}>
              Comprehensive class analytics, live attendance management, atomic leave approval queue, and immutable audit logs.
            </p>
            <span className="neu-btn neu-btn-accent" style={{ width: '100%' }}>
              Administrator Login
            </span>
          </Link>
        </div>

        {/* Feature Highlights Pills */}
        <div
          className="animate-fade-in delay-5"
          style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', maxWidth: '820px' }}
        >
          <div className="neu-card-sm" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span className="live-dot-blue" />
            <Cpu size={16} color="var(--accent-primary)" /> ESP8266 Biometric Hardware
          </div>
          <div className="neu-card-sm" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span className="live-dot-green" />
            <CheckCircle2 size={16} color="#16a34a" /> Live Two-Way Google Sheets Sync
          </div>
          <div className="neu-card-sm" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <Clock size={16} color="#d97706" /> 75% Attendance Defaulter Shield
          </div>
          <div className="neu-card-sm" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <Calendar size={16} color="#7c3aed" /> Atomic Leave Approval
          </div>
        </div>

      </div>
    </main>
  );
}
