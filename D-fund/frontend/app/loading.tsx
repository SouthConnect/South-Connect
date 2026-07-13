export default function HomeLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero */}
      <div className="bg-white border-b border-gray-100 py-10">
        <div className="container mx-auto px-4 max-w-5xl space-y-4">
          <div className="h-8 bg-gray-100 rounded-lg w-2/3 mx-auto" />
          <div className="h-4 bg-gray-100 rounded w-1/2 mx-auto" />
          <div className="h-12 bg-gray-100 rounded-2xl max-w-xl mx-auto mt-4" />
        </div>
      </div>
      {/* Cards */}
      <div className="container mx-auto px-4 max-w-5xl py-8 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white rounded-xl border border-gray-100" />
        ))}
      </div>
    </div>
  )
}
