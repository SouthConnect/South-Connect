import MentorCard from '@/components/MentorCard'

type MentorUser = {
  id: string
  name: string | null
  email: string
  city: string | null
  country: string | null
  profilePic?: string | null
}

type MentorProfile = {
  id: string
  description?: string | null
  tags: string[]
  industries: string[]
  marketFocus: string[]
  languages: string[]
  businessSkills: string[]
  techSkills: string[]
  user: MentorUser
}

async function fetchMentors(): Promise<MentorProfile[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL
  if (!baseUrl) {
    console.error('NEXT_PUBLIC_API_URL non défini')
    return []
  }

  try {
    // Pour l'instant, on réutilise la liste des talents comme mentors (même profil BtoC)
    const res = await fetch(`${baseUrl}/profiles/lists/talents`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('Erreur API mentors:', res.status, await res.text())
      return []
    }
    return (await res.json()) as MentorProfile[]
  } catch (error) {
    console.error('Erreur réseau lors de la récupération des mentors:', error)
    return []
  }
}

export default async function MentorsPage() {
  const mentors = await fetchMentors()

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Mentors</h1>
        <p className="text-xl text-gray-600">
          Connectez-vous avec des mentors expérimentés
        </p>
      </div>

      {mentors.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">
            Aucun mentor disponible pour le moment.
          </p>
          <p className="text-gray-500">
            Revenez bientôt pour découvrir les mentors disponibles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((mentor) => (
            <div key={mentor.id}>
              <MentorCard mentor={mentor as any} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
