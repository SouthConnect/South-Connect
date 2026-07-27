'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Globe,
  DollarSign,
  MessageSquare,
  Bell,
  LayoutDashboard,
  User,
  BarChart2,
  Users,
  Rocket,
  LogOut,
  LogIn,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/app/lib/AuthContext'
import { apiJson } from '@/app/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/app/lib/queryKeys'
import { useState, useEffect } from 'react'
import type { PrivateDiscussion } from '@/app/lib/types'

// ── Navigation items ────────────────────────────────────────────────────────

const TOP_LINKS = [
  { href: '/',               label: 'Accueil',       icon: Globe         },
  { href: '/referral',       label: 'Parrainage',    icon: DollarSign    },
  { href: '/chat',           label: 'Chat',          icon: MessageSquare },
  { href: '/notifications',  label: 'Notifications', icon: Bell          },
]

const BOTTOM_LINKS = [
  { href: '/dashboard',  label: 'Tableau de bord',      icon: LayoutDashboard },
  { href: '/profile',    label: 'Mon profil',            icon: User            },
  { href: '/analytics',  label: 'Analytiques',           icon: BarChart2       },
  { href: '/community',  label: 'Communauté',            icon: Users           },
  { href: '/features',   label: 'Nouveautés',            icon: Rocket          },
]

// ── Component ───────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname   = usePathname()
  const router     = useRouter()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const queryClient = useQueryClient()

  // Badge de non-lus sur le lien Chat
  const { data: privateDiscussions } = useQuery({
    queryKey: qk.privateDiscussions(user?.id ?? ''),
    queryFn: () => apiJson('/messages/private'),
    enabled: !!user?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  const unreadChatCount = (privateDiscussions as PrivateDiscussion[] | undefined)?.reduce((acc, d) => {
    const mine = d.participants?.find((p) => p.userId === user?.id)
    return acc + (mine?.unreadCount ?? 0)
  }, 0) ?? 0

  // Badge de non-lus sur le lien Notifications (mis à jour en temps réel via WebSocket)
  const { data: notifCountData } = useQuery({
    queryKey: qk.notificationsCount(user?.id ?? ''),
    queryFn: () => apiJson('/notifications/unread-count'),
    enabled: !!user?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  const unreadNotifCount = (notifCountData as { count: number } | undefined)?.count ?? 0

  // Toasts WebSocket pour les notifications temps réel
  // Fermeture auto sur changement de route (mobile)
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const prefetchRoute = (href: string) => {
    const opts = { staleTime: 3 * 60 * 1000 }
    switch (href) {
      case '/community':
        queryClient.prefetchQuery({ queryKey: qk.communityMembers(),   queryFn: () => apiJson('/profiles/lists/members?take=60'),   ...opts })
        queryClient.prefetchQuery({ queryKey: qk.communityTalents(),   queryFn: () => apiJson('/profiles/lists/talents?take=60'),   ...opts })
        queryClient.prefetchQuery({ queryKey: qk.communityCompanies(), queryFn: () => apiJson('/profiles/lists/companies?take=60'), ...opts })
        break
      case '/notifications':
        if (user?.id) {
          queryClient.prefetchQuery({ queryKey: qk.notifications(user.id), queryFn: () => apiJson('/notifications?take=20'), staleTime: 30_000 })
        }
        break
      case '/dashboard':
        if (user?.id) {
          queryClient.prefetchQuery({ queryKey: qk.myApplications(user.id),          queryFn: () => apiJson(`/applications/user/${user.id}`),          ...opts })
          queryClient.prefetchQuery({ queryKey: qk.myOpportunitiesDashboard(user.id), queryFn: () => apiJson(`/opportunities/user/${user.id}?take=10`), ...opts })
        }
        break
    }
  }

  // Liens auth-gated filtrés selon connexion
  const topLinks    = TOP_LINKS.filter(l => l.href === '/' || !!user)
  const bottomLinks = [
    ...BOTTOM_LINKS.filter((l) => {
      if (!user && (l.href === '/analytics' || l.href === '/dashboard' || l.href === '/profile')) return false
      return true
    }),
    ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ]

  return (
    <>
      {/* ── Hamburger mobile ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-[#1e2d6d] text-white rounded-lg flex items-center justify-center shadow-md"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Overlay mobile ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed left-0 top-0 h-screen w-64
        bg-[#1e2d6d] text-white
        flex flex-col z-50
        transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="px-4 py-5 flex items-center justify-between shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white font-black text-base leading-none">S</span>
            </div>
            <span className="text-base font-bold tracking-tight">SouthConnect</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-white/50 hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-1">

          {/* Groupe 1 */}
          <div className="space-y-0.5">
            {topLinks.map(link => (
              <NavLink
                key={link.href}
                {...link}
                pathname={pathname}
                onPrefetch={() => prefetchRoute(link.href)}
                badge={
                link.href === '/chat' && unreadChatCount > 0 ? unreadChatCount
                : link.href === '/notifications' && unreadNotifCount > 0 ? unreadNotifCount
                : undefined
              }
              />
            ))}
          </div>

          {/* Espacement entre les deux groupes */}
          <div className="mt-5" />

          {/* Groupe 2 */}
          <div className="space-y-0.5">
            {bottomLinks.map(link => (
              <NavLink key={link.href} {...link} pathname={pathname} onPrefetch={() => prefetchRoute(link.href)} />
            ))}
          </div>
        </nav>

        {/* Profil / Connexion */}
        <div className="px-2 py-3 border-t border-white/10 shrink-0">
          {user ? (
            <div className="space-y-0.5">
              <Link
                href="/profile"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                  {user.profilePic
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={user.profilePic} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                    : <span className="text-sm font-bold">{user.name?.[0] || 'U'}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-xs text-white/50 truncate">{user.email}</p>
                </div>
              </Link>
              <button
                onClick={async () => { await logout(); router.push('/') }}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-white text-[#1e2d6d] rounded-lg font-semibold hover:bg-white/90 transition-colors text-sm"
            >
              <LogIn className="w-4 h-4" />
              Se connecter
            </Link>
          )}
        </div>
      </aside>
    </>
  )
}

// ── NavLink ─────────────────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  badge,
  onPrefetch,
}: {
  href: string
  label: string
  icon: React.ElementType
  pathname: string | null
  badge?: number
  onPrefetch?: () => void
}) {
  const isActive =
    href === '/'
      ? pathname === '/'
      : pathname === href || (pathname?.startsWith(href + '/') ?? false)

  return (
    <Link
      href={href}
      onMouseEnter={onPrefetch}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
        transition-colors
        ${isActive
          ? 'bg-[#3b49df] text-white'
          : 'text-white/70 hover:text-white hover:bg-white/10'
        }
      `}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}

