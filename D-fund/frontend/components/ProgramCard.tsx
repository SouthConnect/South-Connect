import Link from 'next/link'

interface ProgramCardProps {
  program: {
    id: string
    name: string
    type: string
    description: string
    duration: string | null
    cost: string | null
    url: string | null
    tags: string[]
    country: string | null
    city: string | null
  }
}

export default function ProgramCard({ program }: ProgramCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">{program.name}</h3>
        <p className="text-sm text-gray-500 capitalize">{program.type}</p>
      </div>

      <p className="text-gray-600 mb-4 line-clamp-3">{program.description}</p>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {program.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {program.tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{program.tags.length - 3}
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
        {program.duration && <span>{program.duration}</span>}
        {program.cost && <span className="capitalize">{program.cost}</span>}
        {(program.city || program.country) && (
          <span>{[program.city, program.country].filter(Boolean).join(', ')}</span>
        )}
      </div>

      {program.url ? (
        <a
          href={program.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          En savoir plus
        </a>
      ) : (
        <Link
          href={`/resources/programs/${program.id}`}
          className="block text-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          En savoir plus
        </Link>
      )}
    </div>
  )
}
