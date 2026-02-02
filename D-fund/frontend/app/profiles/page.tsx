'use client'

import { useAuth } from '@/app/lib/AuthContext'
import Link from 'next/link'
import { ArrowRight, UserCircle2, Building2 } from 'lucide-react'

export default function ProfilesEntryPage() {
  const { user } = useAuth()

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Profiles</h1>
      <p className="text-sm text-gray-500 mb-8">
        Manage your individual (BtoC) and company (BtoB) profiles.
      </p>

      <div className="space-y-4">
        <ProfileCard
          title="Your BtoC profile"
          description="Showcase your skills, background and what you are looking for."
          href="/profile?tab=btoc"
          icon={UserCircle2}
          userName={user?.name}
        />
        <ProfileCard
          title="Your BtoB profiles"
          description="Create and manage company profiles to increase visibility."
          href="/profile?tab=btob"
          icon={Building2}
          userName={user?.name}
        />
      </div>
    </div>
  )
}

function ProfileCard({
  title,
  description,
  href,
  icon: Icon,
  userName,
}: {
  title: string
  description: string
  href: string
  icon: any
  userName?: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-[#3b49df]">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400" />
    </Link>
  )
}

