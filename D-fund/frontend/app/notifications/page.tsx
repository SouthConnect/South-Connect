'use client'

import { useAuth } from '@/app/lib/AuthContext'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiJson, getErrorMessage } from '@/app/lib/api'
import AuthGuard from '@/components/AuthGuard'
import type { Notification } from '@/app/lib/types'
import { Bell, BellOff, ExternalLink, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useState, useRef, useCallback, useEffect } from 'react'

const PAGE_SIZE = 30

function NotifSkeleton() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [pendingReadId, setPendingReadId] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['notifications', user?.id],
    queryFn: ({ pageParam = 0 }) =>
      apiJson<Notification[]>(`/notifications?take=${PAGE_SIZE}&skip=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.flat().length : undefined,
    enabled: !!user?.id,
  })

  const notifications = data?.pages.flat() ?? []

  // Cleanup IntersectionObserver on unmount
  useEffect(() => {
    return () => { observerRef.current?.disconnect() }
  }, [])

  // Infinite scroll sentinel — fetches next page when the bottom sentinel enters view
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect()
    if (!node) return
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    })
    observerRef.current.observe(node)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const readAllMutation = useMutation({
    mutationFn: () => apiJson('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count', user?.id] })
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'Impossible de tout marquer comme lu.')),
  })

  const readOneMutation = useMutation({
    mutationFn: (id: string) => apiJson(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => {
      setPendingReadId(null)
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count', user?.id] })
    },
    onError: (error: unknown) => {
      setPendingReadId(null)
      toast.error(getErrorMessage(error, 'Impossible de marquer la notification comme lue.'))
    },
  })

  const unread = notifications.filter((n: Notification) => !n.isRead).length

  return (
    <AuthGuard skeleton={<NotifSkeleton />} message="Connectez-vous pour voir vos notifications.">
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Notifications
            </h1>
            {unread > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">{unread} non lue{unread > 1 ? 's' : ''}</p>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={() => readAllMutation.mutate()}
              disabled={readAllMutation.isPending}
              className="text-xs font-semibold text-[#3b49df] hover:underline"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-50 animate-pulse border-b border-gray-100" />
            ))
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <BellOff className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Aucune notification pour le moment.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {notifications.map((notif: Notification) => (
                  <li
                    key={notif.id}
                    role="button"
                    tabIndex={0}
                    className={`px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notif.isRead ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => {
                      if (!notif.isRead && pendingReadId !== notif.id) {
                        setPendingReadId(notif.id)
                        readOneMutation.mutate(notif.id)
                      }
                      if (notif.link) router.push(notif.link)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        if (!notif.isRead && pendingReadId !== notif.id) {
                          setPendingReadId(notif.id)
                          readOneMutation.mutate(notif.id)
                        }
                        if (notif.link) router.push(notif.link)
                      }
                    }}
                  >
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${notif.isRead ? 'bg-transparent' : 'bg-[#3b49df]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold text-gray-900 ${notif.isRead ? 'font-medium' : ''}`}>
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-xs text-gray-500 mt-0.5">{notif.body}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(notif.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {notif.link && (
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-1" />
                    )}
                  </li>
                ))}
              </ul>
              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="py-3 flex justify-center">
                {isFetchingNextPage && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
