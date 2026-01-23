import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4">D-Fund</h3>
            <p className="text-gray-400">
              Connecter les entrepreneurs africains aux ressources dont ils ont besoin.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Ressources</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/resources/talents" className="hover:text-white">Talents</Link></li>
              <li><Link href="/resources/tools" className="hover:text-white">Outils</Link></li>
              <li><Link href="/resources/mentors" className="hover:text-white">Mentors</Link></li>
              <li><Link href="/resources/programs" className="hover:text-white">Programmes</Link></li>
              <li><Link href="/resources/investors" className="hover:text-white">Investisseurs</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Entreprise</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/about" className="hover:text-white">À propos</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Légal</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/privacy" className="hover:text-white">Confidentialité</Link></li>
              <li><Link href="/terms" className="hover:text-white">Conditions</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} D-Fund. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}
