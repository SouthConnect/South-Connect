const { withSentryConfig } = require('@sentry/nextjs');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js inline scripts need 'unsafe-inline'; lock down with a nonce in a future pass
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // Allow images from Supabase storage, Unsplash fallbacks and data URIs
      "img-src 'self' data: https:",
      // API, WebSocket (ws/wss) and Sentry ingest
      `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'} ${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'} https://*.sentry.io https://*.ingest.sentry.io`,
      "font-src 'self' https:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Sentry organisation & project (used for source-map upload during build)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for source-map upload — set in CI, not needed in dev
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress the "Sentry SDK is not configured" warning when DSN is absent
  silent: true,

  // Upload source maps only in production builds so stack traces are readable
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,

  // Automatic instrumentation of Next.js server-side features
  autoInstrumentServerFunctions: true,
});
