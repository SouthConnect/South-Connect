'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/lib/AuthContext'
import { qk } from '@/app/lib/queryKeys'
import { toast } from 'sonner'

const SocketContext = createContext<Socket | null>(null)

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
 * Owns the single Socket.IO connection to the /chat namespace and exposes it
 * through React context. One <SocketProvider> = one connection for the whole
 * app; consumers just read it via useSocket() below.
 *
 * This replaces the previous useSocket.ts design, which kept the connection
 * in a module-level mutable variable (`sharedSocket`, ref-counted by a
 * `connectedUsers` counter) — invisible to React, so nothing re-rendered
 * reliably when the instance changed, and lifecycle bookkeeping (ref-count,
 * "did the user change" checks) had to be done by hand. Here the instance
 * lives in useState, owned by exactly one effect, so React re-renders
 * consumers correctly when it changes, and swapping/disposing the socket on
 * login/logout/user-switch is just the normal cleanup-before-reeffect that
 * React already gives every effect keyed on `user?.id` — no manual ref count.
 *
 * Bug fixed while doing this: Socket.IO's `reconnect` event (and
 * `reconnect_attempt` / `reconnect_error` / `reconnect_failed`) is emitted by
 * the *Manager*, not by the Socket instance — see socket.io-client's
 * `Socket#subEvents()`, which only forwards the Manager's `open` / `packet` /
 * `error` / `close` events onto the socket. `socket.on('reconnect', ...)`
 * therefore never fires; the event only exists on `socket.io`
 * (`socket.io.on('reconnect', ...)`). Every previous `socket.on('reconnect',
 * ...)` registration in this codebase (the old useSocket.ts, plus both
 * chat/private and chat/public discussion pages) was dead code — which is
 * the real root cause of "some pages recover after a network blip, others
 * silently don't": *none* of them ever ran. Fixed here by listening on
 * `socket.io` instead. The per-page listeners in the chat pages need the
 * same fix (see chat/private/[id]/page.tsx and chat/public/[id]/page.tsx) —
 * both listening on `socket.io.on('reconnect', ...)` for the same underlying
 * Manager event is intentional, not a duplicate-handler bug: EventEmitter
 * dispatches to every registered listener, and the two handlers do disjoint
 * work (this one does light, app-wide invalidation; the page-level one
 * re-joins that page's room and refetches only that conversation).
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth()
  const queryClient = useQueryClient()
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!user) {
      setSocket(null)
      return
    }

    const s = createSocket()

    // Token expired: the server disconnected us intentionally — silently
    // refresh auth so the next reconnect attempt carries a fresh cookie.
    s.on('tokenExpired', () => {
      refreshUser()
    })

    // "io server disconnect" = backend kicked us (token expired / banned).
    // Any other reason = network blip that socket.io will retry automatically.
    s.on('disconnect', (reason: string) => {
      if (reason === 'io server disconnect') {
        refreshUser()
      }
    })

    // Reconnect (Manager-level event, see doc comment above): dismiss the
    // error toast and refetch the lightweight, always-relevant data
    // (conversation list + notification badges). The message cache of
    // whichever discussion is actually open is refreshed by that page's own
    // reconnect handler (chat/private|public/[id]/page.tsx) — invalidating
    // every cached discussion's messages here, open or not, would trigger a
    // refetch storm on every reconnection.
    s.io.on('reconnect', () => {
      toast.dismiss('socket-error')
      queryClient.invalidateQueries({ queryKey: qk.privateDiscussions(user.id) })
      queryClient.invalidateQueries({ queryKey: qk.notifications(user.id) })
      queryClient.invalidateQueries({ queryKey: qk.notificationsCount(user.id) })
    })

    s.on('connect_error', () => {
      // Only show the toast once (avoid spamming on repeated failures)
      toast.error('Connexion temps réel perdue. Tentative de reconnexion…', {
        id: 'socket-error',
        duration: Infinity,
      })
    })

    setSocket(s)

    return () => {
      s.off('tokenExpired')
      s.off('disconnect')
      s.io.off('reconnect')
      s.off('connect_error')
      s.disconnect()
      setSocket(null)
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // refreshUser is stable (wrapped in useCallback in AuthContext), intentionally
  // omitted from deps to avoid reconnection loops on profile refresh.

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}

/**
 * Returns the shared /chat Socket.IO connection, or null while it is not
 * (yet) connected — e.g. before login, or during the brief window while a
 * previous connection is being torn down on user switch/logout.
 */
export function useSocket(): Socket | null {
  return useContext(SocketContext)
}
