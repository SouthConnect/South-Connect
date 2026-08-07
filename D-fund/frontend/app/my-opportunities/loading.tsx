import { Skeleton } from '@/components/Skeleton'

export default function MyOpportunitiesLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 rounded-lg w-56" />
        <Skeleton className="h-10 rounded-xl w-36" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
