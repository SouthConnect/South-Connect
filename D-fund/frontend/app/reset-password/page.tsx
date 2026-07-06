'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiJson } from '@/app/lib/api'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
          <p className="text-red-600 text-sm font-semibold mb-3">Lien invalide ou expiré.</p>
          <Link href="/forgot-password" className="text-[#3b49df] text-sm hover:underline">
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8 || !PASSWORD_REGEX.test(password)) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      await apiJson('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      setDone(true)
      timerRef.current = setTimeout(() => router.push('/login'), 3000)
    } catch (err: any) {
      setError(err?.message || 'Lien invalide ou expiré. Demande un nouveau lien.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 bg-[#3b49df] rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-4">
            S
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Nouveau mot de passe</h1>
          <p className="mt-1 text-sm text-gray-500">Choisis un mot de passe sécurisé (8 caractères min).</p>
        </div>

        {done ? (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-700 text-center">
            <p className="font-semibold mb-1">Mot de passe mis à jour !</p>
            <p>Redirection vers la connexion...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 text-sm font-bold rounded-lg bg-[#3b49df] text-white hover:bg-[#2d3aba] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#3b49df] border-t-transparent rounded-full animate-spin" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
