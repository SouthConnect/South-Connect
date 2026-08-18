import Link from 'next/link'

export const metadata = { title: 'Politique de confidentialité — SouthConnect' }

type Section = {
  id: string
  title: string
  hint: string
}

// Structure standard RGPD (art. 13/14). Le contenu de chaque section est à
// compléter par l'équipe — cette page ne doit pas être considérée comme une
// politique de confidentialité définitive tant que le contenu n'est pas rempli.
const SECTIONS: Section[] = [
  {
    id: 'responsable',
    title: '1. Qui est responsable du traitement de vos données',
    hint: "Raison sociale, forme juridique, adresse du siège, numéro d'immatriculation, contact du délégué à la protection des données (DPO) si applicable.",
  },
  {
    id: 'donnees-collectees',
    title: '2. Quelles données nous collectons',
    hint: "Ex. : identité (nom, prénom, email), profil (bio, ville, pays, liens), contenu créé (opportunités, candidatures, messages), données techniques (adresse IP, logs). Préciser ce qui est obligatoire vs optionnel à l'inscription.",
  },
  {
    id: 'finalites',
    title: '3. Pourquoi nous les utilisons (finalités et base légale)',
    hint: 'Pour chaque finalité (création de compte, mise en relation, envoi de notifications, sécurité), préciser la base légale RGPD correspondante (exécution du contrat, intérêt légitime, consentement, obligation légale).',
  },
  {
    id: 'destinataires',
    title: '4. Qui reçoit vos données (sous-traitants et tiers)',
    hint: 'Liste des prestataires techniques utilisés par la plateforme : hébergement base de données (Supabase), envoi d\'emails transactionnels (Resend), suivi des erreurs applicatives (Sentry), connexion via compte Google (Google OAuth), génération assistée de brouillons d\'opportunités (Anthropic), mesure d\'audience (Vercel Analytics), hébergement (Vercel, Railway). Préciser pour chacun la finalité et si un transfert hors UE a lieu.',
  },
  {
    id: 'duree-conservation',
    title: '5. Combien de temps nous conservons vos données',
    hint: "Durée de conservation des comptes actifs, délai avant suppression après une demande d'effacement, durée de conservation des données anonymisées après suppression de compte.",
  },
  {
    id: 'vos-droits',
    title: '6. Vos droits sur vos données',
    hint: "Droit d'accès, de rectification, d'effacement, de portabilité, d'opposition et de limitation. Les fonctionnalités d'export (RGPD art. 20) et de suppression de compte (RGPD art. 17) sont déjà disponibles dans les paramètres du profil, onglet Sécurité — ce paragraphe doit y renvoyer explicitement.",
  },
  {
    id: 'cookies',
    title: '7. Cookies et traceurs',
    hint: "Cookies d'authentification (essentiels, non soumis à consentement), mesure d'audience (Vercel Analytics) — préciser si des données identifiantes sont collectées et si un consentement est requis.",
  },
  {
    id: 'transferts',
    title: '8. Transferts de données hors Union européenne',
    hint: "À préciser selon la localisation réelle des sous-traitants et de l'entreprise (garanties appropriées : clauses contractuelles types, décision d'adéquation, etc.).",
  },
  {
    id: 'securite',
    title: '9. Comment nous protégeons vos données',
    hint: 'Mesures techniques déjà en place : mots de passe hachés, cookies HttpOnly, connexions chiffrées, accès restreint en base (RLS). Résumé non technique à rédiger pour cette page.',
  },
  {
    id: 'contact',
    title: '10. Nous contacter / réclamation',
    hint: "Adresse de contact pour exercer vos droits, et mention du droit d'introduire une réclamation auprès de l'autorité de protection des données compétente.",
  },
  {
    id: 'modifications',
    title: '11. Modifications de cette politique',
    hint: 'Comment les utilisateurs seront informés en cas de changement substantiel.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 text-sm text-amber-800">
          Version provisoire — le contenu de chaque section ci-dessous est en cours de rédaction.
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Politique de confidentialité</h1>
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
