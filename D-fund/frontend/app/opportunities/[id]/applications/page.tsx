'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Clock,
  CheckCircle,
  Archive,
} from 'lucide-react'

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

  const {
    data: opportunity,
    isLoading: isLoadingOpportunity,
  } = useQuery({
    queryKey: ['opportunity', opportunityId],
    queryFn: () => apiJson(`/opportunities/${opportunityId}`),
    enabled: !!opportunityId,
  })

  const {
    data: applications,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['owner-applications', opportunityId],
    queryFn: () => apiJson(`/applications/opportunity/${opportunityId}`),
    enabled: !!opportunityId && !!user?.id,
  })

  const selectedApplication = applications?.find((a: any) => a.id === selectedAppId)

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

  const reviewMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['owner-applications', opportunityId] })
      alert('Review saved successfully.')
    },
  })

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-sm">Please sign in to view applications.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Applications received</h1>
        {opportunity && (
          <p className="text-sm text-gray-500">
            Opportunity:{' '}
            <span className="font-semibold text-gray-900">{opportunity.name}</span>
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(error as Error).message || 'Unable to load applications for this opportunity.'}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des candidatures */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading || isLoadingOpportunity ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-50 animate-pulse" />
              ))}
            </div>
          ) : !applications || applications.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No applications received for this opportunity yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {applications.map((app: any) => {
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
                            <span>{app.candidate?.name || 'Unknown candidate'}</span>
                            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {app.stage}
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
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">
                  Review application
                </h2>
                <p className="text-xs text-gray-500">
                  Provide a clear status and an optional feedback for the candidate.
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
                    Decision
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
                        In review
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
                        Accepted
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
                        Archived / Not selected
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Feedback title (optional)
                  </label>
                  <input
                    type="text"
                    value={feedbackTitle}
                    onChange={(e) => setFeedbackTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-[#3b49df] focus:border-[#3b49df]"
                    maxLength={120}
                    placeholder="Short summary of your decision"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Feedback message (optional)
                  </label>
                  <textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-[#3b49df] focus:border-[#3b49df]"
                    placeholder="Share constructive feedback to help the candidate understand your decision."
                  />
                </div>

                <button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg bg-[#3b49df] text-white hover:bg-[#2d3aba] disabled:opacity-50"
                >
                  <UserIcon className="w-3 h-3" />
                  {reviewMutation.isPending ? 'Saving review...' : 'Save review'}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-xs text-gray-500">
              <p className="mb-1 font-semibold text-gray-700">Select an application</p>
              <p>Click on a candidate in the list to review their application.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

