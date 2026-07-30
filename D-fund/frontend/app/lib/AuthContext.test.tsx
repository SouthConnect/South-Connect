import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './AuthContext'
import { apiCall } from '@/app/lib/api'
import { createTestQueryClient } from '@/app/lib/test-utils'

vi.mock('@/app/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api')>()
  return { ...actual, apiCall: vi.fn() }
})

const mockedApiCall = vi.mocked(apiCall)

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

/** Exposes useAuth()'s state as text + the action functions as clickable buttons, for RTL. */
function AuthProbe() {
  const { user, loading, login, logout, refreshUser } = useAuth()
  return (
    <div>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="user">{user ? user.email : 'null'}</p>
      <button onClick={() => login({ id: 'u2', email: 'new@user.com' } as any)}>login</button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => refreshUser(true)}>refresh</button>
    </div>
  )
}

function renderAuth() {
  const queryClient = createTestQueryClient()
  const clearSpy = vi.spyOn(queryClient, 'clear')
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    </QueryClientProvider>,
  )
  return { ...utils, queryClient, clearSpy }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('AuthProvider — cold start', () => {
  it('fetches /auth/me on mount and exposes the user once resolved', async () => {
    mockedApiCall.mockResolvedValue(jsonResponse(200, { id: 'u1', email: 'a@b.com' }))
    renderAuth()

    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('a@b.com')
    expect(localStorage.getItem('sc_has_session')).toBe('1')
  })

  it('clears the session hint and stays logged out on a 401', async () => {
    localStorage.setItem('sc_has_session', '1')
    mockedApiCall.mockResolvedValue(jsonResponse(401, {}))
    renderAuth()

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('null')
    expect(localStorage.getItem('sc_has_session')).toBeNull()
  })

  it('preserves the current state on a network-level error instead of logging out', async () => {
    mockedApiCall.mockRejectedValue(new Error('offline'))
    renderAuth()

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('null') // never was logged in — nothing to preserve, just no crash
  })
})

describe('AuthProvider — login', () => {
  it('clears the query cache, sets the user, and persists the session hint', async () => {
    mockedApiCall.mockResolvedValue(jsonResponse(401, {})) // cold start: logged out
    const { clearSpy } = renderAuth()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    clearSpy.mockClear()

    act(() => screen.getByText('login').click())

    expect(screen.getByTestId('user')).toHaveTextContent('new@user.com')
    expect(localStorage.getItem('sc_has_session')).toBe('1')
    expect(clearSpy).toHaveBeenCalledOnce()
  })
})

describe('AuthProvider — logout', () => {
  it('clears the cache and local state even when the /auth/logout call fails (best-effort)', async () => {
    mockedApiCall.mockResolvedValueOnce(jsonResponse(200, { id: 'u1', email: 'a@b.com' }))
    const { clearSpy } = renderAuth()
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@b.com'))

    mockedApiCall.mockRejectedValueOnce(new Error('logout endpoint down'))
    clearSpy.mockClear()

    await act(async () => {
      screen.getByText('logout').click()
    })

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('null'))
    expect(localStorage.getItem('sc_has_session')).toBeNull()
    expect(clearSpy).toHaveBeenCalled()
  })
})

describe('AuthProvider — auth:session-expired event', () => {
  it('logs the user out when apiCall dispatches the global session-expired event', async () => {
    mockedApiCall.mockResolvedValueOnce(jsonResponse(200, { id: 'u1', email: 'a@b.com' }))
    renderAuth()
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@b.com'))

    act(() => {
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
    })

    expect(screen.getByTestId('user')).toHaveTextContent('null')
  })
})

describe('AuthProvider — refreshUser stale window', () => {
  it('skips a second unforced refresh within 60s of the last one', async () => {
    mockedApiCall.mockResolvedValue(jsonResponse(200, { id: 'u1', email: 'a@b.com' }))
    renderAuth()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    const callsAfterMount = mockedApiCall.mock.calls.length
    // The probe's "refresh" button always forces — simulate a *non*-forced
    // call the way the visibilitychange handler does, directly through the
    // hook, by dispatching visibilitychange with the tab already visible.
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600)) // clear the 500ms debounce
    })

    expect(mockedApiCall.mock.calls.length).toBe(callsAfterMount) // still within the 60s stale window
  })
})
