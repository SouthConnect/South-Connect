/**
 * Page Outils
 * 
 * TODO: À adapter pour consommer l'API NestJS /opportunities avec type SERVICE_LISTING
 * 
 * Pour V1, les outils peuvent être affichés comme des opportunités de type SERVICE_LISTING
 * via l'endpoint GET /opportunities?type=SERVICE_LISTING
 */

export default async function ToolsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Outils</h1>
        <p className="text-xl text-gray-600">
          Découvrez les outils essentiels pour votre entreprise
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-12 text-center">
        <p className="text-gray-600 text-lg mb-4">
          Page en cours de développement
        </p>
        <p className="text-gray-500">
          Cette page sera connectée à l&apos;API NestJS pour afficher les opportunités de type SERVICE_LISTING.
        </p>
      </div>
    </div>
  )
}
