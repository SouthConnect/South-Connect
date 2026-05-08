'use client'

import { useAuth } from '@/app/lib/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import AuthGuard from '@/components/AuthGuard'
import type { Notification } from '@/app/lib/types'
import { Bell, BellOff, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useState } from 'react'

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

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => apiJson('/notifications'),
    enabled: !!user?.id,
  })

  const readAllMutation = useMutation({
    mutationFn: () => apiJson('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count', user?.id] })
    },
    onError: (error: any) => toast.error(error.message || 'Failed to mark all as read'),
  })

  const readOneMutation = useMutation({
    mutationFn: (id: string) => apiJson(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => {
      setPendingReadId(null)
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count', user?.id] })
    },
    onError: (error: any) => {
      setPendingReadId(null)
      toast.error(error.message || 'Failed to mark notification as read')
    },
  })

  const unread = notifications?.filter((n: Notification) => !n.isRead).length ?? 0

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
          ) : !notifications || notifications.length === 0 ? (
            <div className="py-12 text-center">
              <BellOff className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Aucune notification pour le moment.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((notif: Notification) => (
                <li
                  key={notif.id}
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
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
