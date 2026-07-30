import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import * as Sentry from '@sentry/nextjs'
import { useTrackedMutation } from './useTrackedMutation'
import { ApiError } from '@/app/lib/api'
import { createTestQueryClient, withQueryClient } from '@/app/lib/test-utils'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  withScope: vi.fn((cb: (scope: any) => void) => cb({ setTag: vi.fn(), setContext: vi.fn() })),
}))

function renderTrackedMutation(mutationFn: () => Promise<unknown>, onError = vi.fn()) {
  const queryClient = createTestQueryClient()
  const { result } = renderHook(
    () => useTrackedMutation<unknown, Error, void>('test.mutation', { mutationFn, onError }),
    { wrapper: withQueryClient(queryClient) },
  )
  return { result, onError }
}

const originalEnv = process.env.NODE_ENV

afterEach(() => {
  vi.clearAllMocks()
  ;(process.env as any).NODE_ENV = originalEnv
})

describe('useTrackedMutation — outside production', () => {
  beforeEach(() => {
    ;(process.env as any).NODE_ENV = 'test'
  })

  it('never reports to Sentry, even on a 500', async () => {
    const { result } = renderTrackedMutation(() => Promise.reject(new ApiError('boom', 500)))
    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })
})

describe('useTrackedMutation — in production', () => {
  beforeEach(() => {
    ;(process.env as any).NODE_ENV = 'production'
  })

  it('does not report an expected 4xx client error', async () => {
    const { result } = renderTrackedMutation(() => Promise.reject(new ApiError('Validation failed', 422)))
    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('reports an unexpected 5xx server error', async () => {
    const { result } = renderTrackedMutation(() => Promise.reject(new ApiError('boom', 500)))
    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(Sentry.captureException).toHaveBeenCalledOnce()
  })

  it('reports a non-ApiError exception (no status → treated as unexpected)', async () => {
    const { result } = renderTrackedMutation(() => Promise.reject(new Error('network down')))
    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(Sentry.captureException).toHaveBeenCalledOnce()
  })

  it('still calls the caller-supplied onError alongside the Sentry report', async () => {
    const { result, onError } = renderTrackedMutation(() => Promise.reject(new ApiError('boom', 500)))
    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(onError).toHaveBeenCalledOnce()
  })
})
