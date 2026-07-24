'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { qk } from '@/app/lib/queryKeys'
import { apiJson, uploadImage, getErrorMessage } from '@/app/lib/api'
import { useRouter } from 'next/navigation'
import { AFRICAN_COUNTRIES } from '@/app/lib/african-countries'
import { readImageFile } from '@/app/lib/imageUpload'
import { User, Mail, Phone, MapPin, Linkedin, Globe, Shield, UserCircle, Building2, Save, Lock, Trash2, Download, AlertTriangle } from 'lucide-react'
import Image from 'next/image'
import AuthGuard from '@/components/AuthGuard'
import MultiSelect from '@/components/MultiSelect'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'
import { toast } from 'sonner'

// Cette page lit les search params et des données utilisateur côté client,
// on force un rendu dynamique pour éviter les erreurs de pré-rendu.
export const dynamic = 'force-dynamic'

function ProfilePageContent() {
  const { user: authUser, refreshUser } = useAuth()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'info' | 'btoc' | 'btob' | 'security'>(() => {
    const tab = searchParams?.get('tab') as 'info' | 'btoc' | 'btob' | 'security' | null
    return tab ?? 'info'
  })
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  const isOnboarding = searchParams?.get('onboarding') === 'true'

  const { data: profile, isLoading } = useQuery({
    queryKey: qk.profile(authUser?.id ?? ''),
    queryFn: () => apiJson(`/profiles/${authUser?.id}`),
    enabled: !!authUser?.id,
  })

  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null)
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null)
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null)
  const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const headerInputRef = useRef<HTMLInputElement | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const savedInfoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedBtoCTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedBtoBTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (savedInfoTimer.current) clearTimeout(savedInfoTimer.current)
    if (savedBtoCTimer.current) clearTimeout(savedBtoCTimer.current)
    if (savedBtoBTimer.current) clearTimeout(savedBtoBTimer.current)
  }, [])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [savedInfo, setSavedInfo] = useState(false)
  const [savedBtoC, setSavedBtoC] = useState(false)
  const [savedBtoB, setSavedBtoB] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Controlled multi-selects for Industries / Markets
  const [btocIndustries, setBtocIndustries] = useState<string[]>([])
  const [btobIndustries, setBtobIndustries] = useState<string[]>([])
  const [btobMarkets, setBtobMarkets] = useState<string[]>([])

  // Pre-fill multi-selects when profile data arrives
  useEffect(() => {
    if (profile?.btoCProfile?.industries?.length) setBtocIndustries(profile.btoCProfile.industries)
    if (profile?.btoBProfile?.industries?.length) setBtobIndustries(profile.btoBProfile.industries)
    if (profile?.btoBProfile?.marketFocus?.length) setBtobMarkets(profile.btoBProfile.marketFocus)
  }, [profile])

  const updateMeMutation = useTrackedMutation('profile.updateMe', {
    mutationFn: (data: any) => apiJson('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: qk.profile(authUser?.id ?? '') })
      setSavedInfo(true)
      if (savedInfoTimer.current) clearTimeout(savedInfoTimer.current)
      savedInfoTimer.current = setTimeout(() => setSavedInfo(false), 3000)
    },
  })

  const updateBtoCMutation = useTrackedMutation('profile.updateBtoC', {
    mutationFn: (data: any) => apiJson(`/profiles/bto-c/${authUser?.id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.profile(authUser?.id ?? '') })
      setSavedBtoC(true)
      if (savedBtoCTimer.current) clearTimeout(savedBtoCTimer.current)
      savedBtoCTimer.current = setTimeout(() => setSavedBtoC(false), 3000)
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, 'Impossible de sauvegarder le profil professionnel'))
    },
  })

  const updateBtoBMutation = useTrackedMutation('profile.updateBtoB', {
    mutationFn: (data: any) =>
      apiJson(`/profiles/bto-b/${authUser?.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.profile(authUser?.id ?? '') })
      setSavedBtoB(true)
      if (savedBtoBTimer.current) clearTimeout(savedBtoBTimer.current)
      savedBtoBTimer.current = setTimeout(() => setSavedBtoB(false), 3000)
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, 'Impossible de sauvegarder le profil entreprise'))
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiJson('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      setPwSuccess(true)
      setPwError(null)
    },
    onError: (err: any) => {
      setPwError(err?.message || 'Impossible de changer le mot de passe.')
      setPwSuccess(false)
    },
  })

  const deleteMeMutation = useMutation({
    mutationFn: () => apiJson('/users/me', { method: 'DELETE' }),
    onSuccess: async () => {
      await logout()
      router.replace('/')
    },
    onError: (err: any) => setPwError(err?.message || 'Impossible de supprimer le compte.'),
  })

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/users/me/export`,
        { method: 'POST', credentials: 'include' },
      )
      if (!res.ok) throw new Error('Export échoué')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `southconnect-export-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    },
  })

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
    <AuthGuard
      skeleton={
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-gray-200 rounded-xl" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      }
    >
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {isOnboarding && (
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-[#3b49df] to-[#2d3aba] px-6 py-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0">S</div>
            <div className="flex-1">
              <p className="text-base font-bold mb-1">Bienvenue sur SouthConnect, {authUser?.firstName || authUser?.name} !</p>
              <p className="text-sm text-white/80 mb-4">
                Complétez votre profil en 3 étapes pour commencer à vous connecter avec l&apos;écosystème.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${profile?.profilePic ? 'bg-green-400/30 text-white' : 'bg-white/10 text-white/70'}`}>
                  {profile?.profilePic ? '✓' : '1'} Ajouter ma photo
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${profile?.bio ? 'bg-green-400/30 text-white' : 'bg-white/10 text-white/70'}`}>
                  {profile?.bio ? '✓' : '2'} Écrire ma bio
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${(profile?.btoCProfile || profile?.btoBProfile) ? 'bg-green-400/30 text-white' : 'bg-white/10 text-white/70'}`}>
                  {(profile?.btoCProfile || profile?.btoBProfile) ? '✓' : '3'} Configurer mon profil pro
                </div>
              </div>
            </div>
          </div>
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
                    const preview = await readImageFile(file, setUploadError)
                    if (!preview) return
                    setAvatarFile(file)
                    setAvatarPreview(preview)

                    try {
                      const url = await uploadImage(file, 'avatars', authUser.id, 'images')
                      await apiJson('/users/me/profile-pic', {
                        method: 'PUT',
                        body: JSON.stringify({ profilePic: url }),
                      })
                      await refreshUser()
                      queryClient.invalidateQueries({ queryKey: qk.profile(authUser.id) })
                    } catch (error: any) {
                      setUploadError(error?.message || 'Impossible de mettre à jour la photo de profil')
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
            <button onClick={() => setUploadError(null)} className="ml-2 font-bold" aria-label="Dismiss">&times;</button>
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
            Informations
          </button>
          <button
            onClick={() => setActiveTab('btoc')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'btoc' ? 'text-[#3b49df] bg-[#3b49df]/5' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserCircle className="w-4 h-4" />
            Profil individuel
          </button>
          <button
            onClick={() => setActiveTab('btob')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'btob' ? 'text-[#3b49df] bg-[#3b49df]/5' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Profil entreprise
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'security' ? 'text-[#3b49df] bg-[#3b49df]/5' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Lock className="w-4 h-4" />
            Sécurité
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
                Profil individuel
              </p>
              <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-sm font-bold text-[#3b49df] relative">
                    {profile.profilePic ? (
                      <Image src={profile.profilePic} alt="" fill className="object-cover" sizes="64px" />
                    ) : (
                      profile.name?.[0] || 'U'
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{profile.name}</div>
                    <div className="text-xs text-gray-500">
                      {profile.btoCProfile.opportunitiesCount ?? 0} Opportunités •{' '}
                      {profile.btoCProfile.followersCount ?? 0} Abonnés
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('btoc')}
                  className="text-xs font-semibold text-[#3b49df] hover:underline"
                >
                  Modifier
                </button>
              </div>
            </div>
          )}

          {/* BtoB cards */}
          {profile?.btoBProfile && (
            <div>
              <p className="text-[10px] font-bold text-[#3b49df] uppercase tracking-widest mb-2 px-1">
                Profil entreprise
              </p>
              <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center text-sm font-bold text-[#3b49df] relative">
                    {profile.btoBProfile.logo ? (
                      <Image src={profile.btoBProfile.logo} alt="" fill className="object-cover" sizes="64px" />
                    ) : (
                      (profile.btoBProfile.companyName || 'C')?.[0]
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {profile.btoBProfile.companyName || 'My Company'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {profile.btoBProfile.opportunitiesCount ?? 0} Opportunités •{' '}
                      {profile.btoBProfile.followersCount ?? 0} Abonnés
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('btob')}
                  className="text-xs font-semibold text-[#3b49df] hover:underline"
                >
                  Modifier
                </button>
              </div>
            </div>
          )}

          {/* CTA if no BtoB profile */}
          {!profile?.btoBProfile && (
            <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Prêt à présenter votre entreprise ?</p>
                <p className="text-xs text-gray-500 mt-0.5">Ajoutez un profil entreprise et gagnez en visibilité.</p>
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
            <h2 className="text-xl font-bold text-gray-900 mb-6">Informations générales</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <User className="w-3 h-3 inline mr-1" />Prénom
                </label>
                <input
                  name="firstName"
                  defaultValue={profile?.firstName || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  placeholder="Prénom"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <User className="w-3 h-3 inline mr-1" />Nom
                </label>
                <input
                  name="lastName"
                  defaultValue={profile?.lastName || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  placeholder="Nom"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <Phone className="w-3 h-3 inline mr-1" />Téléphone
                </label>
                <input
                  name="phone"
                  defaultValue={profile?.phone || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <MapPin className="w-3 h-3 inline mr-1" />Ville
                </label>
                <input
                  name="city"
                  defaultValue={profile?.city || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  placeholder="Dakar"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <MapPin className="w-3 h-3 inline mr-1" />Pays
                </label>
                <select
                  name="country"
                  defaultValue={profile?.country || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df] bg-white"
                >
                  <option value="">Sélectionner un pays</option>
                  {AFRICAN_COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
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
                placeholder="Une courte présentation de vous-même…"
              />
            </div>

            {savedInfo && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-medium">
                Profil mis à jour avec succès.
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
                {updateMeMutation.isPending ? 'Enregistrement…' : 'Sauvegarder'}
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
              tags: (data.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean),
              industries: btocIndustries,
              lookingForOpportunities: !!data.lookingForOpportunities,
            })
          }}>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Profil professionnel individuel</h2>
            {!profile?.btoCProfile && (
              <div className="p-4 bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-xl text-sm mb-6">
                Vous n'avez pas encore configuré votre profil individuel. Remplissez le formulaire ci-dessous pour commencer.
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description professionnelle</label>
                <textarea
                  name="description"
                  defaultValue={profile?.btoCProfile?.description || ''}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  placeholder="Décrivez votre parcours professionnel et ce que vous recherchez…"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compétences (séparées par des virgules)</label>
                  <input
                    name="tags"
                    defaultValue={profile?.btoCProfile?.tags?.join(', ') || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Niveau d'expérience</label>
                  <select
                    name="seniorityLevel"
                    defaultValue={profile?.btoCProfile?.seniorityLevel || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  >
                    <option value="">Choisir un niveau</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Intermédiaire</option>
                    <option value="senior">Senior</option>
                    <option value="expert">Expert / C-Level</option>
                  </select>
                </div>
              </div>

              <MultiSelect
                endpoint="/industries"
                value={btocIndustries}
                onChange={setBtocIndustries}
                label="Industries"
                placeholder="Sélectionner des secteurs…"
              />
            </div>

            {savedBtoC && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-medium">
                Profil individuel mis à jour.
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={updateBtoCMutation.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-[#3b49df] text-white rounded-lg font-bold hover:bg-[#2d3aba] transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updateBtoCMutation.isPending ? 'Enregistrement…' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'security' && (
          <div className="space-y-10">
            {/* Change password */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Changer le mot de passe</h2>
              <p className="text-sm text-gray-500 mb-6">Votre nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.</p>
              <form
                className="space-y-4 max-w-md"
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  const currentPassword = fd.get('currentPassword') as string
                  const newPassword = fd.get('newPassword') as string
                  const confirmPassword = fd.get('confirmPassword') as string
                  if (newPassword !== confirmPassword) {
                    setPwError('Les mots de passe ne correspondent pas.')
                    return
                  }
                  setPwError(null)
                  setPwSuccess(false)
                  changePasswordMutation.mutate({ currentPassword, newPassword })
                  ;(e.target as HTMLFormElement).reset()
                }}
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mot de passe actuel</label>
                  <input
                    name="currentPassword"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nouveau mot de passe</label>
                  <input
                    name="newPassword"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df]"
                  />
                </div>
                {pwError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{pwError}</div>
                )}
                {pwSuccess && (
                  <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-medium">Mot de passe mis à jour avec succès.</div>
                )}
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-[#3b49df] text-white rounded-lg text-sm font-bold hover:bg-[#2d3aba] transition-colors disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {changePasswordMutation.isPending ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                </button>
              </form>
            </section>

            <hr className="border-gray-100" />

            {/* RGPD export */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Exporter mes données</h2>
              <p className="text-sm text-gray-500 mb-4">Téléchargez une copie de toutes vos données personnelles (RGPD Article 20).</p>
              <button
                type="button"
                onClick={() => exportDataMutation.mutate()}
                disabled={exportDataMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {exportDataMutation.isPending ? 'Préparation…' : 'Télécharger mes données'}
              </button>
            </section>

            <hr className="border-red-100" />

            {/* Account deletion */}
            <section>
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-lg font-bold text-red-600">Supprimer mon compte</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Cette action est <strong>irréversible</strong>. Toutes vos données (profil, opportunités, candidatures, messages) seront définitivement supprimées.
                  </p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-5 max-w-md">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Tapez <span className="font-mono font-bold text-red-600">SUPPRIMER</span> pour confirmer
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-red-400 focus:border-red-400 bg-white mb-4"
                />
                <button
                  type="button"
                  disabled={deleteConfirm !== 'SUPPRIMER' || deleteMeMutation.isPending}
                  onClick={() => deleteMeMutation.mutate()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleteMeMutation.isPending ? 'Suppression…' : 'Supprimer définitivement mon compte'}
                </button>
              </div>
            </section>
          </div>
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
                industries: btobIndustries,
                marketFocus: btobMarkets,
              }

              setIsUploading(true)
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
                setUploadError(error?.message || 'Impossible d\'uploader les images')
              } finally {
                setIsUploading(false)
              }
            }}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Profil entreprise / organisation</h2>
            {!profile?.btoBProfile && (
              <div className="p-4 bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-xl text-sm mb-6">
                Vous n'avez pas encore configuré votre profil entreprise.
              </div>
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo de l'entreprise
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
                      Uploader
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const preview = await readImageFile(file, setUploadError)
                          if (!preview) return
                          setCompanyLogoFile(file)
                          setCompanyLogoPreview(preview)
                        }}
                      />
                    </label>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image d'en-tête
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
                      Uploader l'en-tête
                      <input
                        ref={headerInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const preview = await readImageFile(file, setUploadError)
                          if (!preview) return
                          setHeaderImageFile(file)
                          setHeaderImagePreview(preview)
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
                  <input
                    name="companyName"
                    defaultValue={profile?.btoBProfile?.companyName || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stade de développement</label>
                  <select
                    name="developmentStage"
                    defaultValue={profile?.btoBProfile?.developmentStage || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  >
                    <option value="">Choisir un stade</option>
                    <option value="ideation">Idéation</option>
                    <option value="mvp">MVP</option>
                    <option value="growth">Croissance</option>
                    <option value="scaling">Mise à l'échelle</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Punchline</label>
                <input
                  name="punchline"
                  defaultValue={profile?.btoBProfile?.punchline || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  placeholder="Une phrase courte sur votre entreprise"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description de l'entreprise</label>
                <textarea
                  name="description"
                  defaultValue={profile?.btoBProfile?.description || ''}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MultiSelect
                  endpoint="/industries"
                  value={btobIndustries}
                  onChange={setBtobIndustries}
                  label="Industries"
                  placeholder="Sélectionner des secteurs…"
                />
                <MultiSelect
                  endpoint="/markets"
                  value={btobMarkets}
                  onChange={setBtobMarkets}
                  label="Marchés / Géographies"
                  placeholder="Sélectionner des marchés…"
                />
              </div>
            </div>

            {savedBtoB && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-medium">
                Profil entreprise mis à jour.
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={updateBtoBMutation.isPending || isUploading}
                className="flex items-center gap-2 px-6 py-2 bg-[#3b49df] text-white rounded-lg font-bold hover:bg-[#2d3aba] transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isUploading ? 'Upload en cours…' : updateBtoBMutation.isPending ? 'Enregistrement…' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </AuthGuard>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Chargement du profil…</div>}>
      <ProfilePageContent />
    </Suspense>
  )
}
