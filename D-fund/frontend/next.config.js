const { withSentryConfig } = require('@sentry/nextjs');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js inline scripts need 'unsafe-inline'; dev mode also needs 'unsafe-eval' for webpack source maps
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      // Allow images from Supabase storage, Google OAuth avatars and known CDNs only
      "img-src 'self' data: blob: https://*.supabase.co https://storage.googleapis.com https://images.pexels.com https://images.unsplash.com https://res.cloudinary.com https://*.googleusercontent.com",
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
  // HSTS — force HTTPS pendant 1 an, inclut les sous-domaines
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
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
  // Standalone output for Docker deployments — disabled on Vercel (it has its own pipeline)
  output: process.env.VERCEL ? undefined : 'standalone',
  images: {
    remotePatterns: [
      // Supabase Storage — tous les buckets du projet
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/**' },
      // Anciennes photos Glide (données migrées)
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      // Photos de profil Google OAuth (lh3.googleusercontent.com, etc.)
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      // Images externes (Pexels, Unsplash, etc.)
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
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
  autoInstrumentServerFunctions: true,
  // Edge middleware runs in V8 isolates — __dirname is not defined there.
  // Sentry's middleware wrapper injects Node.js-only globals which crash the Edge runtime.
  autoInstrumentMiddleware: false,
});
