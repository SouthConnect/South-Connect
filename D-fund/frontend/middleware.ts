import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side route protection.
 *
 * If a request arrives for a protected path without an access_token cookie
 * the user is redirected to /login immediately — no client-side flash.
 *
 * Public paths (auth pages, landing, explore) are always accessible.
 * Admin paths additionally require the request to carry a token; role
 * enforcement happens on the backend — the middleware only checks presence.
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

// Paths that are always public (no redirect even without a token)
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === '/') {
    return NextResponse.next();
  }

  // Check if this path needs protection
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for access_token cookie (set by the backend as HttpOnly)
  const token = request.cookies.get('access_token');

  if (!token?.value) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the intended destination so we can redirect back after login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all paths except static assets and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
