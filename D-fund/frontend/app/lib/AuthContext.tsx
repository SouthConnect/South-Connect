'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiJson, getAuthToken, removeAuthToken } from '@/app/lib/api'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  name?: string
  role: string
  profilePic?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (token: string, userData: User) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    const token = getAuthToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const userData = await apiJson<User>('/auth/me')
      setUser(userData)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      removeAuthToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const login = (token: string, userData: User) => {
    setUser(userData)
  }

  const logout = () => {
    removeAuthToken()
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
