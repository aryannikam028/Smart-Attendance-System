'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { GraduationCap, ShieldCheck, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'student';
  const [role, setRole] = useState<'student' | 'admin'>(initialRole);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'admin') setRole('admin');
    else if (roleParam === 'student') setRole('student');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          username: username.trim(),
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Invalid credentials. Please try again.');
      }

      if (role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/student');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative', overflow: 'hidden' }}>
      
      {/* Ambient Floating Glow Backdrop */}
      <div className="ambient-glow-wrapper">
        <div className="glow-orb-blue" />
        <div className="glow-orb-teal" />
        <div className="glow-orb-indigo" />
      </div>

      {/* Back button */}
      <div className="animate-slide-down" style={{ maxWidth: '440px', width: '100%', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
        <Link
          href="/"
          className="neu-btn"
          style={{ textDecoration: 'none', display: 'inline-flex', padding: '8px 14px', fontSize: '13px' }}
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>

      <div className="neu-card animate-scale-in" style={{ maxWidth: '440px', width: '100%', padding: 'clamp(24px, 5vw, 36px) clamp(16px, 5vw, 32px)', position: 'relative', zIndex: 1 }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ position: 'relative', width: '54px', height: '54px', margin: '0 auto 12px auto', borderRadius: '50%', overflow: 'hidden', boxShadow: 'var(--neu-inset-sm)' }}>
            <Image
              src="/logo.jpg"
              alt="YSPM Logo"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <h1 style={{ fontSize: '1.65rem', marginBottom: '4px' }}>Smart Attendance</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Final Year B.Tech (Div B) — Sem VII
          </p>
        </div>

        {/* Role Toggle Switch */}
        <div
          className="neu-inset"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '4px', gap: '4px', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }}
        >
          <button
            type="button"
            onClick={() => { setRole('student'); setError(null); }}
            style={{
              padding: '10px 14px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: role === 'student' ? 'var(--bg-card)' : 'transparent',
              color: role === 'student' ? 'var(--accent-primary)' : 'var(--text-muted)',
              boxShadow: role === 'student' ? 'var(--neu-raised-sm)' : 'none'
            }}
          >
            <GraduationCap size={18} /> Student
          </button>

          <button
            type="button"
            onClick={() => { setRole('admin'); setError(null); }}
            style={{
              padding: '10px 14px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: role === 'admin' ? 'var(--bg-card)' : 'transparent',
              color: role === 'admin' ? 'var(--accent-teal)' : 'var(--text-muted)',
              boxShadow: role === 'admin' ? 'var(--neu-raised-sm)' : 'none'
            }}
          >
            <ShieldCheck size={18} /> Admin
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: 'var(--status-defaulter-bg)',
              border: '1px solid var(--status-defaulter-border)',
              color: 'var(--status-defaulter-text)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              {role === 'student' ? 'Permanent Registration Number (PRN)' : 'Admin ID'}
            </label>
            <input
              type="text"
              required
              className="neu-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={role === 'student' ? 'e.g. 23067571372008' : 'admin'}
              autoComplete={role === 'student' ? 'username' : 'username'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              className="neu-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`neu-btn ${role === 'student' ? 'neu-btn-primary' : 'neu-btn-accent'}`}
            style={{ width: '100%', padding: '12px', fontSize: '15px' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Authenticating...
              </>
            ) : (
              role === 'student' ? 'Sign in as Student' : 'Sign in as Administrator'
            )}
          </button>
        </form>

        {role === 'student' && (
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
            Note: Initial password is provided in your class attendance register (<code>pass[roll]</code>). Contact class teacher Prof. Subhash Suman if you require a reset.
          </div>
        )}

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={36} className="animate-spin" color="var(--accent-primary)" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
