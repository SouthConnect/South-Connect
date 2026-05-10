import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

/**
 * Server-side route protection.
 *
 * Protected paths require a valid access_token cookie.
 * Admin paths additionally require the decoded JWT to carry role=ADMIN —
 * this is a defence-in-depth check; the backend always enforces roles too.
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
];

const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
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
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/') {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const tokenCookie = request.cookies.get('access_token');
  if (!tokenCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode the JWT (no verification — edge runtime can't import crypto easily;
  // the backend always verifies the signature on every API call).
  const payload = decodeToken(tokenCookie.value);

  // Token is present but malformed / expired — send to login
  if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes: require ADMIN role
  if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
