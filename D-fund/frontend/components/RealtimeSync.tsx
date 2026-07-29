'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useSocket } from '@/app/hooks/useSocket'
import { useAuth } from '@/app/lib/AuthContext'
import { qk } from '@/app/lib/queryKeys'

/**
 * Invisible component that keeps React Query caches in sync with WebSocket events.
 * Dynamically imported in AppShell so that socket.io-client is code-split into
 * its own chunk and does not block the initial page load.
 *
 * The app-wide 'reconnect' handling (dismissing the error toast, refetching
 * conversation list + notification badges) lives in SocketProvider
 * (app/lib/SocketContext.tsx), not here — this component only reacts to
 * server-pushed 'notification' / 'chatBadgeUpdate' events.
 */
export default function RealtimeSync() {
  const { user } = useAuth()
  const socket = useSocket()
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    if (!socket || !user) return

    const handleNotification = (notif: { title: string; body?: string; link?: string }) => {
      toast(notif.title, {
        description: notif.body,
        action: notif.link
          ? { label: 'Voir', onClick: () => router.push(notif.link!) }
          : undefined,
      })
      queryClient.invalidateQueries({ queryKey: qk.notificationsCount(user.id) })
      queryClient.invalidateQueries({ queryKey: qk.notifications(user.id) })
      queryClient.invalidateQueries({ queryKey: qk.privateDiscussions(user.id) })
    }

    const handleChatBadge = () => {
      queryClient.invalidateQueries({ queryKey: qk.privateDiscussions(user.id) })
    }

    socket.on('notification', handleNotification)
    socket.on('chatBadgeUpdate', handleChatBadge)
    return () => {
      socket.off('notification', handleNotification)
      socket.off('chatBadgeUpdate', handleChatBadge)
    }
  }, [socket, user, router, queryClient])

  return null
}
