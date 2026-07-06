export default function NotificationsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl animate-pulse">
      <div className="h-8 bg-gray-100 rounded-lg w-44 mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
