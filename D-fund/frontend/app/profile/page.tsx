'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiJson, uploadImage } from '@/app/lib/api'
import { User, Mail, Phone, MapPin, Linkedin, Globe, Shield, UserCircle, Building2, Save } from 'lucide-react'

// Cette page lit les search params et des données utilisateur côté client,
// on force un rendu dynamique pour éviter les erreurs de pré-rendu.
export const dynamic = 'force-dynamic'

function ProfilePageContent() {
  const { user: authUser, refreshUser } = useAuth()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'info' | 'btoc' | 'btob'>('info')

  const isOnboarding = searchParams?.get('onboarding') === 'true'

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

  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null)
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null)
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null)
  const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const headerInputRef = useRef<HTMLInputElement | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [savedInfo, setSavedInfo] = useState(false)
  const [savedBtoC, setSavedBtoC] = useState(false)
  const [savedBtoB, setSavedBtoB] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const updateMeMutation = useMutation({
    mutationFn: (data: any) => apiJson('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: ['profile', authUser?.id] })
      setSavedInfo(true)
      setTimeout(() => setSavedInfo(false), 3000)
    },
  })

  const updateBtoCMutation = useMutation({
    mutationFn: (data: any) => apiJson(`/profiles/bto-c/${authUser?.id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', authUser?.id] })
      setSavedBtoC(true)
      setTimeout(() => setSavedBtoC(false), 3000)
    },
  })

  const updateBtoBMutation = useMutation({
    mutationFn: (data: any) =>
      apiJson(`/profiles/bto-b/${authUser?.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', authUser?.id] })
      setSavedBtoB(true)
      setTimeout(() => setSavedBtoB(false), 3000)
    },
  })

  if (!authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-lg">Please sign in to view your profile.</p>
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
      {isOnboarding && (
        <div className="mb-6 rounded-2xl bg-[#3b49df]/5 border border-[#3b49df]/20 px-6 py-4">
          <p className="text-sm font-bold text-[#3b49df] mb-1">Welcome to D-fund!</p>
          <p className="text-xs text-gray-600">
            Complete your profile to unlock all features — add a photo, fill in your bio, and set up your professional profile.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        {/* Profile Header */}
        <div className="h-32 bg-gradient-to-r from-[#1a237e] to-[#3f51b5]" />
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-md">
              <label className="block w-full h-full rounded-xl bg-gray-100 flex items-center justify-center text-3xl font-bold text-[#3b49df] overflow-hidden cursor-pointer">
                {avatarPreview || profile?.profilePic ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview || profile.profilePic}
                    alt=""
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  profile?.name?.[0] || 'U'
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || !authUser) return
                    if (file.size > 5 * 1024 * 1024) {
                      setUploadError('Image size must be less than 5MB')
                      return
                    }
                    setAvatarFile(file)
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setAvatarPreview(reader.result as string)
                    }
                    reader.readAsDataURL(file)

                    try {
                      const url = await uploadImage(file, 'avatars', authUser.id, 'images')
                      await apiJson('/users/me/profile-pic', {
                        method: 'PUT',
                        body: JSON.stringify({ profilePic: url }),
                      })
                      await refreshUser()
                      queryClient.invalidateQueries({ queryKey: ['profile', authUser.id] })
                    } catch (error: any) {
                      setUploadError(error?.message || 'Failed to update profile picture')
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profile?.name}</h1>
            <p className="text-gray-500">{profile?.email}</p>
          </div>
        </div>

        {uploadError && (
          <div className="mx-8 mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {uploadError}
            <button onClick={() => setUploadError(null)} className="ml-2 font-bold">✕</button>
          </div>
        )}

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

      {/* Profile summary cards — like Glide */}
      {activeTab === 'info' && (
        <div className="space-y-4 mb-6">
          {/* BtoC card */}
          {profile?.btoCProfile && (
            <div>
              <p className="text-[10px] font-bold text-[#3b49df] uppercase tracking-widest mb-2 px-1">
                Your BtoC Profile
              </p>
              <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-sm font-bold text-[#3b49df]">
                    {profile.profilePic ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.profilePic} alt="" className="w-full h-full object-cover" />
                    ) : (
                      profile.name?.[0] || 'U'
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{profile.name}</div>
                    <div className="text-xs text-gray-500">
                      {profile.btoCProfile.opportunitiesCount ?? 0} Opportunities •{' '}
                      {profile.btoCProfile.followersCount ?? 0} Followers
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('btoc')}
                  className="text-xs font-semibold text-[#3b49df] hover:underline"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* BtoB cards */}
          {profile?.btoBProfile && (
            <div>
              <p className="text-[10px] font-bold text-[#3b49df] uppercase tracking-widest mb-2 px-1">
                Your BtoB Profile
              </p>
              <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center text-sm font-bold text-[#3b49df]">
                    {profile.btoBProfile.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.btoBProfile.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (profile.btoBProfile.companyName || 'C')?.[0]
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {profile.btoBProfile.companyName || 'My Company'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {profile.btoBProfile.opportunitiesCount ?? 0} Opportunities •{' '}
                      {profile.btoBProfile.followersCount ?? 0} Followers
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('btob')}
                  className="text-xs font-semibold text-[#3b49df] hover:underline"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* CTA if no BtoB profile */}
          {!profile?.btoBProfile && (
            <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Ready to showcase your company?</p>
                <p className="text-xs text-gray-500 mt-0.5">Add a BtoB profile and gain traction &amp; visibility.</p>
              </div>
              <button
                onClick={() => setActiveTab('btob')}
                className="px-5 py-2 rounded-xl bg-[#3b49df] text-white text-sm font-semibold hover:bg-[#2d3aba] transition-colors"
              >
                Go!
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {activeTab === 'info' && (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const data: any = {}
              fd.forEach((v, k) => { if (v) data[k] = v })
              updateMeMutation.mutate(data)
            }}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <User className="w-3 h-3 inline mr-1" />First Name
                </label>
                <input
                  name="firstName"
                  defaultValue={profile?.firstName || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <User className="w-3 h-3 inline mr-1" />Last Name
                </label>
                <input
                  name="lastName"
                  defaultValue={profile?.lastName || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  placeholder="Last name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <Phone className="w-3 h-3 inline mr-1" />Phone
                </label>
                <input
                  name="phone"
                  defaultValue={profile?.phone || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  placeholder="+1 555 000 0000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <MapPin className="w-3 h-3 inline mr-1" />City
                </label>
                <input
                  name="city"
                  defaultValue={profile?.city || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  placeholder="Paris"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <MapPin className="w-3 h-3 inline mr-1" />Country
                </label>
                <input
                  name="country"
                  defaultValue={profile?.country || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  placeholder="France"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <Linkedin className="w-3 h-3 inline mr-1" />LinkedIn URL
                </label>
                <input
                  name="linkedinUrl"
                  defaultValue={profile?.linkedinUrl || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <Globe className="w-3 h-3 inline mr-1" />Website
                </label>
                <input
                  name="website"
                  defaultValue={profile?.website || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div className="flex items-center gap-3 mt-1">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-0.5">Email</div>
                  <div className="text-sm text-gray-500">{profile?.email}</div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Bio</label>
              <textarea
                name="bio"
                defaultValue={profile?.bio || ''}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df] resize-none"
                placeholder="A short bio about yourself..."
              />
            </div>

            {savedInfo && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-medium">
                Profile updated successfully.
              </div>
            )}
            {updateMeMutation.isError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {(updateMeMutation.error as Error)?.message || 'Failed to update profile.'}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={updateMeMutation.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-[#3b49df] text-white rounded-lg font-bold hover:bg-[#2d3aba] transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updateMeMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
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

            {savedBtoC && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-medium">
                Individual profile updated.
              </div>
            )}

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
          <form
            className="space-y-6"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!authUser) return

              const formData = new FormData(e.currentTarget)
              const raw = Object.fromEntries(formData.entries())

              const data: any = {
                ...raw,
              }

              if (data.industries) {
                data.industries = (data.industries as string)
                  .split(',')
                  .map((v: string) => v.trim())
                  .filter(Boolean)
              }

              if (data.marketFocus) {
                data.marketFocus = (data.marketFocus as string)
                  .split(',')
                  .map((v: string) => v.trim())
                  .filter(Boolean)
              }

              try {
                if (companyLogoFile) {
                  const logoUrl = await uploadImage(
                    companyLogoFile,
                    'companies',
                    authUser.id,
                    'images',
                  )
                  data.logo = logoUrl
                }

                if (headerImageFile) {
                  const headerUrl = await uploadImage(
                    headerImageFile,
                    'companies',
                    authUser.id,
                    'images',
                  )
                  data.headerImage = headerUrl
                }

                updateBtoBMutation.mutate(data)
              } catch (error: any) {
                setUploadError(error?.message || 'Failed to upload images')
              }
            }}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Company / Organization Profile</h2>
            {!profile?.btoBProfile && (
              <div className="p-4 bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-xl text-sm mb-6">
                You haven't set up your company profile yet.
              </div>
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Logo
                  </label>
                  {companyLogoPreview || profile?.btoBProfile?.logo ? (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={companyLogoPreview || profile.btoBProfile?.logo}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyLogoFile(null)
                          setCompanyLogoPreview(null)
                          if (logoInputRef.current) logoInputRef.current.value = ''
                        }}
                        className="absolute top-1 right-1 px-1 rounded-full bg-white/80 text-[10px] font-semibold text-gray-700"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-xs text-gray-500">
                      Upload
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 5 * 1024 * 1024) {
                            setUploadError('Image size must be less than 5MB')
                            return
                          }
                          setCompanyLogoFile(file)
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setCompanyLogoPreview(reader.result as string)
                          }
                          reader.readAsDataURL(file)
                        }}
                      />
                    </label>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Header Image
                  </label>
                  {headerImagePreview || profile?.btoBProfile?.headerImage ? (
                    <div className="relative w-full h-24 rounded-lg overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={headerImagePreview || profile.btoBProfile?.headerImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setHeaderImageFile(null)
                          setHeaderImagePreview(null)
                          if (headerInputRef.current) headerInputRef.current.value = ''
                        }}
                        className="absolute top-1 right-1 px-1 rounded-full bg-white/80 text-[10px] font-semibold text-gray-700"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-xs text-gray-500">
                      Upload header
                      <input
                        ref={headerInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 5 * 1024 * 1024) {
                            setUploadError('Image size must be less than 5MB')
                            return
                          }
                          setHeaderImageFile(file)
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setHeaderImagePreview(reader.result as string)
                          }
                          reader.readAsDataURL(file)
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
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

            {savedBtoB && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-medium">
                Company profile updated.
              </div>
            )}

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
