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
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all">
      <div className="mb-3">
        <span className="inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-orange-50 text-orange-600 mb-2 capitalize">
          {program.type}
        </span>
        <h3 className="text-sm font-bold text-gray-900 leading-snug">{program.name}</h3>
        {(program.city || program.country) && (
          <p className="text-xs text-gray-400 mt-0.5">
            {[program.city, program.country].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">{program.description}</p>

      {program.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {program.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-semibold rounded-full">
              {tag}
            </span>
          ))}
          {program.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-semibold rounded-full">
              +{program.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
        {program.duration && <span>{program.duration}</span>}
        {program.cost && <span className="capitalize font-semibold text-gray-600">{program.cost}</span>}
      </div>

      {program.url ? (
        <a
          href={program.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center bg-[#3b49df] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#2d3aba] transition-colors"
        >
          Learn more
        </a>
      ) : (
        <Link
          href={`/resources/programs/${program.id}`}
          className="block text-center bg-[#3b49df] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#2d3aba] transition-colors"
        >
          Learn more
        </Link>
      )}
    </div>
  )
}
