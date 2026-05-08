'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { apiJson } from '@/app/lib/api'
import { Suspense } from 'react'
import type { AuthUser } from '@/app/lib/types'

/**
 * Landing page after a successful Google OAuth redirect.
 *
 * The backend already set the HttpOnly auth cookies before redirecting here —
 * we only need to fetch the user profile and update React state.
 * No token ever appears in the URL.
 */
function GoogleSuccessContent() {
  const router = useRouter()
  const { login } = useAuth()

  useEffect(() => {
    // The access_token cookie was set by the backend on /auth/google/callback.
    // Just fetch the current user — credentials (cookies) are sent automatically.
    apiJson<AuthUser>('/auth/me')
      .then((user) => {
        login(user)
        router.replace('/')
      })
      .catch(() => {
        router.replace('/login?error=google_failed')
      })
  }, [login, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#3b49df] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Connexion en cours...</p>
      </div>
    </div>
  )
}

export default function GoogleSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#3b49df] border-t-transparent rounded-full animate-spin" /></div>}>
      <GoogleSuccessContent />
    </Suspense>
  )
}
