'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { User, Mail, Phone, MapPin, Linkedin, Globe, Shield, UserCircle, Building2, Save } from 'lucide-react'

// Cette page lit les search params et des données utilisateur côté client,
// on force un rendu dynamique pour éviter les erreurs de pré-rendu.
export const dynamic = 'force-dynamic'

function ProfilePageContent() {
  const { user: authUser } = useAuth()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'info' | 'btoc' | 'btob'>('info')

  useEffect(() => {
    const tab = searchParams?.get('tab') as 'info' | 'btoc' | 'btob' | null
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', authUser?.id],
    queryFn: () => apiJson(`/profiles/${authUser?.id}`),
    enabled: !!authUser?.id,
  })

  const updateBtoCMutation = useMutation({
    mutationFn: (data: any) => apiJson(`/profiles/bto-c/${authUser?.id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', authUser?.id] })
      alert('BtoC Profile updated!')
    },
  })

  const updateBtoBMutation = useMutation({
    mutationFn: (data: any) => apiJson(`/profiles/bto-b/${authUser?.id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', authUser?.id] })
      alert('BtoB Profile updated!')
    },
  })

  if (!authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-lg">Veuillez vous connecter pour voir votre profil.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="animate-pulse space-y-8">
          <div className="h-32 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        {/* Profile Header */}
        <div className="h-32 bg-gradient-to-r from-[#1a237e] to-[#3f51b5]" />
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-md">
              <div className="w-full h-full rounded-xl bg-gray-100 flex items-center justify-center text-3xl font-bold text-[#3b49df]">
                {profile?.profilePic ? (
                  <img src={profile.profilePic} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  profile?.name?.[0] || 'U'
                )}
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profile?.name}</h1>
            <p className="text-gray-500">{profile?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'info' ? 'text-[#3b49df] bg-[#3b49df]/5' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4" />
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('btoc')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'btoc' ? 'text-[#3b49df] bg-[#3b49df]/5' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserCircle className="w-4 h-4" />
            Individual Profile
          </button>
          <button
            onClick={() => setActiveTab('btob')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'btob' ? 'text-[#3b49df] bg-[#3b49df]/5' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Company Profile
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {activeTab === 'info' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Email</div>
                  <div className="text-gray-900">{profile?.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Phone</div>
                  <div className="text-gray-900">{profile?.phone || 'Not provided'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Location</div>
                  <div className="text-gray-900">
                    {profile?.city && profile?.country ? `${profile.city}, ${profile.country}` : 'Not provided'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <Linkedin className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">LinkedIn</div>
                  <div className="text-gray-900 truncate">
                    {profile?.linkedinUrl ? (
                      <a href={profile.linkedinUrl} target="_blank" className="text-[#3b49df] hover:underline">
                        Profile Link
                      </a>
                    ) : 'Not provided'}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Bio</div>
              <div className="text-gray-900 whitespace-pre-wrap">{profile?.bio || 'No bio provided.'}</div>
            </div>
          </div>
        )}

        {activeTab === 'btoc' && (
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const data = Object.fromEntries(formData.entries())
            // Conversion simple pour l'exemple
            updateBtoCMutation.mutate({
              ...data,
              tags: (data.tags as string).split(',').map(t => t.trim()),
              industries: (data.industries as string).split(',').map(t => t.trim()),
              lookingForOpportunities: !!data.lookingForOpportunities,
            })
          }}>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Individual Professional Profile</h2>
            {!profile?.btoCProfile && (
              <div className="p-4 bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-xl text-sm mb-6">
                You haven't set up your individual profile yet. Complete the form below to start.
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Professional Description</label>
                <textarea
                  name="description"
                  defaultValue={profile?.btoCProfile?.description || ''}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  placeholder="Describe your professional background and what you're looking for..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma separated)</label>
                  <input
                    name="tags"
                    defaultValue={profile?.btoCProfile?.tags?.join(', ') || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seniority Level</label>
                  <select
                    name="seniorityLevel"
                    defaultValue={profile?.btoCProfile?.seniorityLevel || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  >
                    <option value="">Select Level</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-level</option>
                    <option value="senior">Senior</option>
                    <option value="expert">Expert / C-Level</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={updateBtoCMutation.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-[#3b49df] text-white rounded-lg font-bold hover:bg-[#2d3aba] transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updateBtoCMutation.isPending ? 'Saving...' : 'Save BtoC Profile'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'btob' && (
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const data = Object.fromEntries(formData.entries())
            updateBtoBMutation.mutate(data)
          }}>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Company / Organization Profile</h2>
            {!profile?.btoBProfile && (
              <div className="p-4 bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-xl text-sm mb-6">
                You haven't set up your company profile yet.
              </div>
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    name="companyName"
                    defaultValue={profile?.btoBProfile?.companyName || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Development Stage</label>
                  <select
                    name="developmentStage"
                    defaultValue={profile?.btoBProfile?.developmentStage || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  >
                    <option value="">Select Stage</option>
                    <option value="ideation">Ideation</option>
                    <option value="mvp">MVP</option>
                    <option value="growth">Growth</option>
                    <option value="scaling">Scaling</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Punchline</label>
                <input
                  name="punchline"
                  defaultValue={profile?.btoBProfile?.punchline || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  placeholder="A short one-liner about your company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Description</label>
                <textarea
                  name="description"
                  defaultValue={profile?.btoBProfile?.description || ''}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={updateBtoBMutation.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-[#3b49df] text-white rounded-lg font-bold hover:bg-[#2d3aba] transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updateBtoBMutation.isPending ? 'Saving...' : 'Save BtoB Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading profile...</div>}>
      <ProfilePageContent />
    </Suspense>
  )
}
