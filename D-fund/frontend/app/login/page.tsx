'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'

// Cette page dépend des search params côté client (bandeau de succès),
// on force donc un rendu dynamique pour éviter les erreurs de pré-rendu.
export const dynamic = 'force-dynamic'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, user, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Rediriger les utilisateurs déjà connectés
  useEffect(() => {
    if (!authLoading && user) {
      const redirect = searchParams?.get('redirect') || '/'
      const safe = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
      router.replace(safe)
    }
  }, [user, authLoading, router, searchParams])

  useEffect(() => {
    if (searchParams?.get('registered') === 'true') {
      setSuccess('Inscription réussie. Veuillez vous connecter pour continuer.')
    }
    const oauthError = searchParams?.get('error')
    if (oauthError === 'google_failed') {
      setError('La connexion via Google a échoué. Réessaie ou connecte-toi avec ton email.')
    } else if (oauthError === 'EMAIL_EXISTS_DIFFERENT_METHOD') {
      setError(
        'Un compte existe déjà avec cette adresse email. Connecte-toi avec ton email et mot de passe, puis lie ton compte Google depuis les paramètres de profil.',
      )
    }
  }, [searchParams])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-[#3b49df] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await apiJson<{ user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      login(data.user)
      // Only allow relative paths to prevent open-redirect attacks
      const raw = searchParams?.get('redirect') || '/'
      const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
      router.push(redirectTo)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-[#3b49df] rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-4">
            S
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Connexion
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Bienvenue sur la plateforme SouthConnect
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm transition-all"
                placeholder="you@example.com"
                autoFocus
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm transition-all"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <Link href="/register" className="font-medium text-[#3b49df] hover:text-[#2d3aba]">
              Pas de compte ? S'inscrire
            </Link>
            <Link href="/forgot-password" className="font-medium text-gray-500 hover:text-gray-700">
              Mot de passe oublié ?
            </Link>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-[#3b49df] hover:bg-[#2d3aba] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3b49df] disabled:opacity-50 transition-all shadow-sm"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-400">ou</span>
            </div>
          </div>

          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/google`}
            className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </a>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement…</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
