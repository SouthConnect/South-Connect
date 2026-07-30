import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useToggleFollow } from './useFollow'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { qk } from '@/app/lib/queryKeys'
import { toast } from 'sonner'
import { createTestQueryClient, withQueryClient } from '@/app/lib/test-utils'

vi.mock('@/app/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api')>()
  return { ...actual, apiJson: vi.fn() }
})
vi.mock('@/app/lib/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mockedApiJson = vi.mocked(apiJson)
const mockedUseAuth = vi.mocked(useAuth)
const CURRENT_USER = 'me-1'
const TARGET = 'target-1'

beforeEach(() => {
  mockedUseAuth.mockReturnValue({ user: { id: CURRENT_USER } } as any)
})

describe('useToggleFollow', () => {
  it('optimistically flips isFollowing and adds the target to the following list', async () => {
    mockedApiJson.mockReturnValue(new Promise(() => {})) // inspect mid-flight state
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(qk.socialFollowing(CURRENT_USER), [])

    const { result } = renderHook(() => useToggleFollow(TARGET, false), {
      wrapper: withQueryClient(queryClient),
    })

    act(() => result.current.toggleFollow())

    await waitFor(() =>
      expect(queryClient.getQueryData(qk.isFollowing(TARGET, CURRENT_USER))).toEqual({ following: true }),
    )
    expect(queryClient.getQueryData<Array<{ id: string }>>(qk.socialFollowing(CURRENT_USER))).toEqual([
      { id: TARGET },
    ])
  })

  it('removes the target from the following list when unfollowing', async () => {
    mockedApiJson.mockReturnValue(new Promise(() => {}))
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(qk.socialFollowing(CURRENT_USER), [{ id: TARGET }, { id: 'other' }])

    const { result } = renderHook(() => useToggleFollow(TARGET, true), {
      wrapper: withQueryClient(queryClient),
    })

    act(() => result.current.toggleFollow())

    await waitFor(() =>
      expect(queryClient.getQueryData(qk.isFollowing(TARGET, CURRENT_USER))).toEqual({ following: false }),
    )
    expect(queryClient.getQueryData<Array<{ id: string }>>(qk.socialFollowing(CURRENT_USER))).toEqual([
      { id: 'other' },
    ])
  })

  it('rolls back both caches to their exact previous snapshot on failure', async () => {
    mockedApiJson.mockRejectedValue(new Error('boom'))
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(qk.isFollowing(TARGET, CURRENT_USER), { following: false })
    queryClient.setQueryData(qk.socialFollowing(CURRENT_USER), [{ id: 'other' }])

    const { result } = renderHook(() => useToggleFollow(TARGET, false), {
      wrapper: withQueryClient(queryClient),
    })

    act(() => result.current.toggleFollow())
    await waitFor(() => expect(result.current.isPending).toBe(false))

    expect(queryClient.getQueryData(qk.isFollowing(TARGET, CURRENT_USER))).toEqual({ following: false })
    expect(queryClient.getQueryData(qk.socialFollowing(CURRENT_USER))).toEqual([{ id: 'other' }])
    expect(toast.error).toHaveBeenCalledWith('Impossible de modifier le suivi')
  })

  it('invalidates isFollowing, socialFollowing and the target public profile once settled', async () => {
    mockedApiJson.mockResolvedValue({})
    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useToggleFollow(TARGET, false), {
      wrapper: withQueryClient(queryClient),
    })

    act(() => result.current.toggleFollow())
    await waitFor(() => expect(result.current.isPending).toBe(false))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qk.isFollowing(TARGET, CURRENT_USER) })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qk.socialFollowing(CURRENT_USER) })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qk.publicProfile(TARGET) })
  })
})
