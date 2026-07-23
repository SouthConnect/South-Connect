'use client'

import { useParams, useRouter } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, ApiError, getErrorMessage } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { MapPin, Calendar, Clock, Tag, ArrowLeft, Send, MessageSquare, ThumbsUp, Bookmark, Share2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import DOMPurify from 'dompurify'
import type { Opportunity, Application, PublicDiscussion, PrivateDiscussion } from '@/app/lib/types'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'

const TYPE_GRADIENTS: Record<string, string> = {
  JOB_OPPORTUNITY:          'from-[#1e3a5f] via-[#2d5fa0] to-[#3b49df]',
  TALENT_PROFILE:           'from-[#4c1d95] via-[#6d28d9] to-[#8b5cf6]',
  CO_FOUNDER_OPPORTUNITY:   'from-[#134e4a] via-[#0f766e] to-[#14b8a6]',
  CO_FOUNDER_PROFILE:       'from-[#134e4a] via-[#0f766e] to-[#14b8a6]',
  BUSINESS_IDEA:            'from-[#78350f] via-[#b45309] to-[#f59e0b]',
  SUPPORT_OFFER:            'from-[#14532d] via-[#15803d] to-[#22c55e]',
  SERVICE_LISTING:          'from-[#1e3a5f] via-[#1d4ed8] to-[#60a5fa]',
  SERVICE_REQUEST:          'from-[#0c4a6e] via-[#0369a1] to-[#38bdf8]',
  DEAL_FLOW:                'from-[#064e3b] via-[#059669] to-[#34d399]',
  INVESTOR_THESIS:          'from-[#0f172a] via-[#1e3a5f] to-[#3b49df]',
  INVESTOR_PROFILE:         'from-[#0f172a] via-[#1e3a5f] to-[#3b49df]',
  FUNDING_OPPORTUNITY:      'from-[#14532d] via-[#166534] to-[#16a34a]',
  EVENT:                    'from-[#831843] via-[#be185d] to-[#f472b6]',
  CALL_FOR_STARTUPS:        'from-[#7f1d1d] via-[#b91c1c] to-[#f97316]',
  MENTORSHIP_BA_OFFER:      'from-[#312e81] via-[#4338ca] to-[#818cf8]',
  PROJECT_SEEKING_SUPPORT:  'from-[#713f12] via-[#a16207] to-[#fbbf24]',
  VENTURE_PROGRAM:          'from-[#7f1d1d] via-[#9f1239] to-[#e11d48]',
  CHILL_WORK_SPOT:          'from-[#0c4a6e] via-[#0e7490] to-[#22d3ee]',
  MARKET_ADVISOR:           'from-[#1e293b] via-[#334155] to-[#64748b]',
}

function OpportunityCover({ type, backgroundImage }: { type: string; backgroundImage?: string | null }) {
  const gradient = TYPE_GRADIENTS[type] || 'from-[#1e3a5f] via-[#2d5fa0] to-[#3b49df]'
  const label = type.replace(/_/g, ' ')

  if (backgroundImage) {
    return (
      <>
        <Image src={backgroundImage} alt="" fill className="object-cover" sizes="100vw" priority />
        <div className="absolute inset-0 bg-black/20" />
      </>
    )
  }

  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
      {/* Decorative circles */}
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
      <div className="absolute -right-8 -bottom-20 w-80 h-80 rounded-full bg-white/5" />
      <div className="absolute left-1/3 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-white/5" />
      {/* Type label watermark */}
      <div className="absolute bottom-6 right-8 text-white/20 text-xs font-bold uppercase tracking-widest select-none">
        {label}
      </div>
    </div>
  )
}

export default function OpportunityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const id = params?.id as string
  const queryClient = useQueryClient()

  const { data: opportunity, isLoading, isError, error } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => apiJson(`/opportunities/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, err) => !(err instanceof ApiError && err.status === 404) && failureCount < 2,
  })

  // viewsCount est incrémenté côté backend dans findOne() — pas de double comptage nécessaire ici.
  // sharedCount : on trackait déjà le clipboard, on envoie simplement l'événement share au backend.
  const sharedRef = useRef(false)

  const [sanitizedDescription, setSanitizedDescription] = useState('')
  const rawDescription = (opportunity as any)?.description
  useEffect(() => {
    if (!rawDescription) { setSanitizedDescription('Aucune description disponible.'); return }
    setSanitizedDescription(DOMPurify.sanitize(rawDescription, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote'],
      ALLOWED_ATTR: [],
    }))
  }, [rawDescription])
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        toast.success('Lien copié !')
        if (!sharedRef.current) {
          sharedRef.current = true
          apiJson(`/opportunities/${id}/share`, { method: 'POST' }).catch(() => undefined)
        }
      })
      .catch(() => toast.error('Impossible de copier le lien'))
  }

  const toggleLikeMutation = useTrackedMutation('opportunity.like', {
    mutationFn: async (currentlyLiked: boolean) => {
      await apiJson(`/social/like/${id}`, {
        method: currentlyLiked ? 'DELETE' : 'POST',
      })
    },
    onMutate: async (currentlyLiked) => {
      await queryClient.cancelQueries({ queryKey: ['opportunity', id] })
      const prev = queryClient.getQueryData(['opportunity', id])
      queryClient.setQueryData(['opportunity', id], (old: Opportunity | undefined) => {
        if (!old) return old
        return {
          ...old,
          likesCount: currentlyLiked ? (old.likesCount ?? 1) - 1 : (old.likesCount ?? 0) + 1,
          isLiked: !currentlyLiked,
        }
      })
      return { prev }
    },
    onError: (error: unknown, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['opportunity', id], ctx.prev)
      toast.error(getErrorMessage(error, 'Impossible de mettre à jour le like'))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['opportunity', id] }),
  })

  const toggleSaveMutation = useTrackedMutation('opportunity.save', {
    mutationFn: async (currentlySaved: boolean) => {
      await apiJson(`/social/save/${id}`, {
        method: currentlySaved ? 'DELETE' : 'POST',
      })
    },
    onMutate: async (currentlySaved) => {
      await queryClient.cancelQueries({ queryKey: ['opportunity', id] })
      const prev = queryClient.getQueryData(['opportunity', id])
      queryClient.setQueryData(['opportunity', id], (old: Opportunity | undefined) => {
        if (!old) return old
        return {
          ...old,
          savedCount: currentlySaved ? (old.savedCount ?? 1) - 1 : (old.savedCount ?? 0) + 1,
          isSaved: !currentlySaved,
        }
      })
      return { prev }
    },
    onError: (error: unknown, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['opportunity', id], ctx.prev)
      toast.error(getErrorMessage(error, "Impossible de mettre à jour l'enregistrement"))
    },
  })

  const startConversationMutation = useTrackedMutation('conversation.start', {
    mutationFn: (ownerId: string) =>
      apiJson(`/messages/private/start/${ownerId}`, { method: 'POST' }),
    onSuccess: (discussion: Pick<PrivateDiscussion, 'id'>) => {
      queryClient.invalidateQueries({ queryKey: ['private-discussions', user?.id] })
      if (discussion?.id) router.push(`/chat/private/${discussion.id}`)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Impossible de démarrer la conversation'))
    },
  })

  const applyMutation = useTrackedMutation('opportunity.apply', {
    mutationFn: () =>
      apiJson('/applications', {
        method: 'POST',
        body: JSON.stringify({ opportunityId: id }),
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['opportunity', id] })
      return { prev: queryClient.getQueryData(['opportunity', id]) }
    },
    onSuccess: (app: Pick<Application, 'id'>) => {
      queryClient.invalidateQueries({ queryKey: ['my-applications', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['analytics-my-apps', user?.id] })
      toast.success('Brouillon de candidature créé ! Complétez et soumettez-le.')
      router.push(`/applications/${app.id}`)
    },
    onError: (error: unknown, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['opportunity', id], ctx.prev)
      if (error instanceof ApiError && error.status === 409) {
        toast.error('Vous avez déjà postulé à cette opportunité.', {
          action: { label: 'Voir mes candidatures', onClick: () => router.push('/dashboard') },
        })
      } else {
        toast.error(getErrorMessage(error, 'Impossible de créer la candidature'))
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['opportunity', id] }),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#3b49df] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (isError || !opportunity) {
    const is404 = error instanceof ApiError && error.status === 404
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">
          {is404 ? 'Opportunité introuvable' : 'Erreur de chargement'}
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          {is404
            ? "Cette opportunité n'existe pas ou a été supprimée."
            : (error as Error)?.message || 'Une erreur est survenue.'}
        </p>
        <Link href="/" className="text-[#3b49df] hover:underline text-sm font-semibold">
          Retour à l'accueil
        </Link>
      </div>
    )
  }

  const date = new Date(opportunity.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const isExpired =
    opportunity.expirationDate && new Date(opportunity.expirationDate) < new Date()
  const isApplyDisabled = applyMutation.isPending || !!isExpired || opportunity.status !== 'ACTIVE'

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Cover */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <OpportunityCover type={opportunity.type} backgroundImage={opportunity.backgroundImage} />
        <div className="absolute top-8 left-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-bold text-gray-900 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="text-xs font-bold text-[#3b49df] uppercase tracking-wider mb-2">
                {opportunity.type.replace(/_/g, ' ')}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
                {opportunity.name}
              </h1>
              {opportunity.punchline && (
                <p className="text-xl text-gray-600 mb-6 font-medium">
                  {opportunity.punchline}
                </p>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-8 border-y border-gray-100 py-6">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {opportunity.city && opportunity.country ? `${opportunity.city}, ${opportunity.country}` : 'Télétravail'}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Publié le {date}
                </div>
                {opportunity.expirationDate && (
                  <div className="flex items-center gap-2 text-red-500 font-medium">
                    <Clock className="w-4 h-4" />
                    Expire le {new Date(opportunity.expirationDate).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>

              <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Description</h3>
                <div
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                />
              </div>

              {opportunity.tags?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {opportunity.tags.map((tag: string) => (
                      <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Discussion */}
            <DiscussionSection opportunityId={id} messagesCount={opportunity.messagesCount} />
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Actions Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 sticky top-8">
              {user ? (
                opportunity.ownerId === user.id ? (
                  <div className="space-y-3">
                    <Link 
                      href={`/opportunities/${id}/edit`}
                      className="flex items-center justify-center w-full py-3 bg-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                      Modifier l'opportunité
                    </Link>
                    <Link
                      href={`/opportunities/${id}/applications`}
                      className="flex items-center justify-center w-full py-2 border border-gray-200 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Voir les candidatures ({opportunity.applicationsCount})
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => applyMutation.mutate()}
                      disabled={isApplyDisabled}
                      title={isExpired ? 'La date limite de candidature est dépassée' : undefined}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-[#3b49df] text-white rounded-xl font-bold hover:bg-[#2d3aba] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                      {applyMutation.isPending
                        ? 'Création en cours…'
                        : isExpired
                        ? 'Délai expiré'
                        : 'Postuler'}
                    </button>
                    <button
                      type="button"
                      disabled={startConversationMutation.isPending}
                      onClick={() => {
                        if (!user) { router.push('/login'); return }
                        startConversationMutation.mutate(opportunity.ownerId)
                      }}
                      className="flex items-center justify-center gap-2 w-full py-2 border border-gray-200 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {startConversationMutation.isPending ? 'Ouverture…' : 'Contacter le créateur'}
                    </button>
                  </div>
                )
              ) : (
                <Link 
                  href="/login"
                  className="flex items-center justify-center w-full py-3 bg-[#3b49df] text-white rounded-xl font-bold hover:bg-[#2d3aba] transition-colors shadow-sm"
                >
                  Se connecter pour postuler
                </Link>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!user) { router.push('/login'); return }
                    toggleLikeMutation.mutate(!!opportunity.isLiked)
                  }}
                  className={`flex items-center justify-center gap-2 py-2 border rounded-lg text-sm font-semibold transition-colors ${
                    opportunity.isLiked
                      ? 'border-[#3b49df] bg-[#3b49df]/5 text-[#3b49df]'
                      : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  {opportunity.isLiked ? 'Aimé' : 'Aimer'}
                  {(opportunity.likesCount ?? 0) > 0 && (
                    <span className="text-xs opacity-60">{opportunity.likesCount}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) { router.push('/login'); return }
                    toggleSaveMutation.mutate(!!opportunity.isSaved)
                  }}
                  className={`flex items-center justify-center gap-2 py-2 border rounded-lg text-sm font-semibold transition-colors ${
                    opportunity.isSaved
                      ? 'border-[#3b49df] bg-[#3b49df]/5 text-[#3b49df]'
                      : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  {opportunity.isSaved ? 'Enregistré' : 'Enregistrer'}
                </button>
              </div>
              
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Partager
              </button>

              <hr className="border-gray-100" />

              <div className="pt-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
                  Publié par
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold text-[#3b49df] relative overflow-hidden">
                    {opportunity.owner?.profilePic ? (
                      <Image src={opportunity.owner.profilePic} alt="" fill className="object-cover rounded-xl" sizes="64px" />
                    ) : (
                      opportunity.owner?.name?.[0]
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{opportunity.owner?.name}</div>
                    <Link href={`/profiles/${opportunity.ownerId}`} className="text-xs text-[#3b49df] font-bold hover:underline">
                      Voir le profil
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Activité</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Candidatures</span>
                  <span className="font-bold text-gray-900">{opportunity.applicationsCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Likes</span>
                  <span className="font-bold text-gray-900">{opportunity.likesCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Enregistré par</span>
                  <span className="font-bold text-gray-900">{opportunity.savedCount ?? 0} utilisateurs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DiscussionSection({
  opportunityId,
  messagesCount,
}: {
  opportunityId: string
  messagesCount: number
}) {
  const { data: discussions, isLoading } = useQuery({
    queryKey: ['public-discussions', 'OPPORTUNITY_RELATED', opportunityId],
    queryFn: () => apiJson('/messages/public?type=OPPORTUNITY_RELATED'),
  })

  const linked = (discussions as PublicDiscussion[] | undefined)?.find(
    (d) => d.opportunityId === opportunityId || d.opportunity?.id === opportunityId,
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Discussion</h3>
        <span className="text-gray-500 text-sm">{messagesCount ?? 0} message{(messagesCount ?? 0) !== 1 ? 's' : ''}</span>
      </div>

      {isLoading ? (
        <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
      ) : linked ? (
        <Link
          href={`/chat/public/${linked.id}`}
          className="flex items-center justify-between px-5 py-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-sm font-bold text-[#3b49df] overflow-hidden relative">
              {linked.image ? (
                <Image src={linked.image} alt="" fill className="object-cover" sizes="64px" />
              ) : (
                linked.title?.[0] || 'D'
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{linked.title}</div>
              <div className="text-xs text-gray-500">
                {linked.membersCount ?? 0} membres · {messagesCount ?? 0} messages
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#3b49df]">Rejoindre →</span>
        </Link>
      ) : (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Aucune discussion publique liée à cette opportunité pour l'instant.</p>
        </div>
      )}
    </div>
  )
}
