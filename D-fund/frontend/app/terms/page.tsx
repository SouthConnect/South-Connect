import Link from 'next/link'

export const metadata = { title: "Conditions générales d'utilisation — SouthConnect" }

type Section = {
  id: string
  title: string
  hint: string
}

// Structure standard pour des CGU de plateforme communautaire. Le contenu de
// chaque section est à compléter par l'équipe — cette page ne doit pas être
// considérée comme des conditions définitives tant que le contenu n'est pas rempli.
const SECTIONS: Section[] = [
  {
    id: 'objet',
    title: '1. Objet',
    hint: 'Présentation de SouthConnect et objet des présentes conditions générales.',
  },
  {
    id: 'acceptation',
    title: '2. Acceptation des conditions',
    hint: "L'inscription sur la plateforme vaut acceptation pleine et entière des présentes conditions.",
  },
  {
    id: 'compte',
    title: '3. Inscription et compte utilisateur',
    hint: "Conditions d'éligibilité, exactitude des informations fournies, responsabilité de l'utilisateur quant à la confidentialité de son mot de passe.",
  },
  {
    id: 'utilisation',
    title: "4. Règles d'utilisation",
    hint: 'Comportements interdits (contenus illicites, usurpation, spam, démarchage abusif, contournement des mesures de sécurité), conséquences en cas de manquement (avertissement, suspension, bannissement — les mécanismes techniques de ban et de suppression de compte existent déjà côté administration).',
  },
  {
    id: 'contenu',
    title: '5. Contenu publié par les utilisateurs',
    hint: "Propriété du contenu publié (opportunités, messages, profils), licence accordée à SouthConnect pour l'affichage sur la plateforme, modération.",
  },
  {
    id: 'propriete-intellectuelle',
    title: '6. Propriété intellectuelle',
    hint: 'Propriété de la marque, du logo et des éléments techniques de la plateforme.',
  },
  {
    id: 'responsabilite',
    title: '7. Responsabilité et garanties',
    hint: "SouthConnect met en relation les utilisateurs mais n'est pas partie aux accords conclus entre eux (candidatures, financements, partenariats) — limites de responsabilité à préciser.",
  },
  {
    id: 'resiliation',
    title: '8. Résiliation et suppression de compte',
    hint: "Modalités de suppression volontaire du compte (déjà disponible dans les paramètres du profil, onglet Sécurité) et de résiliation à l'initiative de SouthConnect en cas de manquement.",
  },
  {
    id: 'droit-applicable',
    title: '9. Droit applicable et litiges',
    hint: 'Juridiction et droit applicable en cas de litige.',
  },
  {
    id: 'contact',
    title: '10. Contact',
    hint: 'Adresse de contact pour toute question relative aux présentes conditions.',
  },
  {
    id: 'modifications',
    title: '11. Modification des conditions',
    hint: 'Comment les utilisateurs seront informés en cas de changement substantiel des conditions.',
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 text-sm text-amber-800">
          Version provisoire — le contenu de chaque section ci-dessous est en cours de rédaction.
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {"Conditions générales d'utilisation"}
          </h1>
          <p className="text-sm text-gray-400 mb-10">Dernière mise à jour : à compléter</p>

          <div className="space-y-10">
            {SECTIONS.map((section) => (
              <section key={section.id} id={section.id}>
                <h2 className="text-base font-bold text-gray-900 mb-2">{section.title}</h2>
                <p className="text-sm text-gray-400 italic">{section.hint}</p>
              </section>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100">
            <Link href="/" className="text-[#3b49df] hover:underline text-sm font-medium">
              ← Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
