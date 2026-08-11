'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Menu } from 'lucide-react'

const TOP_NAV_LINKS = [
  { href: '/',           label: 'Accueil'     },
  { href: '/community',  label: 'Communauté'  },
  { href: '/explore',    label: 'Explorer'    },
  { href: '/features',   label: 'Nouveautés'  },
]

/** Barre de navigation publique (visiteurs non connectés), avec menu mobile. */
export default function TopNav() {
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
