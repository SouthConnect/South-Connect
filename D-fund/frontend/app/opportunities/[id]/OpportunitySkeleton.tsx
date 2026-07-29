import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/Skeleton'

/**
 * Mirrors the real layout of this page (cover, title card, meta row,
 * description, tags, sidebar action card) so nothing reflows once the
 * opportunity data lands. Shared between the client loading state and
 * loading.tsx — keeping them as one component is what keeps them in sync.
 */
export function OpportunitySkeleton() {
  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="relative h-64 md:h-80 w-full overflow-hidden bg-gray-200">
        <div className="absolute top-8 left-8">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-bold text-gray-900 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <Skeleton className="h-3 w-28 mb-4" />
              <Skeleton className="h-9 w-[85%] mb-3" />
              <Skeleton className="h-9 w-[55%] mb-6" />

              <div className="flex flex-wrap gap-6 mb-8 border-y border-gray-100 py-6">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>

              <Skeleton className="h-6 w-36 mb-4" />
              <div className="space-y-3 mb-8">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-[92%]" />
                <Skeleton className="h-3.5 w-[70%]" />
              </div>

              <Skeleton className="h-3 w-16 mb-4" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-16 rounded-full" />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3 sticky top-8">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
