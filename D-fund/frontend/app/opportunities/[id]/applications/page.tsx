'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/app/lib/queryKeys'
import { apiJson, getErrorMessage } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { stageLabel, stageColor } from '@/app/lib/stage-labels'
import Link from 'next/link'
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Clock,
  CheckCircle,
  Archive,
  ExternalLink,
} from 'lucide-react'
import AuthGuard from '@/components/AuthGuard'
import { Skeleton } from '@/components/Skeleton'
import { toast } from 'sonner'
import type { Application } from '@/app/lib/types'
import { useTrackedMutation } from '@/app/hooks/useTrackedMutation'

type ReviewStage = 'OWNER_REVIEW' | 'SUCCESS' | 'ARCHIVED'

export default function OpportunityApplicationsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const opportunityId = params?.id as string

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [feedbackTitle, setFeedbackTitle] = useState('')
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [stage, setStage] = useState<ReviewStage>('OWNER_REVIEW')
  const [reviewSaved, setReviewSaved] = useState(false)

  const {
    data: opportunity,
    isLoading: isLoadingOpportunity,
  } = useQuery({
    queryKey: qk.opportunity(opportunityId),
    queryFn: () => apiJson(`/opportunities/${opportunityId}`),
    enabled: !!opportunityId,
  })

  const {
    data: applications,
    isLoading,
    error,
  } = useQuery({
    queryKey: qk.ownerApplications(opportunityId),
    queryFn: () => apiJson(`/applications/opportunity/${opportunityId}`),
    enabled: !!opportunityId && !!user?.id,
  })

  const selectedApplication = (applications as Application[] | undefined)?.find((a) => a.id === selectedAppId)

  useEffect(() => {
    if (selectedApplication) {
      setFeedbackTitle(selectedApplication.feedbackTitle || '')
      setReviewFeedback(selectedApplication.reviewFeedback || '')
      if (
        selectedApplication.stage === 'OWNER_REVIEW' ||
        selectedApplication.stage === 'SUCCESS' ||
        selectedApplication.stage === 'ARCHIVED'
      ) {
        setStage(selectedApplication.stage)
      } else {
        setStage('OWNER_REVIEW')
      }
    }
  }, [selectedApplication])

  const reviewMutation = useTrackedMutation('application.review', {
    mutationFn: () =>
      apiJson(`/applications/${selectedAppId}/review`, {
        method: 'PUT',
        body: JSON.stringify({
          stage,
          feedbackTitle: feedbackTitle.trim() || undefined,
          reviewFeedback: reviewFeedback.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.ownerApplications(opportunityId) })
      setReviewSaved(true)
      setTimeout(() => setReviewSaved(false), 3000)
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, 'Impossible d\'enregistrer la revue.')),
  })

  return (
    <AuthGuard>
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 inline mr-1" />
          Dashboard
        </button>
        <span className="text-gray-300">/</span>
        <Link href={`/opportunities/${opportunityId}`} className="hover:text-gray-700 transition-colors">
          {opportunity?.name || 'Opportunity'}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Applications</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Candidatures reçues</h1>
        {applications && (
          <p className="text-sm text-gray-500">
            {applications.length} candidat{applications.length !== 1 ? 's' : ''} {applications.length !== 1 ? 'ont' : 'a'} postulé
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(error as Error).message || 'Impossible de charger les candidatures pour cette opportunité.'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des candidatures */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading || isLoadingOpportunity ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-none" />
              ))}
            </div>
          ) : !applications || applications.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Aucune candidature reçue pour cette opportunité.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {(applications as Application[]).map((app) => {
                const createdAt = new Date(app.createdAt).toLocaleDateString('fr-FR')
                const isSelected = app.id === selectedAppId
                return (
                  <li
                    key={app.id}
                    className={`cursor-pointer px-5 py-4 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => setSelectedAppId(app.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-[#3b49df]">
                          {app.candidate?.name?.[0] || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <span>{app.candidate?.name || 'Candidat inconnu'}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${stageColor(app.stage)}`}>
                              {stageLabel(app.stage)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            <span>{app.candidate?.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{createdAt}</span>
                        </div>
                        {app.title && (
                          <span className="max-w-xs truncate text-gray-600">
                            {app.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Bloc de review */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {selectedApplication ? (
            <>
              {/* Candidate summary */}
              <div className="mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-[#3b49df]">
                    {selectedApplication.candidate?.name?.[0] || '?'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {selectedApplication.candidate?.name || 'Inconnu'}
                    </div>
                    <div className="text-xs text-gray-500">{selectedApplication.candidate?.email}</div>
                  </div>
                </div>
                {selectedApplication.title && (
                  <p className="text-xs text-gray-700 font-medium mb-1">{selectedApplication.title}</p>
                )}
                {selectedApplication.goalLetter && (
                  <p className="text-xs text-gray-500 line-clamp-4 whitespace-pre-wrap">
                    {selectedApplication.goalLetter}
                  </p>
                )}
                {(selectedApplication.externalLink || selectedApplication.externalLink2) && (
                  <div className="mt-2 space-y-1">
                    {selectedApplication.externalLink && (
                      <a
                        href={selectedApplication.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] text-[#3b49df] hover:underline truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        {selectedApplication.externalLink}
                      </a>
                    )}
                    {selectedApplication.externalLink2 && (
                      <a
                        href={selectedApplication.externalLink2}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] text-[#3b49df] hover:underline truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        {selectedApplication.externalLink2}
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">
                  Réviser la candidature
                </h2>
                <p className="text-xs text-gray-500">
                  Donnez un statut clair et un retour optionnel au candidat.
                </p>
              </div>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (reviewMutation.isPending || !selectedAppId) return
                  reviewMutation.mutate()
                }}
              >
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700">
                    Décision
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="stage"
                        value="OWNER_REVIEW"
                        checked={stage === 'OWNER_REVIEW'}
                        onChange={() => setStage('OWNER_REVIEW')}
                        className="text-[#3b49df] border-gray-300 focus:ring-[#3b49df]"
                      />
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        En révision
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="stage"
                        value="SUCCESS"
                        checked={stage === 'SUCCESS'}
                        onChange={() => setStage('SUCCESS')}
                        className="text-green-600 border-gray-300 focus:ring-green-600"
                      />
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Accepté
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="stage"
                        value="ARCHIVED"
                        checked={stage === 'ARCHIVED'}
                        onChange={() => setStage('ARCHIVED')}
                        className="text-gray-600 border-gray-300 focus:ring-gray-600"
                      />
                      <span className="flex items-center gap-1">
                        <Archive className="w-3 h-3 text-gray-400" />
                        Archivé / Non retenu
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Titre du retour (optionnel)
                  </label>
                  <input
                    type="text"
                    value={feedbackTitle}
                    onChange={(e) => setFeedbackTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-[#3b49df] focus:border-[#3b49df]"
                    maxLength={120}
                    placeholder="Résumé court de votre décision"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Message de retour (optionnel)
                  </label>
                  <textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-[#3b49df] focus:border-[#3b49df]"
                    placeholder="Partagez un retour constructif pour aider le candidat à comprendre votre décision."
                  />
                </div>

                {reviewSaved && (
                  <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-medium">
                    Revue enregistrée avec succès.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg bg-[#3b49df] text-white hover:bg-[#2d3aba] disabled:opacity-50"
                >
                  <UserIcon className="w-3 h-3" />
                  {reviewMutation.isPending ? 'Enregistrement…' : 'Enregistrer la revue'}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-xs text-gray-500">
              <p className="mb-1 font-semibold text-gray-700">Sélectionnez une candidature</p>
              <p>Cliquez sur un candidat dans la liste pour réviser sa candidature.</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </AuthGuard>
  )
}

