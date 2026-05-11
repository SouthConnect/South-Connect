'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { MailWarning, X } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/app/lib/AuthContext'
import { apiJson } from '@/app/lib/api'
import { toast } from 'sonner'

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/unsubscribe', '/auth']

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
        Votre adresse email n'est pas encore vérifiée. Certaines fonctionnalités sont restreintes.{' '}
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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const isAuthPage = AUTH_PATHS.some((p) => pathname?.startsWith(p))

  if (isAuthPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>
  }

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
