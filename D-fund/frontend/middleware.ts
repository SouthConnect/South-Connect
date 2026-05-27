import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Server-side route protection.
 *
 * Protected paths require a valid, signature-verified access_token cookie.
 * Admin paths additionally require role=ADMIN in the JWT payload.
 *
 * Unrecognised paths not explicitly listed as public are blocked by default
 * (fail-closed) to prevent accidental exposure of new routes.
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

async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as JwtPayload;
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
  if (!tokenCookie?.value) {
    if (!isProtected) return NextResponse.next(); // static assets, etc.
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(tokenCookie.value);

  if (!payload) {
    if (!isProtected) return NextResponse.next();
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes require ADMIN role
  if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
