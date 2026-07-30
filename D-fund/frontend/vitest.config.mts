import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    // happy-dom instead of jsdom: jsdom 27's cssstyle -> @asamuzakjp/css-color
    // -> @csstools/css-calc chain ships ESM-only files that crash Vitest's
    // forks pool at worker startup (before Vite's transform pipeline even
    // runs, so deps.inline can't help). happy-dom doesn't have this chain.
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
