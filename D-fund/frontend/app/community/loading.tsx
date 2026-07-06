export default function CommunityLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl animate-pulse">
      <div className="h-8 bg-gray-100 rounded-lg w-48 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-36 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
