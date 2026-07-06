export default function OpportunitiesLoading() {
  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="bg-white border-b border-gray-100 py-6 mb-6">
        <div className="container mx-auto px-4 max-w-5xl animate-pulse">
          <div className="h-7 bg-gray-100 rounded w-56 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-80" />
        </div>
      </div>
      <div className="container mx-auto px-4 max-w-5xl animate-pulse">
        <div className="h-14 bg-white rounded-2xl border border-gray-100 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-gray-100" />
          ))}
        </div>
      </div>
    </div>
  )
}
