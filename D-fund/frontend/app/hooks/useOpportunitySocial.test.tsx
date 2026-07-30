import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { InfiniteData } from '@tanstack/react-query'
import {
  patchOpportunityInAllCaches,
  useToggleOpportunityLike,
  useToggleOpportunitySave,
} from './useOpportunitySocial'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { qk } from '@/app/lib/queryKeys'
import { toast } from 'sonner'
import { createTestQueryClient, withQueryClient } from '@/app/lib/test-utils'
import type { Opportunity } from '@/app/lib/types'

vi.mock('@/app/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/lib/api')>()
  return { ...actual, apiJson: vi.fn() }
})
vi.mock('@/app/lib/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const mockedApiJson = vi.mocked(apiJson)
const mockedUseAuth = vi.mocked(useAuth)

function makeOpp(id: string, overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id,
    name: `Opp ${id}`,
    type: 'JOB_OPPORTUNITY',
    status: 'ACTIVE',
    ownerId: 'owner-1',
    likesCount: 0,
    savedCount: 0,
    isLiked: false,
    isSaved: false,
    ...overrides,
  } as Opportunity
}

function infinitePage(items: Opportunity[]): InfiniteData<{ data: Opportunity[]; nextCursor?: string | null }> {
  return { pages: [{ data: items, nextCursor: null }], pageParams: [undefined] }
}

beforeEach(() => {
  mockedUseAuth.mockReturnValue({ user: { id: 'user-1' } } as any)
})

describe('patchOpportunityInAllCaches', () => {
  it('patches the opportunity everywhere it appears — feed, explore, preview, detail — and leaves other items untouched', () => {
    const queryClient = createTestQueryClient()
    const target = makeOpp('opp-1', { likesCount: 3 })
    const other = makeOpp('opp-2', { likesCount: 9 })

    queryClient.setQueryData(qk.opportunitiesFeed('', '', 'newest'), infinitePage([target, other]))
    queryClient.setQueryData(qk.explore('', '', null, false), infinitePage([target]))
    queryClient.setQueryData(qk.opportunitiesPreview(), { data: [target, other] })
    queryClient.setQueryData(qk.opportunity('opp-1'), target)

    patchOpportunityInAllCaches(queryClient, 'opp-1', { likesCount: 4, isLiked: true })

    const feed = queryClient.getQueryData<InfiniteData<{ data: Opportunity[] }>>(qk.opportunitiesFeed('', '', 'newest'))
    expect(feed!.pages[0].data.find((o) => o.id === 'opp-1')!.likesCount).toBe(4)
    expect(feed!.pages[0].data.find((o) => o.id === 'opp-2')!.likesCount).toBe(9) // untouched

    const explore = queryClient.getQueryData<InfiniteData<{ data: Opportunity[] }>>(qk.explore('', '', null, false))
    expect(explore!.pages[0].data[0].likesCount).toBe(4)

    const preview = queryClient.getQueryData<{ data: Opportunity[] }>(qk.opportunitiesPreview())
    expect(preview!.data.find((o) => o.id === 'opp-1')!.isLiked).toBe(true)

    const detail = queryClient.getQueryData<Opportunity>(qk.opportunity('opp-1'))
    expect(detail!.likesCount).toBe(4)
  })

  it('is a no-op on caches that do not have the shape it expects yet (undefined stays undefined)', () => {
    const queryClient = createTestQueryClient()
    expect(() => patchOpportunityInAllCaches(queryClient, 'opp-1', { likesCount: 4 })).not.toThrow()
    expect(queryClient.getQueryData(qk.opportunity('opp-1'))).toBeUndefined()
  })
})

describe('useToggleOpportunityLike', () => {
  it('updates optimistically before the request resolves, compounding on the current displayed count', async () => {
    mockedApiJson.mockReturnValue(new Promise(() => {})) // never resolves — inspect the optimistic phase
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useToggleOpportunityLike('opp-1', false, 3), {
      wrapper: withQueryClient(queryClient),
    })

    expect(result.current.isLiked).toBe(false)
    expect(result.current.likeCount).toBe(3)

    act(() => result.current.toggleLike())

    await waitFor(() => expect(result.current.isLiked).toBe(true))
    expect(result.current.likeCount).toBe(4)
  })

  it('patches every cache on success', async () => {
    mockedApiJson.mockResolvedValue({})
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(qk.opportunity('opp-1'), makeOpp('opp-1', { likesCount: 3, isLiked: false }))

    const { result } = renderHook(() => useToggleOpportunityLike('opp-1', false, 3), {
      wrapper: withQueryClient(queryClient),
    })

    act(() => result.current.toggleLike())
    await waitFor(() => expect(result.current.isPending).toBe(false))

    const cached = queryClient.getQueryData<Opportunity>(qk.opportunity('opp-1'))
    expect(cached!.likesCount).toBe(4)
    expect(cached!.isLiked).toBe(true)
  })

  it('rolls back the optimistic state and shows a toast on failure', async () => {
    mockedApiJson.mockRejectedValue(new Error('network error'))
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useToggleOpportunityLike('opp-1', false, 3), {
      wrapper: withQueryClient(queryClient),
    })

    act(() => result.current.toggleLike())
    await waitFor(() => expect(result.current.isPending).toBe(false))

    expect(result.current.isLiked).toBe(false)
    expect(result.current.likeCount).toBe(3)
    expect(toast.error).toHaveBeenCalledWith('Impossible de mettre à jour le like')
  })

  it('decrements when unliking', async () => {
    mockedApiJson.mockResolvedValue({})
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useToggleOpportunityLike('opp-1', true, 5), {
      wrapper: withQueryClient(queryClient),
    })

    act(() => result.current.toggleLike())
    await waitFor(() => expect(result.current.isLiked).toBe(false))
    expect(result.current.likeCount).toBe(4)
  })
})

describe('useToggleOpportunitySave', () => {
  it('invalidates the current user\'s saved-opportunities list on success', async () => {
    mockedApiJson.mockResolvedValue({})
    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useToggleOpportunitySave('opp-1', false, 0), {
      wrapper: withQueryClient(queryClient),
    })

    act(() => result.current.toggleSave())
    await waitFor(() => expect(result.current.isPending).toBe(false))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qk.savedOpportunities('user-1') })
  })

  it('rolls back and shows a toast on failure', async () => {
    mockedApiJson.mockRejectedValue(new Error('boom'))
    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useToggleOpportunitySave('opp-1', false, 2), {
      wrapper: withQueryClient(queryClient),
    })

    act(() => result.current.toggleSave())
    await waitFor(() => expect(result.current.isPending).toBe(false))

    expect(result.current.isSaved).toBe(false)
    expect(result.current.saveCount).toBe(2)
    expect(toast.error).toHaveBeenCalledWith("Impossible de mettre à jour l'enregistrement")
  })
})
