'use client'

import { useState } from 'react'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { qk } from '@/app/lib/queryKeys'
import type { Opportunity } from '@/app/lib/types'
import { toast } from 'sonner'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'

type PageData = { data: Opportunity[]; nextCursor?: string | null }

/**
 * Patches an opportunity's fields across every cache that renders it — feed,
 * explore, preview lists, and its own detail query — so a change made from
 * any one of them (card or detail page) is reflected everywhere immediately,
 * without waiting for staleTime to expire.
 */
export function patchOpportunityInAllCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  opportunityId: string,
  patch: Partial<Opportunity>,
) {
  const updater = (old: InfiniteData<PageData> | undefined) => {
    if (!old?.pages) return old
    return { ...old, pages: old.pages.map(p => ({ ...p, data: p.data.map(o => o.id === opportunityId ? { ...o, ...patch } : o) })) }
  }
  queryClient.setQueriesData<InfiniteData<PageData>>({ queryKey: qk._root.opportunities }, updater)
  queryClient.setQueriesData<InfiniteData<PageData>>({ queryKey: qk._root.opportunitiesFeed }, updater)
  queryClient.setQueriesData<InfiniteData<PageData>>({ queryKey: qk._root.explore }, updater)
  queryClient.setQueriesData<{ data: Opportunity[] }>(
    { queryKey: qk.opportunitiesPreview() },
    (old) => old?.data ? { ...old, data: old.data.map(o => o.id === opportunityId ? { ...o, ...patch } : o) } : old,
  )
  queryClient.setQueryData<Opportunity>(qk.opportunity(opportunityId), (old) =>
    old ? { ...old, ...patch } : old,
  )
}

/**
 * Shared Like toggle for opportunities.
 *
 * Used by every call site (card, detail page) so liking from any one of them
 * updates every cache consistently. Previously each call site had its own
 * mutation with a different, incomplete invalidation strategy — a like from
 * the detail page never reached the feed/explore caches (stabilization
 * report, Cause 01).
 */
export function useToggleOpportunityLike(opportunityId: string, serverIsLiked: boolean, serverLikeCount: number) {
  const queryClient = useQueryClient()
  const [localLiked, setLocalLiked] = useState<boolean | null>(null)
  const [localLikeCount, setLocalLikeCount] = useState<number | null>(null)

  const isLiked = localLiked ?? serverIsLiked
  const likeCount = localLikeCount ?? serverLikeCount

  const mutation = useTrackedMutation<
    unknown, Error, boolean, { nextLiked: boolean; nextLikeCount: number }
  >('opportunity.like', {
    mutationFn: (currentlyLiked: boolean) =>
      apiJson(`/social/like/${opportunityId}`, { method: currentlyLiked ? 'DELETE' : 'POST' }),
    onMutate: (currentlyLiked) => {
      // Derived from the current displayed count (not the raw server prop) so
      // rapid successive clicks compound correctly instead of resetting.
      const nextLiked = !currentlyLiked
      const nextLikeCount = likeCount + (currentlyLiked ? -1 : 1)
      setLocalLiked(nextLiked)
      setLocalLikeCount(nextLikeCount)
      return { nextLiked, nextLikeCount }
    },
    onSuccess: (_, _vars, ctx) => {
      if (!ctx) return
      patchOpportunityInAllCaches(queryClient, opportunityId, { isLiked: ctx.nextLiked, likesCount: ctx.nextLikeCount })
    },
    onError: () => {
      setLocalLiked(null)
      setLocalLikeCount(null)
      toast.error('Impossible de mettre à jour le like')
    },
  })

  return {
    isLiked,
    likeCount,
    toggleLike: () => mutation.mutate(isLiked),
    isPending: mutation.isPending,
  }
}

/**
 * Shared Save toggle for opportunities — same rationale as
 * {@link useToggleOpportunityLike}. Also invalidates the "Saved" list so a
 * save made from any call site shows up there without a manual refresh.
 */
export function useToggleOpportunitySave(opportunityId: string, serverIsSaved: boolean, serverSaveCount: number) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [localSaved, setLocalSaved] = useState<boolean | null>(null)
  const [localSaveCount, setLocalSaveCount] = useState<number | null>(null)

  const isSaved = localSaved ?? serverIsSaved
  const saveCount = localSaveCount ?? serverSaveCount

  const mutation = useTrackedMutation<
    unknown, Error, boolean, { nextSaved: boolean; nextSaveCount: number }
  >('opportunity.save', {
    mutationFn: (currentlySaved: boolean) =>
      apiJson(`/social/save/${opportunityId}`, { method: currentlySaved ? 'DELETE' : 'POST' }),
    onMutate: (currentlySaved) => {
      const nextSaved = !currentlySaved
      const nextSaveCount = saveCount + (currentlySaved ? -1 : 1)
      setLocalSaved(nextSaved)
      setLocalSaveCount(nextSaveCount)
      return { nextSaved, nextSaveCount }
    },
    onSuccess: (_, _vars, ctx) => {
      if (!ctx) return
      patchOpportunityInAllCaches(queryClient, opportunityId, { isSaved: ctx.nextSaved, savedCount: ctx.nextSaveCount })
      queryClient.invalidateQueries({ queryKey: qk.savedOpportunities(user?.id ?? '') })
    },
    onError: () => {
      setLocalSaved(null)
      setLocalSaveCount(null)
      toast.error("Impossible de mettre à jour l'enregistrement")
    },
  })

  return {
    isSaved,
    saveCount,
    toggleSave: () => mutation.mutate(isSaved),
    isPending: mutation.isPending,
  }
}
