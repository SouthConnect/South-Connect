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
      profilePic?: string | null
      country: string | null
      city: string | null
    }
  }
}

export default function InvestorCard({ investor }: InvestorCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-50 to-amber-100 flex-shrink-0 overflow-hidden flex items-center justify-center text-amber-600 font-bold text-lg">
          {investor.user.profilePic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={investor.user.profilePic} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            investor.user.name?.[0] ?? '?'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">{investor.user.name}</h3>
          {investor.type && (
            <p className="text-xs text-amber-600 font-semibold mt-0.5 capitalize">{investor.type}</p>
          )}
          {(investor.user.city || investor.user.country) && (
            <p className="text-xs text-gray-400 mt-0.5">
              {[investor.user.city, investor.user.country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      {investor.description && (
        <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">{investor.description}</p>
      )}

      {investor.focusAreas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {investor.focusAreas.slice(0, 3).map((area, i) => (
            <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full">
              {area}
            </span>
          ))}
          {investor.focusAreas.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-semibold rounded-full">
              +{investor.focusAreas.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="space-y-1 mb-4 text-xs text-gray-400">
        {investor.ticketSize && (
          <p><span className="font-semibold text-gray-600">Ticket:</span> {investor.ticketSize}</p>
        )}
        {investor.stage.length > 0 && (
          <p><span className="font-semibold text-gray-600">Stage:</span> {investor.stage.join(', ')}</p>
        )}
      </div>

      <Link
        href={`/profiles/${investor.user.id}`}
        className="block text-center bg-[#3b49df] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#2d3aba] transition-colors"
      >
        View Profile
      </Link>
    </div>
  )
}
