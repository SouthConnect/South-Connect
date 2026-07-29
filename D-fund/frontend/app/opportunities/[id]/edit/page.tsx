'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { qk } from '@/app/lib/queryKeys'
import { apiJson, uploadImage, getErrorMessage } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { AFRICAN_COUNTRIES } from '@/app/lib/african-countries'
import { readImageFile } from '@/app/lib/imageUpload'
import { ArrowLeft, Save, Info, MapPin, Globe, DollarSign, Image as ImageIcon, X } from 'lucide-react'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import MultiSelect from '@/components/MultiSelect'
import { Spinner } from '@/components/Spinner'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'

export default function EditOpportunityPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const id = params?.id as string

  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [logoImage, setLogoImage] = useState<File | null>(null)
  const [logoImagePreview, setLogoImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])
  const coverInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  // Guard: pre-fill multiselects only once after initial data load, not on every refetch
  const prefilled = useRef(false)

  const { data: opportunity, isLoading } = useQuery({
    queryKey: qk.opportunity(id),
    queryFn: () => apiJson(`/opportunities/${id}`),
    enabled: !!id,
  })

  // Redirect if user is not the owner
  useEffect(() => {
    if (opportunity && user && opportunity.ownerId !== user.id) {
      router.replace(`/opportunities/${id}`)
    }
  }, [opportunity, user, id, router])

  // Pre-fill image previews and multiselects from existing data — runs once only
  useEffect(() => {
    if (opportunity && !prefilled.current) {
      prefilled.current = true
      if (opportunity.backgroundImage) setCoverImagePreview(opportunity.backgroundImage)
      if (opportunity.image) setLogoImagePreview(opportunity.image)
      if (opportunity.industries?.length) setSelectedIndustries(opportunity.industries)
      if (opportunity.markets?.length) setSelectedMarkets(opportunity.markets)
    }
  }, [opportunity])

  const updateMutation = useTrackedMutation('opportunity.update', {
    mutationFn: async (data: any) => {
      setErrorMessage(null)

      let imageUrl: string | undefined = opportunity?.image
      let backgroundImageUrl: string | undefined = opportunity?.backgroundImage

      if (logoImage || coverImage) {
        setIsUploading(true)
        try {
          const [logo, cover] = await Promise.all([
            logoImage
              ? uploadImage(logoImage, 'opportunities', id, 'images')
              : Promise.resolve(undefined),
            coverImage
              ? uploadImage(coverImage, 'opportunities', id, 'images')
              : Promise.resolve(undefined),
          ])
          if (logo) imageUrl = logo
          if (cover) backgroundImageUrl = cover
        } catch (error: any) {
          throw new Error(`Échec de l'envoi des images : ${error.message}`)
        } finally {
          setIsUploading(false)
        }
      }

      return apiJson(`/opportunities/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, image: imageUrl, backgroundImage: backgroundImageUrl }),
      })
    },
    onSuccess: () => {
      router.push(`/opportunities/${id}`)
    },
    onError: (error: unknown) => {
      setErrorMessage(getErrorMessage(error, "Impossible de mettre à jour l'opportunité."))
    },
  })

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = await readImageFile(file, setErrorMessage)
    if (!preview) return
    setCoverImage(file)
    setCoverImagePreview(preview)
  }

  const handleLogoImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = await readImageFile(file, setErrorMessage)
    if (!preview) return
    setLogoImage(file)
    setLogoImagePreview(preview)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const raw = Object.fromEntries(formData.entries())
    const toArray = (v: FormDataEntryValue | undefined) =>
      typeof v === 'string' ? v.split(',').map((t) => t.trim()).filter(Boolean) : []

    updateMutation.mutate({
      ...raw,
      remote: (e.currentTarget.querySelector('#remote') as HTMLInputElement)?.checked ?? false,
      tags: toArray(raw.tags),
      industries: selectedIndustries,
      markets: selectedMarkets,
      price: raw.price ? parseFloat(raw.price as string) : undefined,
    })
  }

  return (
    <AuthGuard>
    {isLoading ? (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    ) : !opportunity ? (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Opportunity not found</h1>
        <Link href="/my-opportunities" className="text-[#3b49df] hover:underline">Back to my opportunities</Link>
      </div>
    ) : (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="bg-white border-b border-gray-100 py-6 mb-8">
        <div className="container mx-auto px-4 flex items-center gap-4 max-w-5xl">
          <button
            onClick={() => router.push(`/opportunities/${id}`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit opportunity</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl">
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Type (read-only) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Type</p>
              <p className="text-sm font-semibold text-gray-700">{opportunity.type?.replace(/_/g, ' ')}</p>
            </div>

            {/* Images */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#3b49df]" />
                Images
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cover */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
                  {coverImagePreview ? (
                    <div className="relative">
                      <img src={coverImagePreview} alt="Cover" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => { setCoverImage(null); setCoverImagePreview(null); if (coverInputRef.current) coverInputRef.current.value = '' }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Upload cover</span>
                      <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverImageChange} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo / Thumbnail</label>
                  {logoImagePreview ? (
                    <div className="relative">
                      <img src={logoImagePreview} alt="Logo" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => { setLogoImage(null); setLogoImagePreview(null); if (logoInputRef.current) logoInputRef.current.value = '' }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Upload logo</span>
                      <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoImageChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#3b49df]" />
                Details
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Name *</label>
                <input
                  name="name"
                  required
                  defaultValue={opportunity.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Punchline</label>
                <input
                  name="punchline"
                  defaultValue={opportunity.punchline ?? ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  name="description"
                  required
                  rows={6}
                  defaultValue={opportunity.description ?? ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> City
                  </label>
                  <input
                    name="city"
                    defaultValue={opportunity.city ?? ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Pays
                  </label>
                  <select
                    name="country"
                    defaultValue={opportunity.country ?? ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm bg-white"
                  >
                    <option value="">Sélectionner un pays</option>
                    {AFRICAN_COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="remote"
                  name="remote"
                  defaultChecked={!!opportunity.remote}
                  className="rounded border-gray-300 text-[#3b49df] focus:ring-[#3b49df]"
                />
                <label htmlFor="remote" className="text-sm font-medium text-gray-700">Remote opportunity</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">External URL</label>
                <input
                  name="url"
                  type="url"
                  defaultValue={opportunity.url ?? ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 sticky top-8">
              <button
                type="submit"
                disabled={updateMutation.isPending || isUploading}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#3b49df] text-white rounded-xl font-bold hover:bg-[#2d3aba] transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {isUploading ? 'Uploading...' : updateMutation.isPending ? 'Saving...' : 'Save changes'}
              </button>

              <Link
                href={`/opportunities/${id}`}
                className="flex items-center justify-center w-full py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Additional Info</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Price / Budget
                  </label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={opportunity.price ?? ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  />
                </div>

                <MultiSelect
                  endpoint="/industries"
                  value={selectedIndustries}
                  onChange={setSelectedIndustries}
                  label="Industries"
                  placeholder="Select industries…"
                />

                <MultiSelect
                  endpoint="/markets"
                  value={selectedMarkets}
                  onChange={setSelectedMarkets}
                  label="Markets"
                  placeholder="Select markets…"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                  <input
                    name="tags"
                    defaultValue={(opportunity.tags ?? []).join(', ')}
                    placeholder="React, Remote, Full-time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    )}
    </AuthGuard>
  )
}
