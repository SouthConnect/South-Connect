import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <span className="text-6xl font-bold text-[#3b49df]">404</span>
      <h2 className="text-xl font-semibold text-gray-800">
        Page introuvable
      </h2>
      <p className="text-gray-500 text-sm max-w-sm">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-[#3b49df] text-white rounded-lg text-sm hover:bg-[#2f3ab2] transition-colors"
      >
        Retour à l'accueil
      </Link>
    </div>
  )
}
