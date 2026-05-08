const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
