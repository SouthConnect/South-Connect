export default function AnalyticsLoading() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl animate-pulse">
      <div className="h-8 bg-gray-100 rounded-lg w-36 mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="h-48 bg-gray-100 rounded-2xl" />
    </div>
  )
}
