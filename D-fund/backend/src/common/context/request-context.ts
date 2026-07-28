import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContextStore {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

/**
 * Propagates the current request's correlation ID through async call chains
 * without threading it through every function signature. Populated by
 * {@link requestIdMiddleware} for every HTTP request; read by JsonLoggerService
 * so every log line emitted during that request — no matter how deep in the
 * call stack — carries the same `requestId`.
 */
export const RequestContext = {
  run<T>(store: RequestContextStore, callback: () => T): T {
    return storage.run(store, callback);
  },

  getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
};
