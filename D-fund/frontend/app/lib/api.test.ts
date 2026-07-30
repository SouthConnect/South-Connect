import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiJson, apiCall, ApiError, getErrorMessage } from './api'

function mockFetchOnce(status: number, body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as typeof fetch
}

function fakeResponse(status: number, marker?: string) {
  return { ok: status >= 200 && status < 300, status, json: async () => ({ marker }) } as Response
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/api/v1'
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getErrorMessage', () => {
  it('returns the fallback for a falsy error', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback')
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback')
  })

  it('extracts the message from an Error instance', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('falls back when an Error has an empty message', () => {
    expect(getErrorMessage(new Error(''), 'fallback')).toBe('fallback')
  })

  it('extracts .message from a plain object', () => {
    expect(getErrorMessage({ message: 'server said no' }, 'fallback')).toBe('server said no')
  })

  it('falls back for a primitive or shapeless object', () => {
    expect(getErrorMessage('just a string', 'fallback')).toBe('fallback')
    expect(getErrorMessage({}, 'fallback')).toBe('fallback')
  })
})

describe('apiJson — error message extraction (ApiError contract used by every page)', () => {
  it('maps 429 to the rate-limit message regardless of the response body', () => {
    mockFetchOnce(429, { message: 'Too Many Requests' })
    return expect(apiJson('/opportunities')).rejects.toMatchObject({
      status: 429,
      message: 'Trop de requêtes. Veuillez patienter quelques instants.',
    })
  })

  it('maps a 403 email-verification error to the friendly message and fires the app event', async () => {
    const handler = vi.fn()
    window.addEventListener('auth:email-not-verified', handler)

    mockFetchOnce(403, { message: 'Veuillez vérifier votre adresse email avant de continuer' })
    await expect(apiJson('/opportunities')).rejects.toMatchObject({
      status: 403,
      message: 'Veuillez vérifier votre adresse email pour accéder à cette fonctionnalité.',
    })
    expect(handler).toHaveBeenCalledOnce()

    window.removeEventListener('auth:email-not-verified', handler)
  })

  it('passes through a non-verification 403 message unchanged', async () => {
    mockFetchOnce(403, { message: 'Forbidden' })
    await expect(apiJson('/admin/users')).rejects.toMatchObject({ status: 403, message: 'Forbidden' })
  })

  it('uses the first element of a NestJS validation array as the message', async () => {
    mockFetchOnce(400, { message: ['name should not be empty', 'type must be valid'] })
    await expect(apiJson('/opportunities')).rejects.toMatchObject({
      status: 400,
      message: 'name should not be empty',
    })
  })

  it('falls back to a generic "Erreur <status>" when the body has no message', async () => {
    mockFetchOnce(500, {})
    await expect(apiJson('/opportunities')).rejects.toMatchObject({ status: 500, message: 'Erreur 500' })
  })

  it('resolves with the parsed JSON body on success', async () => {
    mockFetchOnce(200, { data: [1, 2, 3] })
    await expect(apiJson('/opportunities')).resolves.toEqual({ data: [1, 2, 3] })
  })
})

describe('ApiError', () => {
  it('is a real Error carrying the HTTP status', () => {
    const err = new ApiError('nope', 404)
    expect(err).toBeInstanceOf(Error)
    expect(err.status).toBe(404)
    expect(err.message).toBe('nope')
  })
})

describe('apiCall — transparent 401 refresh-and-retry', () => {
  it('passes non-401 responses straight through, without touching /auth/refresh', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200))
    global.fetch = fetchMock as unknown as typeof fetch

    await apiCall('/opportunities')

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).not.toContain('/auth/refresh')
  })

  it('on 401, silently refreshes and retries the original request exactly once', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/auth/refresh')) return Promise.resolve(fakeResponse(200))
      // First call to the real endpoint → 401. Second (the retry) → success.
      const callsToEndpoint = fetchMock.mock.calls.filter(
        (c) => !String(c[0]).includes('/auth/refresh'),
      ).length
      return Promise.resolve(callsToEndpoint <= 1 ? fakeResponse(401) : fakeResponse(200, 'retried'))
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const res = await apiCall('/opportunities')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ marker: 'retried' })
    const endpointCalls = fetchMock.mock.calls.filter((c) => !String(c[0]).includes('/auth/refresh'))
    expect(endpointCalls).toHaveLength(2) // original + exactly one retry
  })

  it('does not loop when the retried request is also a 401', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/auth/refresh')) return Promise.resolve(fakeResponse(200))
      return Promise.resolve(fakeResponse(401))
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const res = await apiCall('/opportunities')

    expect(res.status).toBe(401)
    const refreshCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/auth/refresh'))
    expect(refreshCalls).toHaveLength(1) // refreshed once, retried once, did not refresh again
  })

  it('returns the original 401 without logging out when the refresh fails on a transient server error', async () => {
    const handler = vi.fn()
    window.addEventListener('auth:session-expired', handler)

    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(url.includes('/auth/refresh') ? fakeResponse(500) : fakeResponse(401)),
    )
    global.fetch = fetchMock as unknown as typeof fetch

    const res = await apiCall('/opportunities')

    expect(res.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
    window.removeEventListener('auth:session-expired', handler)
  })

  it('dispatches auth:session-expired when the refresh token is definitively invalid', async () => {
    const handler = vi.fn()
    window.addEventListener('auth:session-expired', handler)

    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(url.includes('/auth/refresh') ? fakeResponse(401) : fakeResponse(401)),
    )
    global.fetch = fetchMock as unknown as typeof fetch

    await apiCall('/opportunities')

    expect(handler).toHaveBeenCalledOnce()
    window.removeEventListener('auth:session-expired', handler)
  })
})

describe('apiCall — timeout', () => {
  it('aborts and throws once the request exceeds the configured timeout', async () => {
    vi.useFakeTimers()
    global.fetch = vi.fn((_url: string, opts?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    }) as unknown as typeof fetch

    const pending = apiCall('/opportunities')
    const assertion = expect(pending).rejects.toThrow('Request timed out')

    await vi.advanceTimersByTimeAsync(15_000)
    await assertion

    vi.useRealTimers()
  })
})
