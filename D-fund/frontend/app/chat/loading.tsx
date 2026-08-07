import { Skeleton } from '@/components/Skeleton'

export default function ChatLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Skeleton className="h-8 rounded-lg w-32 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="md:col-span-2 h-96 rounded-xl" />
      </div>
    </div>
  )
}
