'use client'

import { useAuth } from '@/app/lib/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { Clock, CheckCircle, FileText, Inbox, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: applications, isLoading } = useQuery({
    queryKey: ['my-applications', user?.id],
    queryFn: () => apiJson(`/applications/user/${user?.id}`),
    enabled: !!user?.id,
  })

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome{user ? `, ${user.name}` : ''} 
        </h1>
        <p className="text-sm text-gray-500">
          Track your applications, offers and tasks in one place.
        </p>
      </div>

      {/* Important Tasks cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <DashboardCard
          title="Import Opportunities"
          description="Easily import opportunities from other platforms."
          cta="Import"
        />
        <DashboardCard
          title="Create Opportunities"
          description="Create offers to start engaging with potential partners."
          cta="Create Now"
          href="/opportunities/new"
        />
        <DashboardCard
          title="Start Engaging"
          description="Connect with the D-fund team and your matches."
          cta="Meet"
        />
      </section>

      {/* Applications section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Applications</h2>
            <span className="text-xs text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">
              {applications?.length ?? 0} total
            </span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1 text-xs font-medium text-[#3b49df] hover:text-[#2d3aba]"
          >
            Explore opportunities
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex gap-4 border-b border-gray-200 mb-4 text-sm">
          <span className="pb-3 border-b-2 border-[#3b49df] text-[#3b49df] font-semibold flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Draft
          </span>
          <span className="pb-3 text-gray-400 flex items-center gap-1">
            <Inbox className="w-4 h-4" />
            Pending
          </span>
          <span className="pb-3 text-gray-400 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Success / Archived
          </span>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))
          ) : applications?.length ? (
            applications.map((app: any) => (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-400 uppercase mb-1">
                    {app.stage}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {app.opportunity?.name || 'Untitled opportunity'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {app.title || 'No title'} •{' '}
                    {app.submissionDate
                      ? new Date(app.submissionDate).toLocaleDateString('fr-FR')
                      : 'Draft'}
                  </span>
                </div>
                <Link
                  href={`/applications/${app.id}`}
                  className="text-xs font-semibold text-[#3b49df] hover:text-[#2d3aba]"
                >
                  Edit
                </Link>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 text-sm py-8 bg-white rounded-xl border border-dashed border-gray-200">
              No applications yet. Start by applying to an opportunity.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function DashboardCard({
  title,
  description,
  cta,
  href,
}: {
  title: string
  description: string
  cta: string
  href?: string
}) {
  const content = (
    <div className="h-full flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-sm transition-shadow">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="mt-4">
        <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-semibold bg-[#3b49df] text-white hover:bg-[#2d3aba]">
          {cta}
        </span>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href}>
        {content}
      </Link>
    )
  }

  return content
}

