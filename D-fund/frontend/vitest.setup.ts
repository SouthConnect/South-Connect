import '@testing-library/jest-dom/vitest'

// happy-dom exposes `navigator.locks` (so `'locks' in navigator` is true,
// same as real browsers) but doesn't implement it — app/lib/api.ts reads
// that as a feature flag once at module-load time and calls
// navigator.locks.request(...) for its cross-tab refresh mutex. Without this
// polyfill every test touching apiCall's 401 path crashes on a null
// dereference. Single-tab semantics (just run the callback) are enough for
// unit tests — there's no second tab to race against here.
if (typeof navigator !== 'undefined' && !navigator.locks?.request) {
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: async (_name: string, callback: () => unknown) => callback(),
    },
  })
}
