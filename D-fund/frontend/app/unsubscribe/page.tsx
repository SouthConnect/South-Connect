'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BellOff, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { apiJson } from '@/app/lib/api'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') ?? ''

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleUnsubscribe = async () => {
    if (!token) {
      setStatus('error')
      setMessage('Lien de désabonnement invalide ou manquant.')
      return
    }

    setStatus('loading')
    try {
      const res = await apiJson('/auth/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
      setStatus('success')
      setMessage(res.message || 'Vous avez bien été désabonné.')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">

      {status === 'idle' && (
        <>
          <BellOff className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Se désabonner des emails</h1>
          <p className="text-gray-600 mb-6">
            Vous ne recevrez plus d&apos;emails de notification de D-Fund. Vous pourrez vous réabonner
            à tout moment depuis votre profil.
          </p>
          {!token && (
            <p className="text-red-500 text-sm mb-4">Lien invalide. Veuillez utiliser le lien reçu par email.</p>
          )}
          <button
            onClick={handleUnsubscribe}
            disabled={!token}
            className="w-full px-6 py-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmer le désabonnement
          </button>
          <Link href="/" className="block mt-3 text-sm text-gray-500 hover:text-gray-700">
            Annuler
          </Link>
        </>
      )}

      {status === 'loading' && (
        <>
          <Loader2 className="mx-auto mb-4 h-12 w-12 text-blue-500 animate-spin" />
          <p className="text-gray-600">Traitement en cours…</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Désabonnement confirmé</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </>
      )}
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" /></div>}>
        <UnsubscribeContent />
      </Suspense>
    </div>
  )
}
