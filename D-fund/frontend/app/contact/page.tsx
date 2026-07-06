import Link from 'next/link'

export const metadata = { title: 'Contact — SouthConnect' }

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Nous contacter</h1>
        <p className="text-gray-500 mb-2">
          Pour toute question ou demande, écrivez-nous à :
        </p>
        <a
          href="mailto:danbetheliryivuze@gmail.com"
          className="text-[#3b49df] font-semibold hover:underline text-base"
        >
          danbetheliryivuze@gmail.com
        </a>
        <div className="mt-8">
          <Link href="/" className="text-sm text-gray-400 hover:underline">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
