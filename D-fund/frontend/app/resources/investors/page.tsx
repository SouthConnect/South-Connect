import ResourcePageTemplate from '@/components/ResourcePageTemplate'
import { DollarSign } from 'lucide-react'

export default function InvestorsPage() {
  return (
    <ResourcePageTemplate
      title="Investisseurs"
      description="Rencontrez des investisseurs et business angels prêts à financer vos projets"
      type="INVESTOR_PROFILE"
      icon={DollarSign}
      createLabel="Créer un profil investisseur"
    />
  )
}
