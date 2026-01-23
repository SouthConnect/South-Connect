import Link from 'next/link'
import { ArrowRight, Users, Briefcase, GraduationCap, DollarSign, Wrench } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Connectez-vous aux ressources
          <span className="text-primary-600 block">pour votre startup</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          D-Fund est la plateforme qui connecte les entrepreneurs africains aux talents, 
          outils, mentors, programmes d'accompagnement et investisseurs dont ils ont besoin.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Commencer
          </Link>
          <Link
            href="/resources"
            className="border-2 border-primary-600 text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
          >
            Explorer les ressources
          </Link>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Trouvez les ressources dont vous avez besoin
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ResourceCard
            icon={<Users className="w-8 h-8" />}
            title="Talents"
            description="Trouvez les compétences dont votre startup a besoin"
            href="/resources/talents"
            color="bg-blue-100 text-blue-600"
          />
          <ResourceCard
            icon={<Wrench className="w-8 h-8" />}
            title="Outils"
            description="Découvrez les outils essentiels pour votre entreprise"
            href="/resources/tools"
            color="bg-green-100 text-green-600"
          />
          <ResourceCard
            icon={<GraduationCap className="w-8 h-8" />}
            title="Mentors"
            description="Connectez-vous avec des mentors expérimentés"
            href="/resources/mentors"
            color="bg-purple-100 text-purple-600"
          />
          <ResourceCard
            icon={<Briefcase className="w-8 h-8" />}
            title="Accompagnements"
            description="Accédez aux programmes d'incubation et d'accélération"
            href="/resources/programs"
            color="bg-orange-100 text-orange-600"
          />
          <ResourceCard
            icon={<DollarSign className="w-8 h-8" />}
            title="Investisseurs"
            description="Rencontrez des investisseurs et business angels"
            href="/resources/investors"
            color="bg-yellow-100 text-yellow-600"
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-primary-600 mb-2">100+</div>
            <div className="text-gray-600">Entrepreneurs</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary-600 mb-2">50+</div>
            <div className="text-gray-600">Mentors</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-primary-600 mb-2">30+</div>
            <div className="text-gray-600">Investisseurs</div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ResourceCard({ 
  icon, 
  title, 
  description, 
  href, 
  color 
}: { 
  icon: React.ReactNode
  title: string
  description: string
  href: string
  color: string
}) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className={`${color} w-16 h-16 rounded-lg flex items-center justify-center mb-4`}>
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="flex items-center text-primary-600 font-medium">
          Explorer <ArrowRight className="w-4 h-4 ml-2" />
        </div>
      </div>
    </Link>
  )
}
