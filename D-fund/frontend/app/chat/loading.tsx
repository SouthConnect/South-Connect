export default function ChatLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl animate-pulse">
      <div className="h-8 bg-gray-100 rounded-lg w-32 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl" />
          ))}
        </div>
        <div className="md:col-span-2 h-96 bg-gray-100 rounded-xl" />
      </div>
    </div>
  )
}
