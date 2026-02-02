'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { useAuth } from '@/app/lib/AuthContext'
import { Clock, CheckCircle, Archive, Filter, Search } from 'lucide-react'
import Link from 'next/link'

type StageFilter = 'ALL' | 'DRAFT' | 'SUBMITTED' | 'OWNER_REVIEW' | 'SUCCESS' | 'ARCHIVED'

export default function ApplicationsPage() {
  const { user } = useAuth()
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL')
  const [search, setSearch] = useState('')

  const { data: applications, isLoading } = useQuery({
    queryKey: ['my-applications-full', user?.id],
    queryFn: () => apiJson(`/applications/user/${user?.id}`),
    enabled: !!user?.id,
  })

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-sm">
          Please sign in to view your applications.
        </p>
      </div>
    )
  }

  const filtered =
    applications
      ?.filter((app: any) => {
        if (stageFilter !== 'ALL' && app.stage !== stageFilter) return false
        if (!search) return true
        const haystack = `${app.title || ''} ${app.opportunity?.name || ''}`.toLowerCase()
        return haystack.includes(search.toLowerCase())
      }) || []

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
          <p className="text-sm text-gray-500">
            Draft, submit and track your applications to D-fund opportunities.
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-4 border-b border-gray-200 text-sm">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'DRAFT', label: 'Draft', icon: Clock },
            { id: 'SUBMITTED', label: 'Submitted' },
            { id: 'OWNER_REVIEW', label: 'In review' },
            { id: 'SUCCESS', label: 'Success', icon: CheckCircle },
            { id: 'ARCHIVED', label: 'Archived', icon: Archive },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setStageFilter(id as StageFilter)}
              className={`pb-3 px-1 border-b-2 font-semibold flex items-center gap-1 ${
                stageFilter === id
                  ? 'border-[#3b49df] text-[#3b49df]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search applications"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg border-none text-sm focus:ring-2 focus:ring-[#3b49df]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="hidden md:inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-50 animate-pulse" />
          ))
        ) : filtered.length ? (
          filtered.map((app: any) => <ApplicationRow key={app.id} app={app} />)
        ) : (
          <div className="py-8 text-center text-gray-500 text-sm">
            No applications match your filters.
          </div>
        )}
      </div>
    </div>
  )
}

function ApplicationRow({ app }: { app: any }) {
  const statusColor: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    SUBMITTED: 'bg-blue-50 text-blue-700',
    OWNER_REVIEW: 'bg-purple-50 text-purple-700',
    SUCCESS: 'bg-green-50 text-green-700',
    ARCHIVED: 'bg-gray-50 text-gray-500',
  }

  const chipClass = statusColor[app.stage] || 'bg-gray-100 text-gray-600'

  return (
    <Link
      href={`/applications/${app.id}`}
      className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${chipClass}`}>
            {app.stage}
          </span>
          <span className="text-xs text-gray-400">
            {app.submissionDate
              ? new Date(app.submissionDate).toLocaleDateString('fr-FR')
              : 'Draft'}
          </span>
        </div>
        <div className="text-sm font-semibold text-gray-900">
          {app.opportunity?.name || 'Untitled opportunity'}
        </div>
        <div className="text-xs text-gray-500">
          {app.title || 'No headline yet'}
        </div>
      </div>
    </Link>
  )
}

