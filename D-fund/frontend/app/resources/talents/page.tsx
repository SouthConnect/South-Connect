import ResourcePageTemplate from '@/components/ResourcePageTemplate'
import { Users } from 'lucide-react'

export default function TalentsPage() {
  return (
    <ResourcePageTemplate
      title="Talents"
      description="Trouvez les compétences dont votre startup a besoin"
      type="TALENT_PROFILE"
      icon={Users}
      createLabel="Publier un profil talent"
    />
  )
}
