export default function OpportunityDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl animate-pulse">
      <div className="h-5 bg-gray-100 rounded w-32 mb-6" />
      <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6">
        {/* Header */}
        <div className="flex gap-4 items-start">
          <div className="w-16 h-16 bg-gray-100 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-7 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
        {/* Tags */}
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 bg-gray-100 rounded-full w-20" />
          ))}
        </div>
        {/* Body */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 bg-gray-100 rounded" style={{ width: `${85 - i * 5}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
