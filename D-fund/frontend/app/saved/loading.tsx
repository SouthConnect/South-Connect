export default function SavedLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-pulse">
      <div className="h-8 bg-gray-100 rounded-lg w-48 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white rounded-xl border border-gray-100" />
        ))}
      </div>
    </div>
  )
}
