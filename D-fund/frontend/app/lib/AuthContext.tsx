'use client'

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiCall } from '@/app/lib/api'
import type { AuthUser } from '@/app/lib/types'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (userData: AuthUser) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()
  const isRefreshing = useRef(false)

  const refreshUser = async () => {
    // Prevent concurrent calls (mount + visibilitychange firing at the same time)
    if (isRefreshing.current) return
    isRefreshing.current = true
    try {
      // apiCall handles silent token refresh on 401 internally before returning.
      const response = await apiCall('/auth/me')
      if (response.ok) {
        setUser(await response.json() as AuthUser)
      } else if (response.status === 401 || response.status === 403) {
        // Server explicitly says "not authenticated" — clear the session.
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
    refreshUser()

    // When the user verifies their email in another tab and comes back,
    // refresh auth state so the "unverified email" banner disappears immediately.
    // We do this manually (not via refetchOnWindowFocus) because AuthContext is
    // outside React Query and manages its own state.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUser()
      }
    }

    // Fired by apiCall when a 401 is received AND the silent refresh also fails.
    // This means the session is definitively expired — clear local state immediately
    // so the user is redirected to login rather than seeing confusing mutation errors.
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
    }
  }, [])

  const login = (userData: AuthUser) => {
    setUser(userData)
  }

  const logout = async () => {
    try {
      // Ask the backend to clear the HttpOnly cookies (browser JS cannot clear them)
      await apiCall('/auth/logout', { method: 'POST' })
    } catch {
      // Best-effort — clear local state regardless
    }
    // Wipe all cached query data so a different user logging in on the same
    // browser never sees stale data from the previous session
    queryClient.clear()
    setUser(null)
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
