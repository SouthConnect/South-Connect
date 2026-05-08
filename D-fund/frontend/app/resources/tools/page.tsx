import ResourcePageTemplate from '@/components/ResourcePageTemplate'
import { Wrench } from 'lucide-react'

export default function ToolsPage() {
  return (
    <ResourcePageTemplate
      title="Outils & Services"
      description="Découvrez les outils et services essentiels pour votre entreprise"
      type="SERVICE_LISTING"
      icon={Wrench}
      createLabel="Proposer un outil"
    />
  )
}
