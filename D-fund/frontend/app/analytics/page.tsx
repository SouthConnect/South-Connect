'use client'

import Link from 'next/link'

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Business analytics</h1>
        <p className="text-sm text-gray-500">
          High‑level analytics for D-fund activity will be available after the first V1 release.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-sm text-gray-500">
        <p className="mb-3">
          For now, the focus is on having a stable core experience for opportunities, applications, profiles and messaging.
        </p>
        <p className="mb-3">
          Once that is live in production, this page will surface metrics such as active users, opportunities created,
          applications per opportunity and conversion funnels.
        </p>
        <p>
          You can already see your own activity from the{' '}
          <Link href="/dashboard" className="text-[#3b49df] font-semibold hover:underline">
            dashboard
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

