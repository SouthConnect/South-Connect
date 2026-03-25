import OpportunityCard from '@/components/OpportunityCard'

type ToolOpportunity = {
  id: string
  name: string
  type: string
  punchline?: string | null
  description?: string | null
  image?: string | null
  owner: {
    id: string
    name: string
    profilePic?: string | null
  }
  createdAt: string
  applicationsCount: number
  likesCount: number
  messagesCount: number
  savedCount: number
}

async function fetchTools(): Promise<ToolOpportunity[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  if (!baseUrl) {
    console.error('NEXT_PUBLIC_API_URL non défini')
    return []
  }

  try {
    const url = `${baseUrl}/opportunities?type=SERVICE_LISTING&status=ACTIVE&take=50`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      console.error('Erreur API outils:', res.status, await res.text())
      return []
    }
    return (await res.json()) as ToolOpportunity[]
  } catch (error) {
    console.error('Erreur réseau lors de la récupération des outils:', error)
    return []
  }
}

export default async function ToolsPage() {
  const tools = await fetchTools()

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Tools</h1>
        <p className="text-xl text-gray-600">
          Discover tools and services listed by the D-fund community.
        </p>
      </div>

      {tools.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-700 text-lg mb-3">
            There are no tools or services listed yet.
          </p>
          <p className="text-gray-500 text-sm">
            Create an opportunity of type <code>SERVICE_LISTING</code> to reference a useful tool or service.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tools.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity as any} />
          ))}
        </div>
      )}
    </div>
  )
}
