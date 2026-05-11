'use client'

import ResourcePageTemplate from '@/components/ResourcePageTemplate'
import { GraduationCap } from 'lucide-react'

export default function MentorsPage() {
  return (
    <ResourcePageTemplate
      title="Mentors & Business Angels"
      description="Connectez-vous avec des mentors et business angels expérimentés"
      type="MENTORSHIP_BA_OFFER"
      icon={GraduationCap}
      createLabel="Proposer un mentoring"
    />
  )
}
