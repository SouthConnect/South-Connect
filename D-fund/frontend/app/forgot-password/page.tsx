'use client'

import { useState } from 'react'
import Link from 'next/link'
import { apiJson } from '@/app/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiJson('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      })
      setSent(true)
    } catch {
      setError('Une erreur est survenue. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 bg-[#3b49df] rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-4">
            D
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-gray-500">
            Entre ton email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-700 text-center">
            <p className="font-semibold mb-1">Email envoyé !</p>
            <p>Si cette adresse existe dans notre système, tu recevras un lien de réinitialisation dans quelques minutes.</p>
            <Link href="/login" className="mt-3 inline-block text-[#3b49df] font-semibold hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                placeholder="toi@exemple.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 text-sm font-bold rounded-lg bg-[#3b49df] text-white hover:bg-[#2d3aba] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
            <div className="text-center">
              <Link href="/login" className="text-sm text-[#3b49df] hover:underline">
                Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
