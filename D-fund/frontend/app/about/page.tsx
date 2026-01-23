export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-gray-900">À propos de D-Fund</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-600 mb-6">
            D-Fund est une plateforme dédiée à connecter les entrepreneurs africains 
            aux ressources essentielles dont ils ont besoin pour faire croître leurs startups.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Notre Mission</h2>
          <p className="text-gray-600 mb-6">
            Faciliter l'accès aux talents, outils, mentors, programmes d'accompagnement 
            et investisseurs pour les entrepreneurs africains, en créant un écosystème 
            dynamique et interconnecté.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Ce que nous offrons</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
            <li><strong>Talents:</strong> Trouvez les compétences dont votre startup a besoin</li>
            <li><strong>Outils:</strong> Découvrez les outils essentiels pour votre entreprise</li>
            <li><strong>Mentors:</strong> Connectez-vous avec des mentors expérimentés</li>
            <li><strong>Accompagnements:</strong> Accédez aux programmes d'incubation et d'accélération</li>
            <li><strong>Investisseurs:</strong> Rencontrez des investisseurs et business angels</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Notre Vision</h2>
          <p className="text-gray-600 mb-6">
            Devenir la plateforme de référence pour l'écosystème entrepreneurial africain, 
            en facilitant les connexions et en accélérant la croissance des startups à travers le continent.
          </p>
        </div>
      </div>
    </div>
  )
}
