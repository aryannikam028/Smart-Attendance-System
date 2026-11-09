import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { CONFIG, getJwtSecretKey } from './config';
import type { SessionUser } from './types';

const COOKIE_NAME = 'smart_attendance_session';
const SESSION_EXPIRATION = '7d'; // 7 days persistent session token

export async function createSessionToken(user: SessionUser): Promise<string> {
  const secretKey = getJwtSecretKey();
  const token = await new SignJWT({
    role: user.role,
    prn: user.prn || '',
    name: user.name || '',
    roll: user.roll || '',
    adminId: user.adminId || '',
    gasToken: user.gasToken || ''
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION)
    .sign(secretKey);

  return token;
}

export async function setSessionCookie(user: SessionUser) {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUser(request?: Request): Promise<SessionUser | null> {
  try {
    let token: string | undefined;

    if (request) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`(^|;\\s*)${COOKIE_NAME}=([^;]*)`));
      token = match ? decodeURIComponent(match[2]) : undefined;
    } else {
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    }

    if (!token) return null;

    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey);

    return {
      role: payload.role as 'student' | 'admin',
      prn: payload.prn ? String(payload.prn) : undefined,
      name: payload.name ? String(payload.name) : undefined,
      roll: payload.roll ? String(payload.roll) : undefined,
      adminId: payload.adminId ? String(payload.adminId) : undefined,
      gasToken: payload.gasToken ? String(payload.gasToken) : undefined
    };
  } catch {
    return null;
  }
}

// Constant-time string comparison to prevent timing attacks
export function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) {
      // Compare dummy buffer to maintain constant time
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Password hashing helper (bcrypt with 10 salt rounds)
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPasswordHash(plainText: string, hashOrPlain: string): Promise<boolean> {
  if (hashOrPlain.startsWith('$2a$') || hashOrPlain.startsWith('$2b$')) {
    return bcrypt.compare(plainText, hashOrPlain);
  }
  // Fallback for existing plaintext sheet passwords with constant-time comparison
  return timingSafeCompare(plainText, hashOrPlain);
}
