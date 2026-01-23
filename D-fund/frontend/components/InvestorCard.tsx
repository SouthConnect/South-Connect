import Link from 'next/link'

interface InvestorCardProps {
  investor: {
    id: string
    type: string | null
    focusAreas: string[]
    ticketSize: string | null
    stage: string[]
    description: string | null
    user: {
      id: string
      name: string
      country: string | null
      city: string | null
    }
  }
}

export default function InvestorCard({ investor }: InvestorCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">{investor.user.name}</h3>
        {investor.type && (
          <p className="text-sm text-gray-500 capitalize">{investor.type}</p>
        )}
        {(investor.user.city || investor.user.country) && (
          <p className="text-sm text-gray-500">
            {[investor.user.city, investor.user.country].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      {investor.description && (
        <p className="text-gray-600 mb-4 line-clamp-3">{investor.description}</p>
      )}

      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {investor.focusAreas.slice(0, 3).map((area, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full"
            >
              {area}
            </span>
          ))}
          {investor.focusAreas.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{investor.focusAreas.length - 3}
            </span>
          )}
        </div>
      </div>

      <div className="mb-4 space-y-1 text-sm text-gray-600">
        {investor.ticketSize && (
          <p><span className="font-medium">Ticket:</span> {investor.ticketSize}</p>
        )}
        {investor.stage.length > 0 && (
          <p><span className="font-medium">Stages:</span> {investor.stage.join(', ')}</p>
        )}
      </div>

      <Link
        href={`/resources/investors/${investor.id}`}
        className="block text-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
      >
        Contacter
      </Link>
    </div>
  )
}
