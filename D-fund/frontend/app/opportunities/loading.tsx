import { Skeleton } from '@/components/Skeleton'

export default function OpportunitiesLoading() {
  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="bg-white border-b border-gray-100 py-6 mb-6">
        <div className="container mx-auto px-4 max-w-5xl">
          <Skeleton className="h-7 rounded w-56 mb-2" />
          <Skeleton className="h-4 rounded w-80" />
        </div>
      </div>
      <div className="container mx-auto px-4 max-w-5xl">
        <Skeleton className="h-14 rounded-2xl mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
