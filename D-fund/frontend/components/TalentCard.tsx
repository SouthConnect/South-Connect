import Link from 'next/link'

interface TalentCardProps {
  talent: {
    id: string
    skills: string[]
    experience: number | null
    availability: string | null
    rate: string | null
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

export default function TalentCard({ talent }: TalentCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3b49df]/10 to-[#3b49df]/20 flex-shrink-0 overflow-hidden flex items-center justify-center text-[#3b49df] font-bold text-lg">
          {talent.user.profilePic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={talent.user.profilePic} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            talent.user.name?.[0] ?? '?'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">{talent.user.name}</h3>
          {(talent.user.city || talent.user.country) && (
            <p className="text-xs text-gray-400 mt-0.5">
              {[talent.user.city, talent.user.country].filter(Boolean).join(', ')}
            </p>
          )}
          {talent.availability && (
            <p className="text-xs text-[#3b49df] font-semibold mt-0.5 capitalize">{talent.availability}</p>
          )}
        </div>
      </div>

      {talent.description && (
        <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">{talent.description}</p>
      )}

      {talent.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {talent.skills.slice(0, 3).map((skill, i) => (
            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-full">
              {skill}
            </span>
          ))}
          {talent.skills.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-semibold rounded-full">
              +{talent.skills.length - 3}
            </span>
          )}
        </div>
      )}

      {talent.experience && (
        <p className="text-xs text-gray-400 mb-4">{talent.experience} years of experience</p>
      )}

      <Link
        href={`/profiles/${talent.user.id}`}
        className="block text-center bg-[#3b49df] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#2d3aba] transition-colors"
      >
        View Profile
      </Link>
    </div>
  )
}
