export default function ExploreLoading() {
  return (
    <div className="animate-pulse">
      <div className="bg-white border-b border-gray-100 py-6">
        <div className="container mx-auto px-4 max-w-5xl space-y-3">
          <div className="h-6 bg-gray-100 rounded w-48" />
          <div className="h-4 bg-gray-100 rounded w-72" />
        </div>
      </div>
      <div className="container mx-auto px-4 max-w-5xl py-6 space-y-4">
        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 bg-gray-100 rounded-full w-24" />
          ))}
        </div>
        {/* Cards */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 bg-white rounded-xl border border-gray-100" />
        ))}
      </div>
    </div>
  )
}
