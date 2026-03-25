'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import Link from 'next/link'

type PublicProfile = {
  id: string
  name?: string | null
  email: string
  bio?: string | null
  profilePic?: string | null
  headerImage?: string | null
  city?: string | null
  country?: string | null
  followersCount?: number
  opportunitiesCount?: number
  btoCProfile?: {
    description?: string | null
    tags?: string[]
    industries?: string[]
    marketFocus?: string[]
  }
  btoBProfile?: {
    companyName: string
    punchline?: string | null
    description?: string | null
    logo?: string | null
    city?: string | null
    country?: string | null
    followersCount?: number
    opportunitiesCount?: number
  }
}

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params?.userId as string
  const { user } = useAuth()

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiJson<PublicProfile>(`/profiles/${userId}`)
        if (!cancelled) {
          setProfile(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load profile.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Back
          </button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <h1 className="text-2xl font-bold mb-2">Profile not found</h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-[#3b49df] hover:underline"
        >
          Back
        </button>
      </div>
    )
  }

  const location =
    profile.city && profile.country
      ? `${profile.city}, ${profile.country}`
      : profile.city || profile.country || null

  const hasBtoC = !!profile.btoCProfile
  const hasBtoB = !!profile.btoBProfile

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Back
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="h-32 bg-gradient-to-r from-[#1a237e] to-[#3f51b5]" />
        <div className="px-8 pb-8">
          <div className="relative flex items-end gap-4 -mt-12 mb-4">
            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-md">
              <div className="w-full h-full rounded-xl bg-gray-100 flex items-center justify-center text-3xl font-bold text-[#3b49df] overflow-hidden">
                {profile.profilePic ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profilePic}
                    alt=""
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  (profile.name && profile.name[0]) || 'U'
                )}
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.name || profile.email}
            </h1>
            {location && (
              <p className="text-sm text-gray-500 mt-1">
                {location}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {profile.bio && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">
                Bio
              </h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {profile.bio}
              </p>
            </div>
          )}

          {hasBtoC && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Individual profile
              </h2>
              {profile.btoCProfile?.description && (
                <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">
                  {profile.btoCProfile.description}
                </p>
              )}
              <div className="flex flex-wrap gap-3 text-xs">
                {profile.btoCProfile?.tags && profile.btoCProfile.tags.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">
                      Skills
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {profile.btoCProfile.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.btoCProfile?.industries && profile.btoCProfile.industries.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">
                      Industries
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {profile.btoCProfile.industries.map((ind) => (
                        <span
                          key={ind}
                          className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                        >
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {hasBtoB && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Company profile
              </h2>
              <div className="flex items-start gap-4 mb-4">
                {profile.btoBProfile?.logo && (
                  <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile.btoBProfile.logo}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {profile.btoBProfile?.companyName}
                  </div>
                  {profile.btoBProfile?.punchline && (
                    <div className="text-xs text-gray-500">
                      {profile.btoBProfile.punchline}
                    </div>
                  )}
                </div>
              </div>
              {profile.btoBProfile?.description && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {profile.btoBProfile.description}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {user && user.id !== profile.id && (
            <button
              type="button"
              onClick={async () => {
                const discussion = await apiJson(`/messages/private/start/${profile.id}`, {
                  method: 'POST',
                })
                if (discussion?.id) {
                  router.push(`/chat/private/${discussion.id}`)
                }
              }}
              className="w-full mb-2 inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Message this profile
            </button>
          )}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-sm">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Activity
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Opportunities</span>
                <span className="font-semibold text-gray-900">
                  {profile.opportunitiesCount ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Followers</span>
                <span className="font-semibold text-gray-900">
                  {profile.followersCount ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-xs text-gray-500">
            <p>
              This is a public profile view. Details displayed can evolve based on future privacy settings.
            </p>
            <p className="mt-2">
              To edit your own profile, use the{' '}
              <Link href="/profile" className="text-[#3b49df] font-semibold hover:underline">
                profile settings
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

