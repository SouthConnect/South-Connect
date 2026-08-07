import { Skeleton } from '@/components/Skeleton'

export default function HomeLoading() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-white border-b border-gray-100 py-10">
        <div className="container mx-auto px-4 max-w-5xl space-y-4">
          <Skeleton className="h-8 rounded-lg w-2/3 mx-auto" />
          <Skeleton className="h-4 rounded w-1/2 mx-auto" />
          <Skeleton className="h-12 rounded-2xl max-w-xl mx-auto mt-4" />
        </div>
      </div>
      {/* Cards */}
      <div className="container mx-auto px-4 max-w-5xl py-8 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
