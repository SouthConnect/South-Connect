'use client'

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiCall } from '@/app/lib/api'
import type { AuthUser } from '@/app/lib/types'

/** Channel name shared by all tabs of the same origin. */
const AUTH_CHANNEL = 'dfund_auth'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (userData: AuthUser) => void
  logout: () => Promise<void>
  /** Re-fetches /auth/me. Pass force=true to bypass the 60s stale window. */
  refreshUser: (force?: boolean) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()
  const isRefreshing = useRef(false)
  const lastRefreshAt = useRef<number>(0)
  const channel = useRef<BroadcastChannel | null>(null)
  const visibilityDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Minimum ms between two successive /auth/me calls — matches staleTime. */
  const REFRESH_STALE_MS = 60_000

  const refreshUser = useCallback(async (force = false) => {
    if (isRefreshing.current) return
    if (!force && Date.now() - lastRefreshAt.current < REFRESH_STALE_MS) return
    isRefreshing.current = true
    try {
      const response = await apiCall('/auth/me')
      if (response.ok) {
        setUser(await response.json() as AuthUser)
        lastRefreshAt.current = Date.now()
        localStorage.setItem('sc_has_session', '1')
      } else if (response.status === 401) {
        setUser(null)
        localStorage.removeItem('sc_has_session')
      }
    } catch {
      // Network-level error — preserve current state.
    } finally {
      isRefreshing.current = false
      setLoading(false)
    }
  }, []) // deps: only refs and stable setters — intentionally empty

  useEffect(() => {
    refreshUser(true) // cold-start: always fetch regardless of stale window

    // BroadcastChannel: synchronise l'état auth entre onglets du même navigateur.
    // Logout sur l'onglet A → les autres onglets voient user=null immédiatement.
    // Login/refresh sur l'onglet A → les autres onglets re-fetch /auth/me.
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel.current = new BroadcastChannel(AUTH_CHANNEL)
      channel.current.onmessage = (e: MessageEvent<string>) => {
        if (e.data === 'logout') {
          queryClient.clear()
          setUser(null)
          setLoading(false)
        } else if (e.data === 'login') {
          refreshUser()
        }
      }
    }

    // visibilitychange avec debounce 500ms — évite les appels en rafale si l'utilisateur
    // bascule rapidement entre onglets.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (visibilityDebounce.current) clearTimeout(visibilityDebounce.current)
      visibilityDebounce.current = setTimeout(() => {
        refreshUser()
      }, 500)
    }

    // Fired by apiCall when a 401 is received AND the silent refresh also fails.
    const handleSessionExpired = () => {
      queryClient.clear()
      setUser(null)
      setLoading(false)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('auth:session-expired', handleSessionExpired)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('auth:session-expired', handleSessionExpired)
      if (visibilityDebounce.current) clearTimeout(visibilityDebounce.current)
      channel.current?.close()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback((userData: AuthUser) => {
    setUser(userData)
    localStorage.setItem('sc_has_session', '1')
    channel.current?.postMessage('login')
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' })
    } catch {
      // Best-effort — clear local state regardless
    }
    // Clear ALL query cache on logout — wipes isLiked/isSaved/social state
    // that would otherwise remain visible after the user disconnects.
    queryClient.clear()
    setUser(null)
    localStorage.removeItem('sc_has_session')
    channel.current?.postMessage('logout')
  }, [queryClient])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
