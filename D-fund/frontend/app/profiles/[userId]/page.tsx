'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, getErrorMessage } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import Link from 'next/link'
import { MapPin, Users, Briefcase, MessageCircle, UserPlus, UserCheck } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import StarRating from '@/components/StarRating'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params?.userId as string
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => apiJson(`/profiles/${userId}`),
    enabled: !!userId,
  })

  const { data: followData } = useQuery({
    queryKey: ['is-following', userId, user?.id],
    queryFn: () => apiJson(`/social/is-following/${userId}`),
    enabled: !!user?.id && !!userId && user?.id !== userId,
  })

  const isFollowing: boolean = followData?.following ?? false

  const followMutation = useTrackedMutation('profile.follow', {
    mutationFn: () =>
      apiJson(`/social/follow/${userId}`, {
        method: isFollowing ? 'DELETE' : 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following', userId] })
      queryClient.invalidateQueries({ queryKey: ['public-profile', userId] })
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Impossible de modifier le suivi')),
  })

  const messageMutation = useTrackedMutation('conversation.start', {
    mutationFn: () =>
      apiJson(`/messages/private/start/${userId}`, { method: 'POST' }),
    onSuccess: (discussion: any) => {
      if (discussion?.id) router.push(`/chat/private/${discussion.id}`)
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Impossible d\'ouvrir la conversation')),
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <p className="text-red-500 text-sm mb-3">
          {error instanceof Error ? error.message : 'Profile not found.'}
        </p>
        <button onClick={() => router.back()} className="text-sm text-[#3b49df] hover:underline">
          Retour
        </button>
      </div>
    )
  }

  const location =
    profile.city && profile.country
      ? `${profile.city}, ${profile.country}`
      : profile.city || profile.country || null

  const isOwnProfile = user?.id === profile.id

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
      >
        ← Retour
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div
          className="h-32 bg-gradient-to-r from-[#1a237e] to-[#3f51b5]"
          style={
            profile.headerImage && /^https:\/\//.test(profile.headerImage)
              ? { backgroundImage: `url(${profile.headerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : {}
          }
        />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-md shrink-0">
              <div className="w-full h-full rounded-xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-[#3b49df] overflow-hidden relative">
                {profile.profilePic ? (
                  <Image src={profile.profilePic} alt="" fill className="object-cover rounded-xl" sizes="(max-width: 768px) 100vw, 400px" />
                ) : (
                  (profile.name?.[0] || 'U')
                )}
              </div>
            </div>

            {/* Action buttons */}
            {!isOwnProfile && user && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                    isFollowing
                      ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                      : 'bg-[#3b49df] text-white hover:bg-[#2d3aba]'
                  }`}
                >
                  {isFollowing ? (
                    <><UserCheck className="w-3.5 h-3.5" /> Abonné</>
                  ) : (
                    <><UserPlus className="w-3.5 h-3.5" /> Suivre</>
                  )}
                </button>
                <button
                  onClick={() => messageMutation.mutate()}
                  disabled={messageMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Message
                </button>
              </div>
            )}

            {isOwnProfile && (
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Modifier le profil
              </Link>
            )}
          </div>

          <h1 className="text-xl font-bold text-gray-900">{profile.name || 'Utilisateur'}</h1>
          {profile.bio && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{profile.bio}</p>}
          {location && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1.5">
              <MapPin className="w-3 h-3" />
              {location}
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>
                <strong className="text-gray-900">
                  {profile.btoCProfile?.followersCount ?? profile.btoBProfile?.followersCount ?? 0}
                </strong>{' '}abonnés
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" />
              <span>
                <strong className="text-gray-900">
                  {profile.btoCProfile?.opportunitiesCount ?? profile.btoBProfile?.opportunitiesCount ?? 0}
                </strong>{' '}opportunités
              </span>
            </div>
          </div>

          {/* Star rating — interactive for other users, display-only for own profile */}
          <div className="mt-3">
            <StarRating
              itemId={userId}
              interactive={!!user && user.id !== userId}
              size="md"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Individual profile */}
          {profile.btoCProfile && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Profil individuel</h2>
              {profile.btoCProfile.description && (
                <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">{profile.btoCProfile.description}</p>
              )}
              <div className="space-y-3">
                {profile.btoCProfile.tags?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1.5">Compétences</div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.btoCProfile.tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.btoCProfile.industries?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1.5">Industries</div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.btoCProfile.industries.map((ind: string) => (
                        <span key={ind} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.btoCProfile.marketFocus?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1.5">Marchés cibles</div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.btoCProfile.marketFocus.map((m: string) => (
                        <span key={m} className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Company profile */}
          {profile.btoBProfile && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Profil entreprise</h2>
              <div className="flex items-start gap-4 mb-4">
                {profile.btoBProfile.logo && (
                  <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0 relative">
                    <Image src={profile.btoBProfile.logo} alt="" fill className="object-cover" sizes="64px" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-gray-900">{profile.btoBProfile.companyName}</div>
                  {profile.btoBProfile.punchline && (
                    <div className="text-xs text-gray-500 mt-0.5">{profile.btoBProfile.punchline}</div>
                  )}
                  {(profile.btoBProfile.city || profile.btoBProfile.country) && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <MapPin className="w-3 h-3" />
                      {[profile.btoBProfile.city, profile.btoBProfile.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
              {profile.btoBProfile.description && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.btoBProfile.description}</p>
              )}
              {profile.btoBProfile.industries?.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-gray-500 mb-1.5">Industries</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.btoBProfile.industries.map((ind: string) => (
                      <span key={ind} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{ind}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {profile.linkedinUrl && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Liens</div>
              {/^https:\/\//.test(profile.linkedinUrl) && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#3b49df] hover:underline block truncate"
                >
                  LinkedIn
                </a>
              )}
              {profile.website && /^https?:\/\//.test(profile.website) && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#3b49df] hover:underline block truncate mt-1"
                >
                  Site web
                </a>
              )}
            </div>
          )}

          {isOwnProfile && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-xs text-gray-500">
              <p>
                Pour modifier votre profil, rendez-vous dans{' '}
                <Link href="/profile" className="text-[#3b49df] font-semibold hover:underline">
                  les paramètres du profil
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
