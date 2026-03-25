'use client'

import { useState } from 'react'
import { Lightbulb, MessageSquarePlus, ArrowUpRight, CheckCircle2, Clock, Rocket } from 'lucide-react'

type Tab = 'features' | 'feedbacks'

const PLANNED_FEATURES = [
  {
    id: 1,
    title: 'Real-time notifications',
    description: 'Get instant alerts when someone applies to your opportunity or sends you a message.',
    status: 'planned',
    votes: 24,
  },
  {
    id: 2,
    title: 'Advanced search & filters',
    description: 'Filter opportunities by location, sector, funding stage and more.',
    status: 'in_progress',
    votes: 41,
  },
  {
    id: 3,
    title: 'Business analytics dashboard',
    description: 'Visualize your opportunities performance, application funnel and follower growth.',
    status: 'in_progress',
    votes: 38,
  },
  {
    id: 4,
    title: 'Mobile app (iOS & Android)',
    description: 'Access D-Fund on the go with a native mobile experience.',
    status: 'planned',
    votes: 67,
  },
  {
    id: 5,
    title: 'Payment & subscription system',
    description: 'Unlock premium features via Stripe-powered subscriptions.',
    status: 'planned',
    votes: 19,
  },
  {
    id: 6,
    title: 'AI-powered matching',
    description: 'Get intelligent opportunity recommendations based on your profile and activity.',
    status: 'planned',
    votes: 55,
  },
  {
    id: 7,
    title: 'Tasks & project management',
    description: 'Manage your project tasks directly inside D-Fund alongside your opportunities.',
    status: 'planned',
    votes: 12,
  },
  {
    id: 8,
    title: 'Password reset flow',
    description: 'Self-service password recovery via email.',
    status: 'in_progress',
    votes: 30,
  },
]

const STATUS_CONFIG = {
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-700',
    icon: Clock,
  },
  planned: {
    label: 'Planned',
    color: 'bg-gray-100 text-gray-600',
    icon: Rocket,
  },
  done: {
    label: 'Done',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
}

export default function FeaturesPage() {
  const [tab, setTab] = useState<Tab>('features')
  const [submitted, setSubmitted] = useState(false)
  const [voted, setVoted] = useState<Set<number>>(new Set())

  const handleVote = (id: number) => {
    setVoted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Help Us Build a Better D-Fund!
        </h1>
        <p className="text-sm text-[#3b49df] mt-1 max-w-2xl">
          Your voice matters! Share your feedback, report issues, and vote on new feature ideas
          to help us shape the future of D-Fund together.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 text-sm mb-8">
        <button
          onClick={() => setTab('features')}
          className={`pb-3 px-1 border-b-2 font-semibold flex items-center gap-1.5 ${
            tab === 'features'
              ? 'border-[#3b49df] text-[#3b49df]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          New Features
        </button>
        <button
          onClick={() => setTab('feedbacks')}
          className={`pb-3 px-1 border-b-2 font-semibold flex items-center gap-1.5 ${
            tab === 'feedbacks'
              ? 'border-[#3b49df] text-[#3b49df]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <MessageSquarePlus className="w-4 h-4" />
          Feedbacks
        </button>
      </div>

      {tab === 'features' && (
        <div className="space-y-3">
          {PLANNED_FEATURES.sort((a, b) => b.votes - a.votes).map((feature) => {
            const cfg = STATUS_CONFIG[feature.status as keyof typeof STATUS_CONFIG]
            const StatusIcon = cfg.icon
            const hasVoted = voted.has(feature.id)

            return (
              <div
                key={feature.id}
                className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                <button
                  onClick={() => handleVote(feature.id)}
                  className={`flex flex-col items-center gap-0.5 flex-shrink-0 px-3 py-2 rounded-xl border transition-colors ${
                    hasVoted
                      ? 'border-[#3b49df] bg-[#3b49df]/5 text-[#3b49df]'
                      : 'border-gray-200 text-gray-500 hover:border-[#3b49df]/40 hover:text-[#3b49df]'
                  }`}
                >
                  <ArrowUpRight className={`w-3.5 h-3.5 ${hasVoted ? 'rotate-0' : ''}`} />
                  <span className="text-[11px] font-semibold">
                    {feature.votes + (hasVoted ? 1 : 0)}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'feedbacks' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          {submitted ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h2 className="text-sm font-semibold text-gray-900 mb-1">
                Thank you for your feedback!
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Your input helps us improve D-Fund for everyone.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs text-[#3b49df] font-semibold hover:underline"
              >
                Submit another feedback
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">
                  Share Your Feedbacks
                </h2>
                <p className="text-xs text-gray-500">
                  Share your thoughts, report a bug, or suggest an improvement for the app's overall experience.
                </p>
              </div>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  setSubmitted(true)
                  e.currentTarget.reset()
                }}
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Title
                  </label>
                  <input
                    name="title"
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df] outline-none transition-all"
                    placeholder="Tell us what you think"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    name="description"
                    required
                    rows={5}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df] outline-none transition-all resize-none"
                    placeholder="Share your thoughts, report a bug, or suggest an improvement for the app's overall experience.&#10;&#10;Thanks 🙏"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#3b49df] text-white text-sm font-semibold hover:bg-[#2d3aba] transition-colors"
                  >
                    Soumettre
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}
