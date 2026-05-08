import ResourcePageTemplate from '@/components/ResourcePageTemplate'
import { Briefcase } from 'lucide-react'

export default function ProgramsPage() {
  return (
    <ResourcePageTemplate
      title="Programmes d'accompagnement"
      description="Accédez aux incubateurs, accélérateurs et programmes de venture"
      type="VENTURE_PROGRAM"
      icon={Briefcase}
      createLabel="Publier un programme"
    />
  )
}
