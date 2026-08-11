'use client'

import { useState } from 'react'
import { MailWarning, X } from 'lucide-react'
import { apiJson } from '@/app/lib/api'
import { toast } from 'sonner'

/** Bannière affichée aux utilisateurs connectés dont l'email n'est pas encore vérifié. */
export default function EmailVerificationBanner() {
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
