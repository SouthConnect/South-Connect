'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiJson, apiCall } from '@/app/lib/api'
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

  const refreshUser = async () => {
    try {
      // The access_token cookie is sent automatically (credentials: 'include').
      // The apiCall layer handles silent token refresh on 401.
      const userData = await apiJson<AuthUser>('/auth/me')
      setUser(userData)
    } catch {
      // No valid session — user is unauthenticated
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()

    // When the user verifies their email in another tab and comes back,
    // refresh auth state so the "unverified email" banner disappears immediately.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUser()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
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
