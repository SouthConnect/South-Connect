import Link from 'next/link'

interface MentorCardProps {
  mentor: {
    id: string
    expertise: string[]
    experience: number | null
    availability: string | null
    rate: string | null
    description: string | null
    user: {
      id: string
      name: string
      country: string | null
      city: string | null
    }
  }
}

export default function MentorCard({ mentor }: MentorCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">{mentor.user.name}</h3>
        {(mentor.user.city || mentor.user.country) && (
          <p className="text-sm text-gray-500">
            {[mentor.user.city, mentor.user.country].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      {mentor.description && (
        <p className="text-gray-600 mb-4 line-clamp-3">{mentor.description}</p>
      )}

      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {mentor.expertise.slice(0, 3).map((exp, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
            >
              {exp}
            </span>
          ))}
          {mentor.expertise.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{mentor.expertise.length - 3}
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
        {mentor.experience && (
          <span>{mentor.experience} ans d'expérience</span>
        )}
        {mentor.rate && (
          <span className="capitalize">{mentor.rate}</span>
        )}
      </div>

      <Link
        href={`/resources/mentors/${mentor.id}`}
        className="block text-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
      >
        Contacter
      </Link>
    </div>
  )
}
