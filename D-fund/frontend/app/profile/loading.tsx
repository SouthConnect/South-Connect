export default function ProfileLoading() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl animate-pulse">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 bg-gray-100 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-gray-100 rounded w-48" />
            <div className="h-4 bg-gray-100 rounded w-64" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
