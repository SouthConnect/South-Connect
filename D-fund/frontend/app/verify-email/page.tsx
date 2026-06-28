'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refreshUser } = useAuth()
  const token = searchParams?.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Lien de vérification manquant.')
      return
    }

    let cancelled = false
    apiJson(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async () => {
        if (cancelled) return
        setStatus('success')
        setMessage('Votre adresse email a été confirmée avec succès !')
        // Await refreshUser so the AuthContext has isEmailVerified:true
        // before the redirect fires — prevents the banner flashing on /
        await refreshUser()
        if (cancelled) return
        timerRef.current = setTimeout(() => router.push('/'), 3000)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setStatus('error')
        setMessage(err.message || 'Lien invalide ou expiré.')
      })

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [token, refreshUser, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-[#3b49df] animate-spin mx-auto mb-4" />
            <h1 className="text-lg font-bold text-gray-900">Vérification en cours…</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-gray-900 mb-2">Email vérifié !</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <p className="text-xs text-gray-400">Redirection automatique dans 3 secondes…</p>
            <Link href="/" className="mt-4 inline-block px-6 py-2 bg-[#3b49df] text-white rounded-lg font-semibold text-sm hover:bg-[#2d3aba] transition-colors">
              Aller sur SouthConnect
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-gray-900 mb-2">Lien invalide</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <div className="flex flex-col gap-2">
              <Link href="/profile" className="px-6 py-2 bg-[#3b49df] text-white rounded-lg font-semibold text-sm hover:bg-[#2d3aba] transition-colors">
                Renvoyer un email
              </Link>
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
                Retour à l&apos;accueil
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#3b49df] animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
