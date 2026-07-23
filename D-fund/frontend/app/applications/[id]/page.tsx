'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/app/lib/queryKeys'
import { apiJson, uploadImage, getErrorMessage } from '@/app/lib/api'
import AuthGuard from '@/components/AuthGuard'
import { ArrowLeft, FileText, Paperclip, Gift, Send, ExternalLink, Upload, X, Download } from 'lucide-react'
import { stageLabel, stageColor } from '@/app/lib/stage-labels'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ConfirmModal'
import type { Application } from '@/app/lib/types'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'

type Tab = 'main' | 'attachments' | 'referrals'

function AppDetailSkeleton() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  )
}

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const id = params?.id as string

  const {
    data: applications,
    isLoading,
    isError,
    error,
  } = useQuery<Application[]>({
    queryKey: qk.myApplicationsFull(user?.id ?? ''),
    queryFn: () => apiJson<Application[]>(`/applications/user/${user?.id}`),
    enabled: !!user?.id,
  })

  const application = applications?.find((a) => a.id === id)

  const [activeTab, setActiveTab] = useState<Tab>('main')
  const [headline, setHeadline] = useState('')
  const [goalLetter, setGoalLetter] = useState('')
  const [externalLink, setExternalLink] = useState('')
  const [externalLink2, setExternalLink2] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [readyToSubmit, setReadyToSubmit] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Guard: initialize form fields only once so background refetches don't overwrite user edits
  const prefilled = useRef(false)
  const [hasPendingSave, setHasPendingSave] = useState(false)

  // Initialize form fields from server data — runs only on first load, not on every refetch
  useEffect(() => {
    if (application && !prefilled.current) {
      prefilled.current = true
      setHeadline(application.title || '')
      setGoalLetter(application.goalLetter || '')
      setExternalLink(application.externalLink || '')
      setExternalLink2(application.externalLink2 || '')
      setReferralCode(application.referralCodeUsed || '')
      setAttachmentUrl(application.attachmentUrl || '')
    }
  }, [application])

  // Clean up the autosave timer on unmount to avoid mutations on unmounted components
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [])

  // Warn the user if they try to leave while an autosave is queued
  useEffect(() => {
    if (!hasPendingSave) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasPendingSave])

  const updateMutation = useTrackedMutation('application.update', {
    mutationFn: (_: { silent: boolean }) =>
      apiJson(`/applications/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: headline,
          goalLetter,
          externalLink: externalLink || undefined,
          externalLink2: externalLink2 || undefined,
          referralCodeUsed: referralCode || undefined,
          attachmentUrl: attachmentUrl || undefined,
        }),
      }),
    onSuccess: (_, { silent }) => {
      setHasPendingSave(false)
      queryClient.invalidateQueries({ queryKey: qk.myApplicationsFull(user?.id ?? '') })
      if (!silent) toast.success('Brouillon sauvegardé !')
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Échec de la sauvegarde')),
  })

  const submitMutation = useTrackedMutation('application.submit', {
    mutationFn: () =>
      apiJson(`/applications/${id}/submit`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.myApplicationsFull(user?.id ?? '') })
      toast.success('Candidature envoyée !')
      router.push('/applications')
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Échec de la soumission')),
  })

  const isDraft = application?.stage === 'DRAFT'

  const triggerAutosave = () => {
    if (!isDraft) return
    setHasPendingSave(true)
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      updateMutation.mutate({ silent: true })
    }, 3000)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDraft) return
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current)
      autosaveTimer.current = null
    }
    updateMutation.mutate({ silent: false })
  }

  // Flush pending autosave then navigate — prevents data loss on sidebar/back clicks
  const handleNavigate = async (path: string) => {
    if (hasPendingSave && isDraft) {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current)
        autosaveTimer.current = null
      }
      try {
        await updateMutation.mutateAsync({ silent: true })
      } catch {
        // Save failed — navigate anyway, beforeunload already warned the user
      }
    }
    router.push(path)
  }

  const handleSubmit = async () => {
    if (!isDraft) return
    if (updateMutation.isPending) {
      toast.info('Sauvegarde en cours, veuillez patienter…')
      return
    }
    // Flush unsaved keystrokes before showing the confirm modal
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current)
      autosaveTimer.current = null
    }
    if (hasPendingSave) {
      try {
        await updateMutation.mutateAsync({ silent: true })
      } catch {
        toast.error('Impossible de sauvegarder avant soumission')
        return
      }
    }
    setConfirmSubmit(true)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('Fichier trop volumineux (max 10 Mo)')
      return
    }

    setUploading(true)
    try {
      const url = await uploadImage(file, 'applications', user?.id ?? 'unknown', 'attachments')
      setAttachmentUrl(url)
      await apiJson(`/applications/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: headline,
          goalLetter,
          externalLink: externalLink || undefined,
          externalLink2: externalLink2 || undefined,
          referralCodeUsed: referralCode || undefined,
          attachmentUrl: url,
        }),
      })
      queryClient.invalidateQueries({ queryKey: qk.myApplicationsFull(user?.id ?? '') })
      toast.success('Fichier uploadé et sauvegardé !')
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Erreur lors de l'upload"))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = async () => {
    setAttachmentUrl('')
    await apiJson(`/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: headline,
        goalLetter,
        externalLink: externalLink || undefined,
        externalLink2: externalLink2 || undefined,
        referralCodeUsed: referralCode || undefined,
        attachmentUrl: undefined,
      }),
    }).catch(() => null)
    queryClient.invalidateQueries({ queryKey: qk.myApplicationsFull(user?.id ?? '') })
    toast.success('Pièce jointe supprimée')
  }

  const fileName = attachmentUrl
    ? attachmentUrl.split('/').pop()?.split('?')[0] ?? 'Fichier joint'
    : ''

  const isSafeUrl = (url: string) => {
    try { return ['http:', 'https:'].includes(new URL(url).protocol) } catch { return false }
  }

  return (
    <AuthGuard skeleton={<AppDetailSkeleton />}>
      {isLoading ? (
        <AppDetailSkeleton />
      ) : isError ? (
        <div className="container mx-auto px-6 py-12 max-w-4xl">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(error as Error)?.message || 'Impossible de charger cette candidature.'}
          </div>
        </div>
      ) : !application ? (
        <div className="container mx-auto px-6 py-12 max-w-4xl text-center">
          <h1 className="text-xl font-bold mb-2">Candidature introuvable</h1>
          <button
            onClick={() => router.push('/applications')}
            className="text-[#3b49df] text-sm font-semibold hover:underline"
          >
            Retour à mes candidatures
          </button>
        </div>
      ) : (
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          {/* Breadcrumb */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <button
                type="button"
                onClick={() => handleNavigate('/dashboard')}
                className="hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Dashboard
              </button>
              <span className="text-gray-300">/</span>
              <button
                type="button"
                onClick={() => handleNavigate('/applications')}
                className="hover:text-gray-700 transition-colors"
              >
                Mes candidatures
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${stageColor(application.stage)}`}>
                {stageLabel(application.stage)}
              </span>
              {application.opportunity && (
                <Link
                  href={`/opportunities/${application.opportunity.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3b49df] text-[#3b49df] text-xs font-semibold hover:bg-[#3b49df]/5 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Voir l&apos;offre
                </Link>
              )}
            </div>
          </div>

          {/* Opportunity summary */}
          <div className="mb-4 rounded-2xl border border-gray-100 bg-white px-6 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Vous postulez à
            </p>
            {application.opportunity ? (
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  {application.opportunity.name || 'Opportunité sans titre'}
                </h2>
                {application.opportunity.punchline && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {application.opportunity.punchline}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Cette opportunité n&apos;est plus disponible.</p>
            )}
            {application.submissionDate && (
              <p className="text-xs text-gray-400 mt-2">
                Soumise le {new Date(application.submissionDate).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-100 px-6 pt-6 flex gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('main')}
                className={`flex items-center gap-2 pb-4 border-b-2 text-sm font-semibold transition-colors ${
                  activeTab === 'main'
                    ? 'border-[#3b49df] text-[#3b49df]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                Informations
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('attachments')}
                className={`flex items-center gap-2 pb-4 border-b-2 text-sm font-semibold transition-colors ${
                  activeTab === 'attachments'
                    ? 'border-[#3b49df] text-[#3b49df]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Paperclip className="w-4 h-4" />
                Pièce jointe
                {attachmentUrl && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-[#3b49df] inline-block" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('referrals')}
                className={`flex items-center gap-2 pb-4 border-b-2 text-sm font-semibold transition-colors ${
                  activeTab === 'referrals'
                    ? 'border-[#3b49df] text-[#3b49df]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Gift className="w-4 h-4" />
                Parrainage
                {referralCode && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-green-500 inline-block" />
                )}
              </button>
            </div>

            {/* Tab: Main Info */}
            {activeTab === 'main' && (
              <form onSubmit={handleSave} className="px-6 pb-6 pt-5 space-y-5">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-0.5">Informations principales</h2>
                  <p className="text-xs text-gray-500">Les informations essentielles pour vous présenter.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Titre court
                    </label>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => { setHeadline(e.target.value); triggerAutosave() }}
                      disabled={!isDraft}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df] disabled:bg-gray-50 disabled:text-gray-500"
                      maxLength={180}
                      placeholder="ex. Product Manager avec 5 ans d'expérience en fintech"
                    />
                    <div className="mt-1 text-[10px] text-gray-400 text-right flex justify-between">
                      <span className="text-gray-400 italic">{isDraft && updateMutation.isPending ? 'Sauvegarde…' : isDraft ? 'Auto-sauvegardé' : ''}</span>
                      <span>{headline.length}/180</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Pourquoi vous ? <span className="text-gray-400 font-normal">(lettre de motivation)</span>
                    </label>
                    <textarea
                      value={goalLetter}
                      onChange={(e) => { setGoalLetter(e.target.value); triggerAutosave() }}
                      disabled={!isDraft}
                      rows={7}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df] disabled:bg-gray-50 disabled:text-gray-500 resize-none"
                      placeholder="Expliquez pourquoi vous êtes le meilleur candidat…"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Portfolio / Lien 1
                    </label>
                    <input
                      type="url"
                      value={externalLink}
                      onChange={(e) => { setExternalLink(e.target.value); triggerAutosave() }}
                      disabled={!isDraft}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df] disabled:bg-gray-50 disabled:text-gray-500"
                      maxLength={500}
                      placeholder="https://github.com/vous, LinkedIn, portfolio…"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Portfolio / Lien 2
                    </label>
                    <input
                      type="url"
                      value={externalLink2}
                      onChange={(e) => { setExternalLink2(e.target.value); triggerAutosave() }}
                      disabled={!isDraft}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df] disabled:bg-gray-50 disabled:text-gray-500"
                      maxLength={500}
                      placeholder="https://portfolio.com, Notion, Behance…"
                    />
                  </div>
                </div>

                {isDraft && (
                  <div className="pt-4 border-t border-gray-100 space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={readyToSubmit}
                        onChange={(e) => setReadyToSubmit(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-[#3b49df] focus:ring-[#3b49df]"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-[#3b49df] transition-colors">
                          Je suis prêt à soumettre cette candidature
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Une fois soumise, vous ne pourrez plus la modifier.
                        </p>
                      </div>
                    </label>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="submit"
                        disabled={updateMutation.isPending || submitMutation.isPending}
                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {updateMutation.isPending ? 'Sauvegarde…' : 'Sauvegarder le brouillon'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!readyToSubmit || submitMutation.isPending || updateMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#3b49df] text-white hover:bg-[#2d3aba] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                        {submitMutation.isPending ? 'Envoi…' : 'Soumettre la candidature'}
                      </button>
                    </div>
                  </div>
                )}

                <ConfirmModal
                  open={confirmSubmit}
                  title="Soumettre cette candidature ?"
                  description="Une fois soumise, vous ne pourrez plus la modifier. Vérifiez que tout est correct."
                  confirmLabel="Oui, soumettre"
                  cancelLabel="Relire encore"
                  variant="default"
                  onConfirm={() => {
                    setConfirmSubmit(false)
                    submitMutation.mutate()
                  }}
                  onCancel={() => setConfirmSubmit(false)}
                />

                {!isDraft && (
                  <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500">
                    <p>
                      Cette candidature n&apos;est plus modifiable — elle a déjà été soumise ou examinée.
                    </p>
                    {(application.feedbackTitle || application.reviewFeedback) && (
                      <div className="mt-2 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-left">
                        {application.feedbackTitle && (
                          <div className="font-semibold text-gray-800 mb-1 text-sm">
                            {application.feedbackTitle}
                          </div>
                        )}
                        {application.reviewFeedback && (
                          <div className="text-gray-600 whitespace-pre-wrap">
                            {application.reviewFeedback}
                          </div>
                        )}
                      </div>
                    )}

                    {(externalLink || externalLink2) && (
                      <div className="mt-3 space-y-1">
                        {externalLink && isSafeUrl(externalLink) && (
                          <a
                            href={externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[#3b49df] hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {externalLink}
                          </a>
                        )}
                        {externalLink2 && isSafeUrl(externalLink2) && (
                          <a
                            href={externalLink2}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[#3b49df] hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {externalLink2}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </form>
            )}

            {/* Tab: Attachments */}
            {activeTab === 'attachments' && (
              <div className="px-6 pb-6 pt-5 space-y-5">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-0.5">Pièce jointe</h2>
                  <p className="text-xs text-gray-500">
                    Joignez un CV, portfolio ou tout document pertinent (max 10 Mo).
                  </p>
                </div>

                {attachmentUrl ? (
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Paperclip className="w-4 h-4 text-[#3b49df] shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{fileName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <a
                        href={attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {isDraft && (
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Supprimer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : isDraft ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center hover:border-[#3b49df] hover:bg-[#3b49df]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-6 h-6 text-gray-400" />
                      <div>
                        <p className="text-sm font-semibold text-gray-700">
                          {uploading ? 'Upload en cours…' : 'Cliquez pour ajouter un fichier'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF, Word, images — max 10 Mo</p>
                      </div>
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Aucune pièce jointe fournie.</p>
                )}
              </div>
            )}

            {/* Tab: Referrals */}
            {activeTab === 'referrals' && (
              <div className="px-6 pb-6 pt-5 space-y-5">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-0.5">Code de parrainage</h2>
                  <p className="text-xs text-gray-500">
                    Si quelqu&apos;un vous a recommandé cette opportunité, entrez son code de parrainage.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Code de parrainage <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => {
                        setReferralCode(e.target.value.toUpperCase())
                        triggerAutosave()
                      }}
                      disabled={!isDraft}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-[#3b49df] focus:border-[#3b49df] disabled:bg-gray-50 disabled:text-gray-500 uppercase"
                      maxLength={20}
                      placeholder="ex. A3F9C2B1D4"
                    />
                    {isDraft && (
                      <button
                        type="button"
                        onClick={() => updateMutation.mutate({ silent: false })}
                        disabled={updateMutation.isPending}
                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {updateMutation.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
                      </button>
                    )}
                  </div>
                  {referralCode && !isDraft && (
                    <p className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                      Code {referralCode} appliqué à cette candidature
                    </p>
                  )}
                  {!referralCode && !isDraft && (
                    <p className="mt-2 text-xs text-gray-400 italic">Aucun code de parrainage renseigné.</p>
                  )}
                </div>

                <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
                  <p className="font-semibold mb-1">Comment ça fonctionne ?</p>
                  <p>
                    En utilisant le code d&apos;un parrain, vous reconnaissez sa contribution. Le parrain reçoit
                    un crédit si votre candidature est acceptée.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AuthGuard>
  )
}
