import { ExternalLink } from 'lucide-react'

interface ToolCardProps {
  tool: {
    id: string
    name: string
    category: string
    description: string
    url: string
    pricing: string | null
    tags: string[]
    creator: {
      name: string
    }
  }
}

export default function ToolCard({ tool }: ToolCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all">
      <div className="mb-3">
        <span className="inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-green-50 text-green-600 mb-2 capitalize">
          {tool.category}
        </span>
        <h3 className="text-sm font-bold text-gray-900 leading-snug">{tool.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5">by {tool.creator.name}</p>
      </div>

      <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">{tool.description}</p>

      {tool.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tool.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-semibold rounded-full">
              {tag}
            </span>
          ))}
          {tool.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-semibold rounded-full">
              +{tool.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto">
        {tool.pricing && (
          <span className="text-xs text-gray-400 capitalize">{tool.pricing}</span>
        )}
        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#3b49df] hover:text-[#2d3aba] transition-colors ml-auto"
        >
          Visit <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}
