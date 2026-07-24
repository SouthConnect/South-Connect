'use client'

import { useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { qk } from '@/app/lib/queryKeys'
import { toast } from 'sonner'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'

/**
 * Shared Follow/unfollow toggle for user profiles.
 *
 * Used by every call site (community list, public profile page) so a follow
 * made from either place updates both cache representations: the
 * `socialFollowing` id list (used by the community list to render the
 * Suivre/Suivi·e state) and the `isFollowing` boolean (used by the profile
 * page). Previously these were two disjoint caches that never invalidated
 * each other, so the button could show a different state depending on which
 * page you were on (stabilization report, Cause 01).
 */
export function useToggleFollow(targetUserId: string, isFollowingServer: boolean) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const currentUserId = user?.id ?? ''

  const mutation = useTrackedMutation('profile.follow', {
    mutationFn: () =>
      apiJson(`/social/follow/${targetUserId}`, { method: isFollowingServer ? 'DELETE' : 'POST' }),
    onMutate: async () => {
      const nextFollowing = !isFollowingServer

      await queryClient.cancelQueries({ queryKey: qk.isFollowing(targetUserId, currentUserId) })
      await queryClient.cancelQueries({ queryKey: qk.socialFollowing(currentUserId) })

      const prevIsFollowing = queryClient.getQueryData(qk.isFollowing(targetUserId, currentUserId))
      const prevFollowingList = queryClient.getQueryData<Array<{ id: string }>>(qk.socialFollowing(currentUserId))

      queryClient.setQueryData(qk.isFollowing(targetUserId, currentUserId), { following: nextFollowing })
      queryClient.setQueryData<Array<{ id: string }>>(qk.socialFollowing(currentUserId), (old = []) =>
        nextFollowing ? [...old, { id: targetUserId }] : old.filter((u) => u.id !== targetUserId),
      )

      return { prevIsFollowing, prevFollowingList }
    },
    onError: (_err: unknown, _vars: unknown, ctx: { prevIsFollowing?: unknown; prevFollowingList?: Array<{ id: string }> } | undefined) => {
      if (ctx?.prevIsFollowing !== undefined) {
        queryClient.setQueryData(qk.isFollowing(targetUserId, currentUserId), ctx.prevIsFollowing)
      }
      if (ctx?.prevFollowingList !== undefined) {
        queryClient.setQueryData(qk.socialFollowing(currentUserId), ctx.prevFollowingList)
      }
      toast.error('Impossible de modifier le suivi')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.isFollowing(targetUserId, currentUserId) })
      queryClient.invalidateQueries({ queryKey: qk.socialFollowing(currentUserId) })
      queryClient.invalidateQueries({ queryKey: qk.publicProfile(targetUserId) })
    },
  })

  return { toggleFollow: () => mutation.mutate(undefined), isPending: mutation.isPending }
}
