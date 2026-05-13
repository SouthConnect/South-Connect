'use client'

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
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

  const refreshUser = async (force = false) => {
    // Prevent concurrent calls (mount + visibilitychange firing at the same time)
    if (isRefreshing.current) return
    // Skip if data is still fresh — avoids an extra /auth/me on every tab switch
    if (!force && Date.now() - lastRefreshAt.current < REFRESH_STALE_MS) return
    isRefreshing.current = true
    try {
      // apiCall handles silent token refresh on 401 internally before returning.
      const response = await apiCall('/auth/me')
      if (response.ok) {
        setUser(await response.json() as AuthUser)
        lastRefreshAt.current = Date.now()
      } else if (response.status === 401) {
        // 401 = not authenticated (token absent/expired) → clear session.
        // 403 = authenticated but email not verified or action forbidden → keep session.
        setUser(null)
      }
      // 5xx / network errors: keep the current user state so a momentary backend
      // hiccup does not log the user out.
    } catch {
      // Network-level error (offline, timeout, CORS) — preserve current state.
    } finally {
      isRefreshing.current = false
      setLoading(false)
    }
  }

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
  }, [])

  const login = (userData: AuthUser) => {
    setUser(userData)
  }

  const logout = async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' })
    } catch {
      // Best-effort — clear local state regardless
    }
    queryClient.clear()
    setUser(null)
    // Notify all other open tabs so they clear their session immediately
    channel.current?.postMessage('logout')
  }

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
