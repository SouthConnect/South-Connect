import TalentCard from '@/components/TalentCard'

type TalentUser = {
  id: string
  name: string | null
  email: string
  city: string | null
  country: string | null
  profilePic?: string | null
}

type TalentProfile = {
  id: string
  description?: string | null
  tags: string[]
  industries: string[]
  marketFocus: string[]
  languages: string[]
  businessSkills: string[]
  techSkills: string[]
  user: TalentUser
}

async function fetchTalents(): Promise<TalentProfile[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  if (!baseUrl) {
    console.error('NEXT_PUBLIC_API_URL non défini')
    return []
  }

  try {
    const res = await fetch(`${baseUrl}/profiles/lists/talents`, {
      // Revalidation côté serveur possible plus tard
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('Erreur API talents:', res.status, await res.text())
      return []
    }
    return (await res.json()) as TalentProfile[]
  } catch (error) {
    console.error('Erreur réseau lors de la récupération des talents:', error)
    return []
  }
}

export default async function TalentsPage() {
  const talents = await fetchTalents()

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Talents</h1>
        <p className="text-xl text-gray-600">
          Trouvez les compétences dont votre startup a besoin
        </p>
      </div>

      {talents.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">
            Aucun talent disponible pour le moment.
          </p>
          <p className="text-gray-500">
            Revenez bientôt pour découvrir les talents disponibles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {talents.map((talent) => (
            <TalentCard key={talent.id} talent={talent} />
          ))}
        </div>
      )}
    </div>
  )
}
