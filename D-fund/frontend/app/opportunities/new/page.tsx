'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiJson, OpportunityType, uploadImage } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { ArrowLeft, Plus, Send, Info, MapPin, Globe, DollarSign, Image as ImageIcon, X, Clock, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import MultiSelect from '@/components/MultiSelect'

const OPPORTUNITY_TYPES: { value: OpportunityType; label: string; description: string }[] = [
  { value: 'JOB_OPPORTUNITY', label: 'Offre d\'emploi', description: 'Publiez une offre d\'emploi pour votre startup ou entreprise.' },
  { value: 'CO_FOUNDER_OPPORTUNITY', label: 'Recherche co-fondateur', description: 'Trouvez un associé pour construire votre prochain projet.' },
  { value: 'BUSINESS_IDEA', label: 'Idée de business', description: 'Partagez un concept et trouvez des collaborateurs ou des retours.' },
  { value: 'SERVICE_LISTING', label: 'Offre de service', description: 'Proposez vos services professionnels à la communauté.' },
  { value: 'INVESTOR_PROFILE', label: 'Profil investisseur', description: 'Vous êtes investisseur ? Faites connaître votre thèse.' },
  { value: 'FUNDING_OPPORTUNITY', label: 'Opportunité de financement', description: 'Listez une levée de fonds ou une subvention.' },
  { value: 'EVENT', label: 'Événement', description: 'Promouvez un webinaire, atelier ou événement de networking.' },
  { value: 'MENTORSHIP_BA_OFFER', label: 'Offre de mentorat / BA', description: 'Offrez votre temps pour accompagner des fondateurs en phase initiale.' },
]

export default function CreateOpportunityPage() {
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState<OpportunityType | ''>('')
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])

  // Controlled fields so AI can pre-fill them
  const [fieldName, setFieldName] = useState('')
  const [fieldPunchline, setFieldPunchline] = useState('')
  const [fieldDescription, setFieldDescription] = useState('')
  const [fieldTags, setFieldTags] = useState('')

  // AI panel state
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiContext, setAiContext] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

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

      // 2. Upload images in parallel (only if selected)
      let imageUrl: string | undefined
      let backgroundImageUrl: string | undefined

      if (logoImage || coverImage) {
        setIsUploading(true)
        try {
          const [logo, cover] = await Promise.all([
            logoImage
              ? uploadImage(logoImage, 'opportunities', created.id, 'images')
              : Promise.resolve(undefined),
            coverImage
              ? uploadImage(coverImage, 'opportunities', created.id, 'images')
              : Promise.resolve(undefined),
          ])
          imageUrl = logo
          backgroundImageUrl = cover
        } catch (error: any) {
          // Supprimer l'opportunité orpheline pour éviter des brouillons fantômes
          await apiJson(`/opportunities/${created.id}`, { method: 'DELETE' }).catch(() => undefined)
          throw new Error(`Échec de l'envoi des images : ${error.message}`)
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
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      router.push(`/opportunities/${data.id}`)
    },
    onError: (error: any) => {
      setErrorMessage(error.message || 'Impossible de créer l\'opportunité.')
    }
  })

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image trop volumineuse (5 Mo max).')
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
        setErrorMessage('Image trop volumineuse (5 Mo max).')
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
      name: fieldName,
      punchline: fieldPunchline,
      description: fieldDescription,
      remote: !!raw.remote,
      tags: fieldTags.split(',').map((t) => t.trim()).filter(Boolean),
      industries: selectedIndustries,
      markets: selectedMarkets,
      price: raw.price ? parseFloat(raw.price as string) : undefined,
    }
    
    createMutation.mutate(data)
  }

  const handleGenerate = async () => {
    if (!selectedType || !aiContext.trim()) return
    setIsGenerating(true)
    setAiError(null)
    try {
      const result = await apiJson('/ai/generate-opportunity', {
        method: 'POST',
        body: JSON.stringify({ type: selectedType, context: aiContext.trim() }),
      })
      setFieldName(result.name ?? '')
      setFieldPunchline(result.punchline ?? '')
      setFieldDescription(result.description ?? '')
      setFieldTags((result.tags ?? []).join(', '))
      setShowAiPanel(false)
      setAiContext('')
    } catch (err: any) {
      setAiError(err.message || 'La génération a échoué. Veuillez réessayer.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <AuthGuard>
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
            <h1 className="text-2xl font-bold text-gray-900">Créer une opportunité</h1>
          </div>
          {selectedType && (
            <button
              type="button"
              onClick={() => setShowAiPanel((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              Générer avec l'IA
            </button>
          )}
        </div>
      </div>

      {/* AI Panel */}
      {showAiPanel && (
        <div className="container mx-auto px-4 max-w-5xl mb-6">
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                <h3 className="text-sm font-bold text-violet-900">Générateur d'opportunités par IA</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowAiPanel(false); setAiError(null) }}
                className="text-violet-400 hover:text-violet-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-violet-700 mb-4">
              Décrivez brièvement ce que vous souhaitez publier — l'IA générera un brouillon complet que vous pourrez modifier avant de soumettre.
            </p>

            <textarea
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={`Ex. "Je cherche un développeur React avec 3+ ans d'expérience pour rejoindre ma startup fintech basée à Lagos. Télétravail possible, equity offerte."`}
              className="w-full px-3 py-2.5 border border-violet-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-violet-400">{aiContext.length}/500 caractères</span>
              <div className="flex items-center gap-2">
                {aiError && (
                  <span className="text-xs text-red-500 mr-2">{aiError}</span>
                )}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!aiContext.trim() || isGenerating}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Génération…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Générer</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                Que publiez-vous ?
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
                  Détails
                </h2>
                
                <div className="space-y-4">
                  {/* Images */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cover Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image de couverture <span className="text-gray-400 font-normal">(optionnel)</span>
                      </label>
                      {coverImagePreview ? (
                        <div className="relative w-full h-36 rounded-xl overflow-hidden border border-gray-200">
                          <img src={coverImagePreview} alt="Cover preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={removeCoverImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                          <ImageIcon className="w-7 h-7 mb-2 text-gray-300" />
                          <p className="text-sm text-gray-400"><span className="font-medium text-gray-500">Cliquez pour uploader</span></p>
                          <p className="text-xs text-gray-400 mt-0.5">PNG, JPG jusqu'à 5 Mo</p>
                          <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverImageChange} className="hidden" />
                        </label>
                      )}
                    </div>

                    {/* Logo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Logo / Miniature <span className="text-gray-400 font-normal">(optionnel)</span>
                      </label>
                      {logoImagePreview ? (
                        <div className="relative w-full h-36 rounded-xl overflow-hidden border border-gray-200">
                          <img src={logoImagePreview} alt="Logo preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={removeLogoImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                          <ImageIcon className="w-7 h-7 mb-2 text-gray-300" />
                          <p className="text-sm text-gray-400"><span className="font-medium text-gray-500">Cliquez pour uploader</span></p>
                          <p className="text-xs text-gray-400 mt-0.5">PNG, JPG jusqu'à 5 Mo</p>
                          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoImageChange} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titre de l'opportunité *</label>
                    <input
                      name="name"
                      required
                      value={fieldName}
                      onChange={(e) => setFieldName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      placeholder="Ex. Développeur React Senior"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accroche (résumé court)</label>
                    <input
                      name="punchline"
                      value={fieldPunchline}
                      onChange={(e) => setFieldPunchline(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      placeholder="Ex. Rejoignez notre startup fintech en pleine croissance"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <textarea
                      name="description"
                      required
                      rows={6}
                      value={fieldDescription}
                      onChange={(e) => setFieldDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      placeholder="Décrivez l'opportunité en détail…"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Ville
                      </label>
                      <input
                        name="city"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Pays
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
                    <label htmlFor="remote" className="text-sm font-medium text-gray-700">Opportunité en télétravail</label>
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
                <Send className="w-5 h-5" />
                {isUploading
                  ? 'Upload en cours…'
                  : createMutation.isPending
                  ? 'Envoi en cours…'
                  : 'Soumettre pour révision'}
              </button>

              {/* Moderation info */}
              <div className="flex items-start gap-2.5 p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-700">
                <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p>Votre opportunité sera examinée par notre équipe avant d'être visible par la communauté (généralement sous 24h).</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informations supplémentaires</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Prix / Budget
                  </label>
                  <input
                    name="price"
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  />
                </div>

                <MultiSelect
                  endpoint="/industries"
                  value={selectedIndustries}
                  onChange={setSelectedIndustries}
                  label="Industries"
                  placeholder="Sélectionner des secteurs…"
                />

                <MultiSelect
                  endpoint="/markets"
                  value={selectedMarkets}
                  onChange={setSelectedMarkets}
                  label="Marchés"
                  placeholder="Sélectionner des marchés…"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (séparés par des virgules)</label>
                  <input
                    name="tags"
                    value={fieldTags}
                    onChange={(e) => setFieldTags(e.target.value)}
                    placeholder="React, Télétravail, Temps-plein"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#3b49df] focus:border-[#3b49df] sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    </AuthGuard>
  )
}
