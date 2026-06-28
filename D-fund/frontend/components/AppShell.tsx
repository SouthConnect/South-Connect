'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { MailWarning, X, Menu } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/app/lib/AuthContext'
import { apiJson } from '@/app/lib/api'
import { toast } from 'sonner'

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/unsubscribe', '/auth']

const PROTECTED_PREFIXES = [
  '/dashboard', '/my-opportunities', '/applications', '/notifications',
  '/referral', '/saved', '/chat', '/profile', '/admin', '/analytics',
  '/resources', '/settings', '/tasks',
]

const TOP_NAV_LINKS = [
  { href: '/',           label: 'Accueil'     },
  { href: '/community',  label: 'Communauté'  },
  { href: '/explore',    label: 'Explorer'    },
  { href: '/features',   label: 'Nouveautés'  },
]

// ── Top nav (non-connectés) ──────────────────────────────────────────────────

function TopNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Ferme le menu mobile sur changement de route
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm leading-none">S</span>
          </div>
          <span className="text-sm font-bold text-gray-900 tracking-tight">SouthConnect</span>
        </Link>

        {/* Liens — desktop */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {TOP_NAV_LINKS.map(({ href, label }) => {
            const isActive = href === '/' ? pathname === '/' : pathname?.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#3b49df]/10 text-[#3b49df]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Boutons auth — desktop */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <Link
            href="/login"
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="px-4 py-1.5 text-sm font-bold bg-[#3b49df] text-white rounded-lg hover:bg-[#2d3aba] transition-colors shadow-sm"
          >
            S&apos;inscrire →
          </Link>
        </div>

        {/* Hamburger — mobile */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden ml-auto p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {TOP_NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {label}
            </Link>
          ))}
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <Link
              href="/login"
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 text-center transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="block px-3 py-2.5 rounded-lg text-sm font-bold bg-[#3b49df] text-white text-center hover:bg-[#2d3aba] transition-colors"
            >
              S&apos;inscrire →
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

// ── Email verification banner ────────────────────────────────────────────────

function EmailVerificationBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)

  if (dismissed) return null

  const resend = async () => {
    setSending(true)
    try {
      await apiJson('/auth/resend-verification', { method: 'POST' })
      toast.success('Email de vérification envoyé. Vérifiez votre boîte mail.')
    } catch {
      toast.error('Impossible d\'envoyer l\'email. Réessayez dans quelques instants.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-800">
      <MailWarning className="w-4 h-4 shrink-0 text-amber-600" />
      <span className="flex-1">
        Votre adresse email n&apos;est pas encore vérifiée. Certaines fonctionnalités sont restreintes.{' '}
        <button
          onClick={resend}
          disabled={sending}
          className="font-semibold underline underline-offset-2 hover:text-amber-900 disabled:opacity-60"
        >
          {sending ? 'Envoi…' : 'Renvoyer l\'email'}
        </button>
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Fermer"
        className="text-amber-600 hover:text-amber-900"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

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
        <div className="w-7 h-7 rounded-full border-2 border-[#3b49df] border-t-transparent animate-spin" />
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
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {user && user.isEmailVerified === false && <EmailVerificationBanner />}
        <main className="flex-1 pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}
