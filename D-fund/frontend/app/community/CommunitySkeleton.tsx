import { Skeleton } from '@/components/Skeleton'

/** One placeholder row — mirrors MemberRow/TalentRow/CompanyRow's avatar + name + subtitle shape. */
export function CommunityRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  )
}

/** Full-page skeleton — shared between the client loading state and loading.tsx. */
export function CommunitySkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <CommunityRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
