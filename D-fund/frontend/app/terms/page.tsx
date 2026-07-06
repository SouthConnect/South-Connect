import Link from 'next/link'

export const metadata = { title: "Conditions générales d'utilisation — SouthConnect" }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{"Conditions générales d'utilisation"}</h1>
        <p className="text-gray-500 mb-6">
          Cette page est en cours de rédaction. Elle sera disponible prochainement.
        </p>
        <Link href="/" className="text-[#3b49df] hover:underline text-sm font-medium">
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
