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
      // API and WebSocket — both point to the backend (cross-origin in dev, same proxy in prod).
      // Include both http:// and ws:// variants for socket.io (HTTP polling handshake + WS upgrade).
      (() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const apiOrigin = apiUrl.replace(/\/api\/v1$/, '');
        const wsOrigin = process.env.NEXT_PUBLIC_WS_URL || apiOrigin;
        const wsScheme = wsOrigin.replace(/^http/, 'ws');
        return `connect-src 'self' ${apiOrigin} ${wsOrigin} ${wsScheme} https://*.sentry.io https://*.ingest.sentry.io`;
      })(),
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
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  webpack: {
    autoInstrumentServerFunctions: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
