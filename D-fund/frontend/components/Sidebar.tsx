'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Users,
  MessageSquare,
  LayoutDashboard,
  UserCircle,
  TrendingUp,
  Users2,
  PlusCircle,
  Compass,
  Bookmark,
  LogOut,
  LogIn,
  Bell,
  Menu,
  X,
  ShieldCheck,
  Search,
  CheckSquare,
  Layers,
  Briefcase,
  Info,
} from 'lucide-react'
import { useAuth } from '@/app/lib/AuthContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useSocket } from '@/app/hooks/useSocket'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const queryClient = useQueryClient()
  const socket = useSocket()

  // Real-time notification delivery — listen for server-pushed notifications
  useEffect(() => {
    if (!socket || !user) return

    const handleNotification = (notif: { title: string; body?: string; link?: string }) => {
      toast(notif.title, {
        description: notif.body,
        action: notif.link
          ? { label: 'Voir', onClick: () => router.push(notif.link!) }
          : undefined,
      })
      // Refresh unread count badge
      queryClient.invalidateQueries({ queryKey: ['notifications-count', user.id] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    socket.on('notification', handleNotification)
    return () => { socket.off('notification', handleNotification) }
  }, [socket, user, router, queryClient])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQ.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(searchQ.trim())}`)
      setSearchQ('')
      setMobileOpen(false)
    }
  }

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count', user?.id],
    queryFn: () => apiJson('/notifications/unread-count'),
    enabled: !!user?.id,
    refetchInterval: 30000,
  })
  const unreadCount: number = notifData?.count ?? 0

  // ── Section: top-level ──────────────────────────────────────────
  const mainLinks = [
    { href: '/', label: 'Accueil', icon: Home },
    { href: '/explore', label: 'Explorer', icon: Compass },
    { href: '/profiles', label: 'Personnes', icon: UserCircle },
    { href: '/community', label: 'Communauté', icon: Users2 },
  ]

  // ── Section: my content (auth-gated) ────────────────────────────
  const myLinks = user ? [
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/my-opportunities', label: 'Mes Opportunités', icon: Briefcase },
    { href: '/applications', label: 'Mes Candidatures', icon: CheckSquare },
    { href: '/analytics', label: 'Analytiques', icon: TrendingUp },
    { href: '/saved', label: 'Enregistrés', icon: Bookmark },
    { href: '/tasks', label: 'Tâches', icon: CheckSquare },
  ] : []

  // ── Section: messaging & notifications ──────────────────────────
  const socialLinks = user ? [
    { href: '/chat', label: 'Messages', icon: MessageSquare },
    { href: '/notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { href: '/referral', label: 'Parrainage', icon: Users },
  ] : []

  // ── Section: discover ────────────────────────────────────────────
  const discoverLinks = [
    { href: '/resources', label: 'Ressources', icon: Layers },
    { href: '/features', label: 'Feuille de route', icon: PlusCircle },
    { href: '/about', label: 'À propos', icon: Info },
    ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ]

  const NavLink = ({ href, label, icon: Icon, badge }: any) => {
    const isActive = href === '/' ? pathname === '/' : pathname === href || pathname?.startsWith(href + '/')
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-white/10 text-white'
            : 'text-white/70 hover:text-white hover:bg-white/5'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="flex-1">{label}</span>
        {badge > 0 && (
          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-[#3b49df] text-white rounded-lg flex items-center justify-center shadow-md"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

    <aside className={`fixed left-0 top-0 h-screen w-64 bg-[#3b49df] text-white flex flex-col z-50 transition-transform duration-200 ${
      mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    }`}>
      <div className="p-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-[#3b49df]">
            D
          </div>
          D-fund
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-white/70 hover:text-white"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSearch} className="px-4 mb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-9 pr-3 py-2 bg-white/10 text-white placeholder-white/40 text-xs rounded-lg border border-white/10 focus:outline-none focus:bg-white/20"
          />
        </div>
      </form>

      <nav className="flex-1 overflow-y-auto py-4">
        {/* Main */}
        <div className="space-y-1">
          {mainLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </div>

        {/* My Content — auth only */}
        {myLinks.length > 0 && (
          <div className="mt-6">
            <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
              Mon Espace
            </div>
            <div className="mt-1 space-y-1">
              {myLinks.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
            </div>
          </div>
        )}

        {/* Social — auth only */}
        {socialLinks.length > 0 && (
          <div className="mt-6">
            <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
              Social
            </div>
            <div className="mt-1 space-y-1">
              {socialLinks.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
            </div>
          </div>
        )}

        {/* Discover */}
        <div className="mt-6">
          <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
            Découvrir
          </div>
          <div className="mt-1 space-y-1">
            {discoverLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </div>
        </div>
      </nav>

      {/* Bannière vérification email */}
      {user && user.isEmailVerified === false && (
        <VerifyEmailBanner />
      )}

      <div className="p-4 border-t border-white/10">
        {user ? (
          <div className="space-y-2">
            <Link href="/profile" className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 rounded-lg transition-colors">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                {user.profilePic ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profilePic} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{user.name?.[0] || 'U'}</span>
                )}
              </div>
              <div className="flex-1 truncate">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-xs text-white/50 truncate">{user.email}</div>
              </div>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-2 bg-white text-[#3b49df] rounded-lg font-semibold hover:bg-white/90 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Connexion
          </Link>
        )}
      </div>
    </aside>
    </>
  )
}

function VerifyEmailBanner() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { refreshUser } = useAuth()

  // Poll every 10 s so the banner disappears automatically once the user
  // clicks the link in another tab without needing a manual page refresh.
  useEffect(() => {
    const interval = setInterval(() => refreshUser(), 10_000)
    return () => clearInterval(interval)
  }, [refreshUser])

  const handleResend = async () => {
    if (loading || sent) return
    setLoading(true)
    try {
      await apiJson('/auth/resend-verification', { method: 'POST' })
      setSent(true)
      toast.success('Email de vérification renvoyé !')
    } catch (err: any) {
      toast.error(err.message || 'Impossible d\'envoyer l\'email. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-3 mb-2 px-3 py-2.5 rounded-xl bg-yellow-400/20 border border-yellow-400/30">
      <p className="text-xs font-semibold text-yellow-200 mb-0.5">Email non vérifié</p>
      <p className="text-[10px] text-yellow-200/70 mb-1.5">
        Vérifiez votre boîte mail pour confirmer votre compte.
      </p>
      <button
        onClick={handleResend}
        disabled={loading || sent}
        className="text-[10px] font-semibold text-yellow-300 hover:text-white underline underline-offset-2 disabled:opacity-50 disabled:cursor-default"
      >
        {loading ? 'Envoi…' : sent ? 'Email envoyé ✓' : 'Renvoyer l\'email'}
      </button>
    </div>
  )
}
