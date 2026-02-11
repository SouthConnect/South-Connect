'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { apiJson, OpportunityType, uploadImage } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { ArrowLeft, Plus, Save, Info, MapPin, Globe, DollarSign, Image as ImageIcon, X } from 'lucide-react'
import Link from 'next/link'

const OPPORTUNITY_TYPES: { value: OpportunityType; label: string; description: string }[] = [
  { value: 'JOB_OPPORTUNITY', label: 'Job Opportunity', description: 'Post a job offer for your startup or company.' },
  { value: 'CO_FOUNDER_OPPORTUNITY', label: 'Co-founder Opportunity', description: 'Find a partner to build your next big idea.' },
  { value: 'BUSINESS_IDEA', label: 'Business Idea', description: 'Share a concept and find collaborators or feedback.' },
  { value: 'SERVICE_LISTING', label: 'Service Listing', description: 'Offer your professional services to the community.' },
  { value: 'INVESTOR_PROFILE', label: 'Investor Profile', description: 'Are you an investor? Let people know your thesis.' },
  { value: 'FUNDING_OPPORTUNITY', label: 'Funding Opportunity', description: 'List a funding round or grant.' },
  { value: 'EVENT', label: 'Event', description: 'Promote a webinar, workshop, or networking event.' },
  { value: 'MENTORSHIP_BA_OFFER', label: 'Mentorship / BA Offer', description: 'Offer your time to mentor early-stage founders.' },
]

export default function CreateOpportunityPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedType, setSelectedType] = useState<OpportunityType | ''>('')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [logoImage, setLogoImage] = useState<File | null>(null)
  const [logoImagePreview, setLogoImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      setErrorMessage(null)

      // 1. Création de l'opportunité sans les images
      const created = await apiJson('/opportunities', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      // 2. Upload des images si présentes, avec le vrai ID de l'opportunité
      let imageUrl: string | undefined
      let backgroundImageUrl: string | undefined

      if (logoImage) {
        setIsUploading(true)
        try {
          imageUrl = await uploadImage(logoImage, 'opportunities', created.id, 'images')
        } catch (error: any) {
          throw new Error(`Failed to upload logo: ${error.message}`)
        } finally {
          setIsUploading(false)
        }
      }

      if (coverImage) {
        setIsUploading(true)
        try {
          backgroundImageUrl = await uploadImage(coverImage, 'opportunities', created.id, 'images')
        } catch (error: any) {
          throw new Error(`Failed to upload cover image: ${error.message}`)
        } finally {
          setIsUploading(false)
        }
      }

      // 3. Mise à jour de l'opportunité avec les URLs d'images si nécessaire
      if (imageUrl || backgroundImageUrl) {
        const updated = await apiJson(`/opportunities/${created.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            image: imageUrl ?? created.image,
            backgroundImage: backgroundImageUrl ?? created.backgroundImage,
          }),
        })

        return updated
      }

      return created
    },
    onSuccess: (data) => {
      router.push(`/opportunities/${data.id}`)
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Failed to create opportunity')
    }
  })

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }
      setCoverImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogoImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }
      setLogoImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeCoverImage = () => {
    setCoverImage(null)
    setCoverImagePreview(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  const removeLogoImage = () => {
    setLogoImage(null)
    setLogoImagePreview(null)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">You must be signed in</h1>
        <Link href="/login" className="text-[#3b49df] hover:underline">Sign in</Link>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedType) return
    
    const formData = new FormData(e.currentTarget)
    const raw = Object.fromEntries(formData.entries())

    const toArray = (value: FormDataEntryValue | undefined) =>
      typeof value === 'string'
        ? value
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : []

    const data = {
      ...raw,
      type: selectedType,
      remote: !!raw.remote,
      tags: toArray(raw.tags),
      industries: toArray(raw.industries),
      markets: toArray(raw.markets),
      price: raw.price ? parseFloat(raw.price as string) : undefined,
    }
    
    createMutation.mutate(data)
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="bg-white border-b border-gray-100 py-6 mb-8">
        <div className="container mx-auto px-4 flex items-center justify-between max-w-5xl">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Create new opportunity</h1>
          </div>
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
            {/* Type Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#3b49df]" />
                What are you listing?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {OPPORTUNITY_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedType(type.value)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      selectedType === type.value
                        ? 'border-[#3b49df] bg-[#3b49df]/5 ring-2 ring-[#3b49df]/10'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold text-gray-900 mb-1">{type.label}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Details */}
            {selectedType && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#3b49df]" />
                  Details
                </h2>
                
                {/* Image Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cover Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Image (optional)
                    </label>
                    {coverImagePreview ? (
                      <div className="relative">
                        <img
                          src={coverImagePreview}
                          alt="Cover preview"
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={removeCoverImage}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Click to upload cover</span>
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCoverImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Logo Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo / Thumbnail (optional)
                    </label>
                    {logoImagePreview ? (
                      <div className="relative">
                        <img
                          src={logoImagePreview}
                          alt="Logo preview"
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={removeLogoImage}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Click to upload logo</span>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Cover Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Image (optional)
                    </label>
                    {coverImagePreview ? (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={coverImagePreview}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeCoverImage}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImageIcon className="w-8 h-8 mb-2 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                        </div>
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCoverImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Logo Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo / Thumbnail (optional)
                    </label>
                    {logoImagePreview ? (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={logoImagePreview}
                          alt="Logo preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeLogoImage}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col items-center justify-center">
                          <ImageIcon className="w-6 h-6 mb-1 text-gray-400" />
                          <p className="text-xs text-gray-500 text-center px-2">Upload logo</p>
                        </div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Name *</label>
                    <input
                      name="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      placeholder="e.g. Lead React Developer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Punchline (short summary)</label>
                    <input
                      name="punchline"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      placeholder="e.g. Join our fast-growing fintech startup"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <textarea
                      name="description"
                      required
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      placeholder="Describe the opportunity in detail..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        City
                      </label>
                      <input
                        name="city"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Country
                      </label>
                      <input
                        name="country"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="remote"
                      name="remote"
                      className="rounded border-gray-300 text-[#3b49df] focus:ring-[#3b49df]"
                    />
                    <label htmlFor="remote" className="text-sm font-medium text-gray-700">This is a remote opportunity</label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column / Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 sticky top-8">
              <button
                type="submit"
                disabled={!selectedType || createMutation.isPending || isUploading}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#3b49df] text-white rounded-xl font-bold hover:bg-[#2d3aba] transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {isUploading
                  ? 'Uploading images...'
                  : createMutation.isPending
                  ? 'Publishing...'
                  : 'Publish Opportunity'}
              </button>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Additional Info</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Price / Budget
                  </label>
                  <input
                    name="price"
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industries (comma separated)</label>
                  <input
                    name="industries"
                    placeholder="Tech, Health, Finance"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                  <input
                    name="tags"
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
  )
}
