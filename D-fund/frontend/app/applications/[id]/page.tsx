'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { ArrowLeft, FileText, Paperclip, Gift, Send, ExternalLink } from 'lucide-react'
import { stageLabel, stageColor } from '@/app/lib/stage-labels'
import { useState, useEffect } from 'react'
import Link from 'next/link'

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
  } = useQuery({
    queryKey: ['my-applications-full', user?.id],
    queryFn: () => apiJson(`/applications/user/${user?.id}`),
    enabled: !!user?.id,
  })

  const application = applications?.find((a: any) => a.id === id)

  const [headline, setHeadline] = useState('')
  const [goalLetter, setGoalLetter] = useState('')
  const [externalLink, setExternalLink] = useState('')
  const [externalLink2, setExternalLink2] = useState('')
  const [readyToSubmit, setReadyToSubmit] = useState(false)

  useEffect(() => {
    if (application) {
      setHeadline(application.title || '')
      setGoalLetter(application.goalLetter || '')
      setExternalLink(application.externalLink || '')
      setExternalLink2(application.externalLink2 || '')
    }
  }, [application])

  const updateMutation = useMutation({
    mutationFn: () =>
      apiJson(`/applications/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: headline,
          goalLetter,
          externalLink: externalLink || undefined,
          externalLink2: externalLink2 || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications-full', user?.id] })
    },
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      apiJson(`/applications/${id}/submit`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications-full', user?.id] })
      router.push('/applications')
    },
  })

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-sm">Please sign in to view this application.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(error as Error)?.message || 'Unable to load this application.'}
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-4xl text-center">
        <h1 className="text-xl font-bold mb-2">Application not found</h1>
        <button
          onClick={() => router.push('/applications')}
          className="text-[#3b49df] text-sm font-semibold hover:underline"
        >
          Back to My Applications
        </button>
      </div>
    )
  }

  const isDraft = application.stage === 'DRAFT'

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDraft) return
    updateMutation.mutate()
  }

  const handleSubmit = () => {
    if (!isDraft || !readyToSubmit) return
    submitMutation.mutate()
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            Dashboard
          </button>
          <span className="text-gray-300">/</span>
          <Link
            href="/applications"
            className="hover:text-gray-700 transition-colors"
          >
            My Applications
          </Link>
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
              See offer
            </Link>
          )}
        </div>
      </div>

      {/* Opportunity summary */}
      <div className="mb-4 rounded-2xl border border-gray-100 bg-white px-6 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
          You are applying to
        </p>
        {application.opportunity ? (
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {application.opportunity.name || 'Untitled opportunity'}
            </h2>
            {application.opportunity.punchline && (
              <p className="text-xs text-gray-500 mt-0.5">
                {application.opportunity.punchline}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">This opportunity is no longer available.</p>
        )}
        {application.submissionDate && (
          <p className="text-xs text-gray-400 mt-2">
            Submitted {new Date(application.submissionDate).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-100 px-6 pt-6 flex gap-6">
          <button className="flex items-center gap-2 pb-4 border-b-2 border-[#3b49df] text-sm font-semibold text-[#3b49df]">
            <FileText className="w-4 h-4" />
            Main Info
          </button>
          <button className="flex items-center gap-2 pb-4 border-b-2 border-transparent text-sm font-semibold text-gray-300 cursor-default">
            <Paperclip className="w-4 h-4" />
            Attachments
          </button>
          <button className="flex items-center gap-2 pb-4 border-b-2 border-transparent text-sm font-semibold text-gray-300 cursor-default">
            <Gift className="w-4 h-4" />
            Referrals
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 pb-6 pt-5 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-0.5">Main Info</h2>
            <p className="text-xs text-gray-500">
              Basic details to introduce yourself.
            </p>
          </div>

          <div className="space-y-4">
            {/* Short headline */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Short headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                disabled={!isDraft}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df] disabled:bg-gray-50 disabled:text-gray-500"
                maxLength={180}
                placeholder="e.g. Product Manager with 5+ years in fintech"
              />
              <div className="mt-1 text-[10px] text-gray-400 text-right">
                {headline.length}/180
              </div>
            </div>

            {/* Why you? */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Why you?
              </label>
              <textarea
                value={goalLetter}
                onChange={(e) => setGoalLetter(e.target.value)}
                disabled={!isDraft}
                rows={6}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df] disabled:bg-gray-50 disabled:text-gray-500 resize-none"
                placeholder="Explain why you are a great fit for this opportunity..."
              />
            </div>

            {/* Portfolio / External Link */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Portfolio / External Link
              </label>
              <input
                type="text"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                disabled={!isDraft}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df] disabled:bg-gray-50 disabled:text-gray-500"
                maxLength={500}
                placeholder="Add links to your GitHub, portfolio, LinkedIn, etc."
              />
            </div>

            {/* External Link 2 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                External Link 2
              </label>
              <input
                type="text"
                value={externalLink2}
                onChange={(e) => setExternalLink2(e.target.value)}
                disabled={!isDraft}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df] disabled:bg-gray-50 disabled:text-gray-500"
                maxLength={500}
                placeholder="Add links to your GitHub, portfolio, LinkedIn, etc."
              />
            </div>
          </div>

          {isDraft && (
            <div className="pt-4 border-t border-gray-100 space-y-4">
              {/* Ready to Submit toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-0.5">
                    Settings
                  </p>
                  <p className="text-sm font-medium text-gray-900">Ready to Submit</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={readyToSubmit}
                  onClick={() => setReadyToSubmit(!readyToSubmit)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    readyToSubmit ? 'bg-[#3b49df]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      readyToSubmit ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save draft'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!readyToSubmit || submitMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#3b49df] text-white hover:bg-[#2d3aba] disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitMutation.isPending ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          )}

          {!isDraft && (
            <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500">
              <p>
                This application is no longer editable — it has already been submitted or reviewed.
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

              {/* Show external links if filled */}
              {(externalLink || externalLink2) && (
                <div className="mt-3 space-y-1">
                  {externalLink && (
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
                  {externalLink2 && (
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
      </div>
    </div>
  )
}
