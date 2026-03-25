import OpportunityCard from '@/components/OpportunityCard'

type ProgramOpportunity = {
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

async function fetchPrograms(): Promise<ProgramOpportunity[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  if (!baseUrl) {
    console.error('NEXT_PUBLIC_API_URL non défini')
    return []
  }

  try {
    const url = `${baseUrl}/opportunities?type=VENTURE_PROGRAM&status=ACTIVE&take=50`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      console.error('Erreur API programmes:', res.status, await res.text())
      return []
    }
    return (await res.json()) as ProgramOpportunity[]
  } catch (error) {
    console.error('Erreur réseau lors de la récupération des programmes:', error)
    return []
  }
}

export default async function ProgramsPage() {
  const programs = await fetchPrograms()

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Support Programs</h1>
        <p className="text-xl text-gray-600">
          Access incubation and acceleration programs curated by the D-fund community.
        </p>
      </div>

      {programs.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-700 text-lg mb-3">
            There are no active support programs at the moment.
          </p>
          <p className="text-gray-500 text-sm">
            Check back soon or create an opportunity of type <code>VENTURE_PROGRAM</code> in the Opportunities section.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity as any} />
          ))}
        </div>
      )}
    </div>
  )
}
