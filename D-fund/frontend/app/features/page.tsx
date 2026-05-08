'use client'

import { useState } from 'react'
import { Lightbulb, MessageSquarePlus, ArrowUpRight, CheckCircle2, Clock, Rocket } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { toast } from 'sonner'

type Tab = 'features' | 'feedbacks'

const PLANNED_FEATURES = [
  // ── Shipped ──────────────────────────────────────────────────────
  {
    id: 1,
    title: 'Notifications en temps réel',
    description: 'Recevez des alertes instantanées quand quelqu\'un postule, vous suit ou vous envoie un message.',
    status: 'done',
    votes: 24,
  },
  {
    id: 2,
    title: 'Recherche avancée & filtres',
    description: 'Recherche plein texte sur les opportunités, profils et discussions avec filtres par type et statut.',
    status: 'done',
    votes: 41,
  },
  {
    id: 3,
    title: 'Tableau de bord analytique',
    description: 'Visualisez votre tunnel de candidatures, la performance de vos opportunités et la croissance de vos abonnés.',
    status: 'done',
    votes: 38,
  },
  {
    id: 4,
    title: 'Tâches & gestion de projet',
    description: 'Gérez les tâches de votre projet directement dans D-Fund aux côtés de vos opportunités.',
    status: 'done',
    votes: 12,
  },
  {
    id: 5,
    title: 'Réinitialisation de mot de passe & vérification email',
    description: 'Récupération de compte en autonomie et vérification d\'adresse email.',
    status: 'done',
    votes: 30,
  },
  {
    id: 6,
    title: 'Système de parrainage',
    description: 'Gagnez des récompenses en parrainant des talents ou de nouveaux utilisateurs vers des opportunités.',
    status: 'done',
    votes: 17,
  },
  // ── In progress ───────────────────────────────────────────────────
  {
    id: 7,
    title: 'Création d\'opportunités par IA',
    description: 'Générez des descriptions d\'opportunités percutantes grâce à l\'IA à partir de votre contexte.',
    status: 'in_progress',
    votes: 55,
  },
  // ── Planned ───────────────────────────────────────────────────────
  {
    id: 8,
    title: 'Application mobile (iOS & Android)',
    description: 'Accédez à D-Fund en déplacement avec une expérience mobile native.',
    status: 'planned',
    votes: 67,
  },
  {
    id: 9,
    title: 'Système de paiement & abonnements',
    description: 'Débloquez des fonctionnalités premium (opportunités boostées, badge vérifié) via Stripe.',
    status: 'planned',
    votes: 19,
  },
  {
    id: 10,
    title: 'Matching intelligent & recommandations',
    description: 'Recevez des recommandations d\'opportunités et de personnes basées sur votre profil.',
    status: 'planned',
    votes: 48,
  },
  {
    id: 11,
    title: 'Chat en temps réel (WebSocket)',
    description: 'Messagerie entièrement temps réel avec indicateurs de frappe et accusés de lecture.',
    status: 'planned',
    votes: 33,
  },
]

const STATUS_CONFIG = {
  in_progress: {
    label: 'En cours',
    color: 'bg-blue-100 text-blue-700',
    icon: Clock,
  },
  planned: {
    label: 'Prévu',
    color: 'bg-gray-100 text-gray-600',
    icon: Rocket,
  },
  done: {
    label: 'Terminé',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
}

export default function FeaturesPage() {
  const [tab, setTab] = useState<Tab>('features')
  const [submitted, setSubmitted] = useState(false)
  const [voted, setVoted] = useState<Set<number>>(new Set())

  const feedbackMutation = useMutation({
    mutationFn: (data: { title: string; description: string }) =>
      apiJson('/feedback', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      setSubmitted(true)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send feedback. Please try again.')
    },
  })

  const handleVote = (id: number) => {
    setVoted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Aidez-nous à améliorer D-Fund !
        </h1>
        <p className="text-sm text-[#3b49df] mt-1 max-w-2xl">
          Votre avis compte ! Partagez vos retours, signalez des problèmes et votez pour les nouvelles fonctionnalités
          afin de construire l'avenir de D-Fund ensemble.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 text-sm mb-8">
        <button
          onClick={() => setTab('features')}
          className={`pb-3 px-1 border-b-2 font-semibold flex items-center gap-1.5 ${
            tab === 'features'
              ? 'border-[#3b49df] text-[#3b49df]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Nouvelles fonctionnalités
        </button>
        <button
          onClick={() => setTab('feedbacks')}
          className={`pb-3 px-1 border-b-2 font-semibold flex items-center gap-1.5 ${
            tab === 'feedbacks'
              ? 'border-[#3b49df] text-[#3b49df]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <MessageSquarePlus className="w-4 h-4" />
          Retours
        </button>
      </div>

      {tab === 'features' && (
        <div className="space-y-3">
          {PLANNED_FEATURES.sort((a, b) => b.votes - a.votes).map((feature) => {
            const cfg = STATUS_CONFIG[feature.status as keyof typeof STATUS_CONFIG]
            const StatusIcon = cfg.icon
            const hasVoted = voted.has(feature.id)

            return (
              <div
                key={feature.id}
                className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                <button
                  onClick={() => handleVote(feature.id)}
                  className={`flex flex-col items-center gap-0.5 flex-shrink-0 px-3 py-2 rounded-xl border transition-colors ${
                    hasVoted
                      ? 'border-[#3b49df] bg-[#3b49df]/5 text-[#3b49df]'
                      : 'border-gray-200 text-gray-500 hover:border-[#3b49df]/40 hover:text-[#3b49df]'
                  }`}
                >
                  <ArrowUpRight className={`w-3.5 h-3.5 ${hasVoted ? 'rotate-0' : ''}`} />
                  <span className="text-[11px] font-semibold">
                    {feature.votes + (hasVoted ? 1 : 0)}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'feedbacks' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          {submitted ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                Merci pour votre retour !
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Vos suggestions nous aident à améliorer D-Fund pour tout le monde.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs text-[#3b49df] font-semibold hover:underline"
              >
                Envoyer un autre retour
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">
                  Partagez vos retours
                </h2>
                <p className="text-xs text-gray-500">
                  Partagez vos idées, signalez un bug ou suggérez une amélioration pour l'expérience générale.
                </p>
              </div>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  feedbackMutation.mutate({
                    title: fd.get('title') as string,
                    description: fd.get('description') as string,
                  })
                  e.currentTarget.reset()
                }}
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Titre
                  </label>
                  <input
                    name="title"
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df] outline-none transition-all"
                    placeholder="Dites-nous ce que vous pensez"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    name="description"
                    required
                    rows={5}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df] outline-none transition-all resize-none"
                    placeholder="Partagez vos idées, signalez un bug ou suggérez une amélioration…"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={feedbackMutation.isPending}
                    className="px-6 py-2.5 rounded-xl bg-[#3b49df] text-white text-sm font-semibold hover:bg-[#2d3aba] transition-colors disabled:opacity-50"
                  >
                    {feedbackMutation.isPending ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}
