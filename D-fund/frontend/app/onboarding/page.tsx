'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { apiJson } from '@/app/lib/api'
import AuthGuard from '@/components/AuthGuard'
import { CheckCircle, ArrowRight, MapPin, User, Briefcase } from 'lucide-react'

const PROFILE_TYPES = [
  { id: 'entrepreneur', label: 'Entrepreneur', desc: 'Je construis ou développe une entreprise', emoji: '🚀' },
  { id: 'professionnel', label: 'Professionnel', desc: 'Je cherche des opportunités de carrière', emoji: '💼' },
  { id: 'etudiant', label: 'Étudiant / Chercheur', desc: 'En formation, je cherche bourses ou stages', emoji: '🎓' },
  { id: 'investisseur', label: 'Investisseur / BA', desc: "J'investis ou j'accompagne des startups", emoji: '📈' },
]

const COUNTRIES = [
  'France', 'Belgique', 'Suisse', 'Canada', 'États-Unis', 'Royaume-Uni', 'Allemagne',
  'Pays-Bas', 'Espagne', 'Italie', 'Portugal',
  'Sénégal', "Côte d'Ivoire", 'Cameroun', 'Mali', 'Guinée', 'Congo (RDC)', 'Congo (République)',
  'Gabon', 'Madagascar', 'Maroc', 'Tunisie', 'Algérie', 'Mauritanie', 'Niger', 'Burkina Faso',
  'Togo', 'Bénin', 'Ghana', 'Nigeria', 'Rwanda', 'Burundi', 'Sénégal', 'Gambie',
  'Sierra Leone', 'Liberia', "Guinée-Bissau", 'Cap-Vert', 'Mozambique', 'Angola',
  'Zambie', 'Zimbabwe', 'Malawi', 'Tanzanie', 'Kenya', 'Ouganda', 'Éthiopie', 'Autre',
]

type ProfileType = typeof PROFILE_TYPES[number]['id']

function OnboardingContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [profileType, setProfileType] = useState<ProfileType | null>(null)
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const total = 3

  const next = () => setStep((s) => Math.min(s + 1, total))
  const skip = () => {
    if (step < total) next()
    else finish()
  }

  const finish = async () => {
    setSaving(true)
    try {
      const typedBio = profileType
        ? PROFILE_TYPES.find((t) => t.id === profileType)?.label ?? ''
        : ''
      const finalBio = bio.trim()
        ? bio.trim()
        : typedBio
          ? `${typedBio} passionné(e) par l'écosystème africain.`
          : undefined

      const patch: Record<string, string> = {}
      if (country) patch.country = country
      if (city) patch.city = city
      if (finalBio) patch.bio = finalBio
      if (linkedin.trim()) patch.linkedinUrl = linkedin.trim()

      if (Object.keys(patch).length > 0) {
        await apiJson('/users/me', { method: 'PATCH', body: JSON.stringify(patch) })
      }
    } catch {
      // best-effort — don't block the user on failure
    } finally {
      setSaving(false)
      setDone(true)
      setTimeout(() => router.push('/explore'), 1800)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3b49df] to-[#2d3aba] flex items-center justify-center p-6">
        <div className="text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Tout est prêt !</h2>
          <p className="text-white/80 text-sm">Vous allez être redirigé vers les opportunités…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-[#3b49df] text-lg">SouthConnect</span>
        <span className="text-xs text-gray-400">Étape {step} sur {total}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-1 bg-[#3b49df] transition-all duration-500"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">

          {/* ── Step 1 : Profil ── */}
          {step === 1 && (
            <div>
              <div className="w-12 h-12 bg-[#3b49df]/10 rounded-2xl flex items-center justify-center mb-6">
                <User className="w-6 h-6 text-[#3b49df]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Bonjour {user?.firstName || user?.name} 👋
              </h1>
              <p className="text-gray-500 text-sm mb-8">
                Dites-nous qui vous êtes pour personnaliser votre expérience.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {PROFILE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setProfileType(t.id)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all ${
                      profileType === t.id
                        ? 'border-[#3b49df] bg-[#3b49df]/5'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="text-2xl mb-2">{t.emoji}</div>
                    <div className="font-semibold text-gray-900 text-sm">{t.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{t.desc}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={next}
                  disabled={!profileType}
                  className="flex-1 py-3 bg-[#3b49df] text-white rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={skip} className="px-4 py-3 text-sm text-gray-400 hover:text-gray-600">
                  Passer
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2 : Localisation ── */}
          {step === 2 && (
            <div>
              <div className="w-12 h-12 bg-[#3b49df]/10 rounded-2xl flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6 text-[#3b49df]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Où êtes-vous ?</h1>
              <p className="text-gray-500 text-sm mb-8">
                Cela aide SouthConnect à vous proposer des opportunités adaptées à votre situation géographique.
              </p>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Pays de résidence</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df] bg-white"
                  >
                    <option value="">Sélectionner un pays</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville (optionnel)</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="ex: Paris, Dakar, Montréal…"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df]"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={next}
                  disabled={!country}
                  className="flex-1 py-3 bg-[#3b49df] text-white rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={skip} className="px-4 py-3 text-sm text-gray-400 hover:text-gray-600">
                  Passer
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3 : Bio & LinkedIn ── */}
          {step === 3 && (
            <div>
              <div className="w-12 h-12 bg-[#3b49df]/10 rounded-2xl flex items-center justify-center mb-6">
                <Briefcase className="w-6 h-6 text-[#3b49df]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Parlez de vous</h1>
              <p className="text-gray-500 text-sm mb-8">
                Une courte présentation augmente vos chances d'être contacté pour des opportunités.
              </p>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Votre bio <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="Partagez votre parcours, vos domaines d'expertise, vos projets en cours…"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df] resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/500</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    LinkedIn <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/votre-profil"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df]"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={finish}
                  disabled={saving}
                  className="flex-1 py-3 bg-[#3b49df] text-white rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? 'Enregistrement…' : "C'est parti !"}
                </button>
                <button onClick={finish} disabled={saving} className="px-4 py-3 text-sm text-gray-400 hover:text-gray-600">
                  Passer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingContent />
    </AuthGuard>
  )
}
