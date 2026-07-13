export default function SearchLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl animate-pulse">
      <div className="h-12 bg-gray-100 rounded-2xl mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-white rounded-xl border border-gray-100" />
        ))}
      </div>
    </div>
  )
}
