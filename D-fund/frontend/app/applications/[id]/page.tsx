'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { ArrowLeft, FileText, Paperclip, Gift, Send } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const id = params?.id as string

  const { data: applications, isLoading } = useQuery({
    queryKey: ['my-applications-full', user?.id],
    queryFn: () => apiJson(`/applications/user/${user?.id}`),
    enabled: !!user?.id,
  })

  const application = applications?.find((a: any) => a.id === id)

  const [headline, setHeadline] = useState('')
  const [goalLetter, setGoalLetter] = useState('')
  const [readyToSubmit, setReadyToSubmit] = useState(false)

  useEffect(() => {
    if (application) {
      setHeadline(application.title || '')
      setGoalLetter(application.goalLetter || '')
    }
  }, [application])

  const updateMutation = useMutation({
    mutationFn: () =>
      apiJson(`/applications/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: headline,
          goalLetter,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications-full', user?.id] })
      alert('Application saved as draft.')
    },
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      apiJson(`/applications/${id}/submit`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-applications-full', user?.id] })
      alert('Application submitted!')
      router.push('/applications')
    },
  })

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-sm">
          Please sign in to view this application.
        </p>
      </div>
    )
  }

  if (isLoading || !applications) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDraft || !readyToSubmit) return
    submitMutation.mutate()
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold">
            {application.stage}
          </span>
          {application.submissionDate && (
            <span className="text-gray-400">
              Submitted{' '}
              {new Date(application.submissionDate).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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

        <form onSubmit={handleSave} className="px-6 pb-6 pt-4 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Main Info</h2>
            <p className="text-xs text-gray-500 mb-4">
              Basic details to introduce yourself to the opportunity owner.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Short headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                disabled={!isDraft}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df] disabled:bg-gray-50"
                maxLength={180}
                placeholder="e.g. Product Manager with 5+ years in fintech"
              />
              <div className="mt-1 text-[10px] text-gray-400 text-right">
                {headline.length}/180
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Why you?
              </label>
              <textarea
                value={goalLetter}
                onChange={(e) => setGoalLetter(e.target.value)}
                disabled={!isDraft}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#3b49df] focus:border-[#3b49df] disabled:bg-gray-50"
                placeholder="Explain why you are a great fit for this opportunity..."
              />
            </div>
          </div>

          {isDraft && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={readyToSubmit}
                    onChange={(e) => setReadyToSubmit(e.target.checked)}
                    className="rounded border-gray-300 text-[#3b49df] focus:ring-[#3b49df]"
                  />
                  Ready to submit
                </label>
                <span className="text-[10px] text-gray-400">
                  You can only submit once you feel confident.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!readyToSubmit || submitMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#3b49df] text-white hover:bg-[#2d3aba] disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitMutation.isPending ? 'Submitting...' : 'Submit application'}
                </button>
              </div>
            </div>
          )}

          {!isDraft && (
            <div className="pt-4 border-t border-gray-100 text-xs text-gray-500">
              This application is no longer editable because it has already been submitted or
              reviewed.
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

