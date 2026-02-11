'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  LogIn
} from 'lucide-react'
import { useAuth } from '@/app/lib/AuthContext'

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const mainLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/referral', label: 'Referral', icon: Users },
    { href: '/chat', label: 'Chat', icon: MessageSquare },
  ]

  const exploreLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profiles', label: 'Profiles', icon: UserCircle },
    { href: '/analytics', label: 'Business analytics', icon: TrendingUp },
    { href: '/community', label: 'Community', icon: Users2 },
    { href: '/features', label: 'New Features', icon: PlusCircle },
    { href: '/explore', label: 'Explore', icon: Compass },
  ]

  const userLinks = user ? [
    { href: '/saved', label: 'Saved', icon: Bookmark },
    { href: '/applications', label: 'My Applications', icon: MessageSquare },
  ] : []

  const NavLink = ({ href, label, icon: Icon }: any) => {
    const isActive = pathname === href
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
        {label}
      </Link>
    )
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#3b49df] text-white flex flex-col z-50">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-[#3b49df]">
            D
          </div>
          D-fund
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1">
          {mainLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </div>

        {userLinks.length > 0 && (
          <div className="mt-8">
            <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
              My Content
            </div>
            <div className="mt-2 space-y-1">
              {userLinks.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
            Explore
          </div>
          <div className="mt-2 space-y-1">
            {exploreLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-white/10">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                {user.profilePic ? (
                  <img src={user.profilePic} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  user.name?.[0] || 'U'
                )}
              </div>
              <div className="flex-1 truncate">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-xs text-white/50 truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-2 bg-white text-[#3b49df] rounded-lg font-semibold hover:bg-white/90 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Sign In
          </Link>
        )}
      </div>
    </aside>
  )
}
