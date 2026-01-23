import InvestorCard from '@/components/InvestorCard'

type InvestorUser = {
  id: string
  name: string | null
  email: string
  city: string | null
  country: string | null
  profilePic?: string | null
}

type InvestorProfile = {
  id: string
  description?: string | null
  industries: string[]
  marketFocus: string[]
  user: InvestorUser
}

async function fetchInvestors(): Promise<InvestorProfile[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  if (!baseUrl) {
    console.error('NEXT_PUBLIC_API_URL non défini')
    return []
  }

  try {
    // Pour V1, on utilise les profils BtoB comme base pour les investisseurs potentiels
    const res = await fetch(`${baseUrl}/profiles/lists/companies`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('Erreur API investors:', res.status, await res.text())
      return []
    }
    return (await res.json()) as InvestorProfile[]
  } catch (error) {
    console.error('Erreur réseau lors de la récupération des investisseurs:', error)
    return []
  }
}

export default async function InvestorsPage() {
  const investors = await fetchInvestors()

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Investisseurs</h1>
        <p className="text-xl text-gray-600">
          Rencontrez des investisseurs et business angels
        </p>
      </div>

      {investors.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">
            Aucun investisseur disponible pour le moment.
          </p>
          <p className="text-gray-500">
            Revenez bientôt pour découvrir les investisseurs disponibles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {investors.map((investor) => (
            <div key={investor.id}>
              <InvestorCard investor={investor as any} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
