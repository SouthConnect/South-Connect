import { Skeleton } from '@/components/Skeleton'
import { OpportunityCardSkeleton } from '@/components/OpportunityCard'

export default function ExploreLoading() {
  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      <div className="bg-gradient-to-br from-[#1a237e] to-[#3b49df] py-14 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold text-white mb-3">Explorer SouthConnect</h1>
          <p className="text-white/70 mb-8 text-base">
            Découvrez des opportunités, talents, investisseurs et collaborateurs dans tout l&apos;écosystème.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap gap-2 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-xl" />
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-gray-200">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-lg" />
          ))}
        </div>

        <Skeleton className="h-5 w-40 mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <OpportunityCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
