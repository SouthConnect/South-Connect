import Link from 'next/link'
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
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-1">{tool.name}</h3>
        <p className="text-sm text-gray-500 capitalize">{tool.category}</p>
      </div>

      <p className="text-gray-600 mb-4 line-clamp-3">{tool.description}</p>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {tool.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {tool.tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{tool.tags.length - 3}
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        {tool.pricing && (
          <span className="text-sm text-gray-600 capitalize">{tool.pricing}</span>
        )}
        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
        >
          Visiter <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
