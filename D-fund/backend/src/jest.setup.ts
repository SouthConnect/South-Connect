// Polyfill globalThis.crypto for Node.js 18 — required by @nestjs/schedule v6
// which calls crypto.randomUUID() as a bare global (available natively in Node 19+).
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) {
  (globalThis as Record<string, unknown>).crypto = webcrypto;
}
