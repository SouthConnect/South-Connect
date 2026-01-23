import Link from 'next/link'
import { Users, Wrench, GraduationCap, Briefcase, DollarSign } from 'lucide-react'

export default function ResourcesPage() {
  const resourceTypes = [
    {
      title: 'Talents',
      description: 'Trouvez les compétences dont votre startup a besoin',
      icon: <Users className="w-6 h-6" />,
      href: '/resources/talents',
      color: 'bg-blue-500',
    },
    {
      title: 'Outils',
      description: 'Découvrez les outils essentiels pour votre entreprise',
      icon: <Wrench className="w-6 h-6" />,
      href: '/resources/tools',
      color: 'bg-green-500',
    },
    {
      title: 'Mentors',
      description: 'Connectez-vous avec des mentors expérimentés',
      icon: <GraduationCap className="w-6 h-6" />,
      href: '/resources/mentors',
      color: 'bg-purple-500',
    },
    {
      title: 'Accompagnements',
      description: 'Accédez aux programmes d\'incubation et d\'accélération',
      icon: <Briefcase className="w-6 h-6" />,
      href: '/resources/programs',
      color: 'bg-orange-500',
    },
    {
      title: 'Investisseurs',
      description: 'Rencontrez des investisseurs et business angels',
      icon: <DollarSign className="w-6 h-6" />,
      href: '/resources/investors',
      color: 'bg-yellow-500',
    },
  ]

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-4 text-gray-900">Ressources</h1>
      <p className="text-xl text-gray-600 mb-12">
        Explorez les différentes ressources disponibles pour votre startup
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resourceTypes.map((resource) => (
          <Link key={resource.href} href={resource.href}>
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className={`${resource.color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4`}>
                {resource.icon}
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-gray-900">{resource.title}</h2>
              <p className="text-gray-600">{resource.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
