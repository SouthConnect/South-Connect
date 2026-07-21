'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useSocket } from '@/app/hooks/useSocket'
import { useAuth } from '@/app/lib/AuthContext'

/**
 * Invisible component that keeps React Query caches in sync with WebSocket events.
 * Dynamically imported in AppShell so that socket.io-client is code-split into
 * its own chunk and does not block the initial page load.
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
      queryClient.invalidateQueries({ queryKey: ['notifications-count', user.id] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['private-discussions', user.id] })
    }

    const handleChatBadge = () => {
      queryClient.invalidateQueries({ queryKey: ['private-discussions', user.id] })
    }

    const handleReconnect = () => {
      queryClient.invalidateQueries({ queryKey: ['private-discussions'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    socket.on('notification', handleNotification)
    socket.on('chatBadgeUpdate', handleChatBadge)
    socket.on('reconnect', handleReconnect)
    return () => {
      socket.off('notification', handleNotification)
      socket.off('chatBadgeUpdate', handleChatBadge)
      socket.off('reconnect', handleReconnect)
    }
  }, [socket, user, router, queryClient])

  return null
}
