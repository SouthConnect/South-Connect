'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/lib/AuthContext'
import { qk } from '@/app/lib/queryKeys'
import { toast } from 'sonner'

let sharedSocket: Socket | null = null
let currentUserId: string | null = null
let connectedUsers = 0

function getSocketUrl(): string {
  return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
}

function createSocket(): Socket {
  return io(`${getSocketUrl()}/chat`, {
    withCredentials: true,
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 30000,
  })
}

/**
 * Hook qui retourne un socket.io connecté au namespace /chat.
 * La connexion est partagée et ref-countée : le socket se déconnecte
 * uniquement quand tous les consommateurs sont démontés.
 *
 * Dépend de user?.id (et non de l'objet user entier) : un refresh de profil
 * (refreshUser) ne provoque pas une reconnexion inutile.
 *
 * Sur logout ou changement d'utilisateur, le socket précédent est
 * explicitement déconnecté pour éviter qu'User B hérite des rooms de User A.
 */
export function useSocket(): Socket | null {
  const { user, refreshUser } = useAuth()
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // User logged out — disconnect immediately and reset
    if (!user) {
      if (sharedSocket) {
        sharedSocket.disconnect()
        sharedSocket = null
        currentUserId = null
        connectedUsers = 0
      }
      socketRef.current = null
      return
    }

    // User switched — disconnect the old socket before creating a new one
    if (currentUserId && currentUserId !== user.id && sharedSocket) {
      sharedSocket.disconnect()
      sharedSocket = null
      currentUserId = null
      connectedUsers = 0
    }

    if (!sharedSocket || !sharedSocket.connected) {
      sharedSocket = createSocket()
      currentUserId = user.id

      // Token expired: the server disconnected us intentionally — silently
      // refresh auth so the next reconnect attempt carries a fresh cookie.
      sharedSocket.on('tokenExpired', () => {
        refreshUser()
      })

      // "io server disconnect" = backend kicked us (token expired / banned).
      // Any other reason = network blip that socket.io will retry automatically.
      sharedSocket.on('disconnect', (reason: string) => {
        if (reason === 'io server disconnect') {
          refreshUser()
        }
      })

      // Reconnect: dismiss error toast and refetch data missed during the
      // disconnection window. Using prefix roots covers all open chat pages
      // without needing to know specific IDs. User-specific keys use the
      // captured userId to avoid cross-user cache collisions.
      sharedSocket.on('reconnect', () => {
        const uid = currentUserId
        toast.dismiss('socket-error')
        queryClient.invalidateQueries({ queryKey: qk._root.privateDiscussionMessages })
        queryClient.invalidateQueries({ queryKey: qk._root.publicDiscussionMessages })
        if (uid) {
          queryClient.invalidateQueries({ queryKey: qk.privateDiscussions(uid) })
          queryClient.invalidateQueries({ queryKey: qk.notifications(uid) })
          queryClient.invalidateQueries({ queryKey: qk.notificationsCount(uid) })
        }
      })

      sharedSocket.on('connect_error', () => {
        // Only show the toast once (avoid spamming on repeated failures)
        toast.error('Connexion temps réel perdue. Tentative de reconnexion…', {
          id: 'socket-error',
          duration: Infinity,
        })
      })
    }

    socketRef.current = sharedSocket
    connectedUsers++

    return () => {
      connectedUsers = Math.max(0, connectedUsers - 1)
      if (connectedUsers <= 0) {
        sharedSocket?.off('tokenExpired')
        sharedSocket?.off('disconnect')
        sharedSocket?.off('reconnect')
        sharedSocket?.off('connect_error')
        sharedSocket?.disconnect()
        sharedSocket = null
        currentUserId = null
        connectedUsers = 0
      }
      socketRef.current = null
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // refreshUser is stable (wrapped in useCallback in AuthContext), intentionally
  // omitted from deps to avoid reconnection loops on profile refresh.

  return socketRef.current
}
