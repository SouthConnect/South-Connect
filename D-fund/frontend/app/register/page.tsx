'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export default function RegisterPage() {
  const router = useRouter()
  const { login, user, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/

  // Rediriger les utilisateurs déjà connectés
  useEffect(() => {
    if (!authLoading && user) router.replace('/')
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Mirror the backend @Matches validation so the user gets a clear message
    // before the request is even sent.
    if (!PASSWORD_REGEX.test(formData.password)) {
      setError('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.')
      return
    }

    setLoading(true)

    try {
      const registerData = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
      }

      const data = await apiJson<{ user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerData),
      })

      login(data.user)
      router.push('/onboarding')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || user) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-[#3b49df] rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-4">
            S
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Créer un compte
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Rejoignez l&apos;écosystème SouthConnect
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm transition-all"
                  placeholder="John"
                  autoFocus
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm transition-all"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm transition-all"
                placeholder="you@example.com"
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
                autoComplete="new-password"
                required
                minLength={8}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm transition-all"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              {/* Password strength indicator */}
              {formData.password.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => {
                      const strength =
                        formData.password.length >= 12 && /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password) && /[^A-Za-z0-9]/.test(formData.password) ? 4
                        : formData.password.length >= 10 && /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password) ? 3
                        : formData.password.length >= 8 ? 2
                        : 1
                      return (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            level <= strength
                              ? strength === 1 ? 'bg-red-400'
                              : strength === 2 ? 'bg-yellow-400'
                              : strength === 3 ? 'bg-blue-400'
                              : 'bg-green-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {formData.password.length < 8 ? 'Min. 8 caractères'
                      : formData.password.length < 10 ? 'Faible — ajoutez des chiffres et une majuscule'
                      : /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password) && /[^A-Za-z0-9]/.test(formData.password) && formData.password.length >= 12 ? '✓ Mot de passe fort'
                      : 'Bon — ajoutez un caractère spécial pour le renforcer'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="text-sm">
            <Link href="/login" className="font-medium text-[#3b49df] hover:text-[#2d3aba]">
              Déjà un compte ? Se connecter
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-[#3b49df] hover:bg-[#2d3aba] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3b49df] disabled:opacity-50 transition-all shadow-sm"
          >
            {loading ? 'Création en cours…' : 'Créer un compte'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-400">ou</span>
            </div>
          </div>

          <a
            href={`${API_BASE}/auth/google`}
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
