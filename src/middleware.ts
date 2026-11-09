import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'smart_attendance_session';
const JWT_SECRET = process.env.JWT_SECRET || 'c21hcnQtYXR0ZW5kYW5jZS1zZWNyZXQta2V5LTIwMjYtMjAyNy15c3Bt';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. CSRF Protection for state-changing API endpoints
  if (pathname.startsWith('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    // Strict origin check: if origin header is present, it must match host
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json(
            { error: 'CSRF_BLOCKED', message: 'Cross-origin request rejected' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'CSRF_BLOCKED', message: 'Malformed origin header' },
          { status: 403 }
        );
      }
    }
  }

  // 2. Route Protection for Protected Dashboards
  if (pathname.startsWith('/admin') || pathname.startsWith('/student')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      const role = payload.role;

      if (pathname.startsWith('/admin') && role !== 'admin') {
        return NextResponse.redirect(new URL('/student', request.url));
      }

      if (pathname.startsWith('/student') && role !== 'student' && role !== 'admin') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch {
      // Invalid or expired token
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
  }

  // If already authenticated and visiting /login or root landing page, redirect to their role dashboard
  if (pathname === '/login') {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        if (payload.role === 'admin') {
          return NextResponse.redirect(new URL('/admin', request.url));
        } else if (payload.role === 'student') {
          return NextResponse.redirect(new URL('/student', request.url));
        }
      } catch {
        // Continue to login
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/student/:path*', '/login', '/api/:path*']
};
