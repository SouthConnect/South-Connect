'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import TopNav from '@/components/TopNav'
import EmailVerificationBanner from '@/components/EmailVerificationBanner'
import { useAuth } from '@/app/lib/AuthContext'
import { apiJson } from '@/app/lib/api'
import { toast } from 'sonner'
import { Spinner } from '@/components/Spinner'

const RealtimeSync = dynamic(() => import('@/components/RealtimeSync'), { ssr: false })

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/unsubscribe', '/auth', '/onboarding']

const PROTECTED_PREFIXES = [
  '/dashboard', '/my-opportunities', '/applications', '/notifications',
  '/referral', '/saved', '/chat', '/profile', '/admin', '/analytics',
  '/resources', '/settings', '/tasks',
]

// ── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const isAuthPage = AUTH_PATHS.some((p) => pathname?.startsWith(p))

  // localStorage hint : lu synchronement au premier rendu client (lazy initializer).
  // Évite le frame vide où sessionHint=false avant le useEffect, qui causait un flash
  // du layout TopNav (non-connecté) sur les pages protégées au refresh.
  // SSR-safe : typeof window guard retourne false en dehors du navigateur.
  const [sessionHint] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sc_has_session') === '1'
  })

  // Pendant le chargement : on se base sur le hint localStorage.
  // Une fois auth résolu : on utilise la vérité (user).
  const resolvedUser = loading ? sessionHint : !!user

  // Client-side guard : si le refresh silencieux échoue après que le middleware
  // a laissé passer (cookie expiré), on redirige vers login.
  useEffect(() => {
    if (loading) return
    if (user) return
    if (isAuthPage) return
    // /profiles/[userId] commence par /profile mais est public — exclure explicitement
    const isPublicProfile = pathname?.startsWith('/profiles/')
    if (!isPublicProfile && pathname && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [loading, user, pathname, isAuthPage, router])

  // Toast contextuel quand l'API bloque sur email non vérifié
  const handleEmailNotVerified = useCallback(() => {
    toast.error('Email non vérifié', {
      description: 'Vérifiez votre boîte mail ou cliquez pour renvoyer le lien.',
      action: {
        label: 'Renvoyer',
        onClick: async () => {
          try {
            await apiJson('/auth/resend-verification', { method: 'POST' })
            toast.success('Email de vérification envoyé. Vérifiez votre boîte mail.')
          } catch {
            toast.error('Impossible d\'envoyer l\'email. Réessayez dans quelques instants.')
          }
        },
      },
      duration: 8000,
    })
  }, [])

  useEffect(() => {
    window.addEventListener('auth:email-not-verified', handleEmailNotVerified)
    return () => window.removeEventListener('auth:email-not-verified', handleEmailNotVerified)
  }, [handleEmailNotVerified])

  // Pages auth (login, register, etc.) — layout nu
  if (isAuthPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>
  }

  // Auth en cours de résolution sur une route qui dépend de l'état connecté :
  // on affiche un splash plutôt que de laisser le layout flipper entre TopNav et Sidebar.
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  // Non-connecté — top nav, contenu pleine largeur
  if (!resolvedUser) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <TopNav />
        <main className="flex-1">
          {children}
        </main>
      </div>
    )
  }

  // Connecté — sidebar classique
  return (
    <div className="flex min-h-screen bg-gray-50">
      <RealtimeSync />
      <Sidebar />
      <div className="flex-1 min-w-0 md:ml-64 flex flex-col min-h-screen pt-14 md:pt-0">
        {user && user.isEmailVerified === false && <EmailVerificationBanner />}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
