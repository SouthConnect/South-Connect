/**
 * Page Programmes
 * 
 * TODO: À adapter pour consommer l'API NestJS /opportunities avec type VENTURE_PROGRAM
 * 
 * Pour V1, les programmes peuvent être affichés comme des opportunités de type VENTURE_PROGRAM
 * via l'endpoint GET /opportunities?type=VENTURE_PROGRAM
 */

export default async function ProgramsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Programmes d&apos;accompagnement</h1>
        <p className="text-xl text-gray-600">
          Accédez aux programmes d&apos;incubation et d&apos;accélération
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-12 text-center">
        <p className="text-gray-600 text-lg mb-4">
          Page en cours de développement
        </p>
        <p className="text-gray-500">
          Cette page sera connectée à l&apos;API NestJS pour afficher les opportunités de type VENTURE_PROGRAM.
        </p>
      </div>
    </div>
  )
}
