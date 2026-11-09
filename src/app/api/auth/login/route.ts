import { NextResponse } from 'next/server';
import { z } from 'zod';
import { setSessionCookie, timingSafeCompare } from '@/lib/auth';
import { checkRateLimit, resetRateLimit, getClientIp } from '@/lib/rateLimit';
import { callAppsScript, getAdminGasToken } from '@/lib/gasClient';
import { CONFIG } from '@/lib/config';

const loginSchema = z.object({
  role: z.enum(['student', 'admin']),
  username: z.string().min(1).max(50).trim(),
  password: z.string().min(1).max(100)
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    
    // 1. Strict rate limit on login attempts: max 5 attempts per 5 minutes, 10 min lockout
    const rateCheck = checkRateLimit(`login_${ip}`, {
      windowMs: 5 * 60 * 1000,
      maxAttempts: 5,
      lockoutMs: 10 * 60 * 1000
    });

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'TOO_MANY_REQUESTS',
          message: `Too many failed login attempts. Please try again after ${rateCheck.retryAfterSeconds} seconds.`
        },
        { status: 429 }
      );
    }

    // 2. Validate request payload schema with Zod
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Please provide valid credentials.' },
        { status: 400 }
      );
    }

    const { role, username, password } = parsed.data;

    // 3. ADMIN AUTHENTICATION
    if (role === 'admin') {
      const isUserMatch = timingSafeCompare(username, CONFIG.adminUsername);
      const isPassMatch = timingSafeCompare(password, CONFIG.adminPassword);

      if (!isUserMatch || !isPassMatch) {
        // Return generic error (no user enumeration)
        return NextResponse.json(
          { error: 'AUTH_FAILED', message: 'Invalid credentials. Please verify your ID and password.' },
          { status: 401 }
        );
      }

      resetRateLimit(`login_${ip}`);
      const adminGasToken = await getAdminGasToken();

      await setSessionCookie({
        role: 'admin',
        name: 'Administrator',
        adminId: CONFIG.adminUsername,
        gasToken: adminGasToken || undefined
      });

      return NextResponse.json({
        success: true,
        user: { role: 'admin', name: 'Administrator' }
      });
    }

    // 4. STUDENT AUTHENTICATION (Verified against Google Sheets)
    const gasResponse = await callAppsScript('login', {
      role: 'student',
      username,
      password
    });

    if (!gasResponse.success || !gasResponse.data || gasResponse.data.ok === false) {
      return NextResponse.json(
        { error: 'AUTH_FAILED', message: 'Invalid credentials. Please verify your PRN and password.' },
        { status: 401 }
      );
    }

    const studentData = gasResponse.data;
    resetRateLimit(`login_${ip}`);

    await setSessionCookie({
      role: 'student',
      prn: username,
      roll: String(studentData.roll || ''),
      name: String(studentData.name || 'Student'),
      gasToken: studentData.token ? String(studentData.token) : undefined
    });

    return NextResponse.json({
      success: true,
      user: {
        role: 'student',
        prn: username,
        roll: studentData.roll,
        name: studentData.name
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}
