import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from 'jose';

/**
 * Server-side route protection.
 *
 * Checks cookie presence + expiry only — does NOT verify the JWT signature.
 * This avoids sharing JWT_SECRET with the frontend (Edge runtime).
 * True authentication is enforced by the backend on every API call (401 → redirect).
 * Admin paths additionally require role=ADMIN in the decoded payload.
 */

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/my-opportunities',
  '/applications',
  '/notifications',
  '/referral',
  '/saved',
  '/chat',
  '/profile',
  '/admin',
  '/analytics',
  '/resources',
  '/settings',
  '/tasks',
];

const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/unsubscribe',
  '/auth',
  '/opportunities',
  '/profiles',
  '/explore',
  '/community',
  '/features',
  '/event',
  '/_next',
  '/favicon',
  '/api',
];

interface JwtPayload {
  userId?: string;
  role?: string;
  exp?: number;
}

function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = decodeJwt(token) as JwtPayload;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root is always public
  if (pathname === '/') return NextResponse.next();

  // Explicitly public paths — no token needed
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Unknown paths not in PROTECTED list: also check token (fail-closed)
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  const tokenCookie = request.cookies.get('access_token');

  // No cookie at all → definitely logged out → redirect immediately
  if (!tokenCookie?.value) {
    if (!isProtected) return NextResponse.next();
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cookie exists but may be expired → decode without hard-redirecting.
  // If expired, the client will silently refresh via /auth/refresh.
  // AppShell handles the redirect to /login if the refresh also fails.
  const payload = decodeToken(tokenCookie.value);

  // Admin routes: always require a valid, non-expired ADMIN token
  if (pathname.startsWith('/admin')) {
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
