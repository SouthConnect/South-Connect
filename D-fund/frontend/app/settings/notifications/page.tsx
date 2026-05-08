'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import AuthGuard from '@/components/AuthGuard'
import { Bell, Mail, Loader2, CheckCircle } from 'lucide-react'
import { useState } from 'react'

interface NotificationPreferences {
  emailApplicationSubmitted: boolean
  emailApplicationReviewed: boolean
  emailApplicationAccepted: boolean
  emailOpportunityApproved: boolean
  emailOpportunityRejected: boolean
  emailNewMessage: boolean
  emailNewFollower: boolean
  inAppApplicationSubmitted: boolean
  inAppApplicationReviewed: boolean
  inAppApplicationAccepted: boolean
  inAppOpportunityApproved: boolean
  inAppOpportunityRejected: boolean
  inAppNewMessage: boolean
  inAppNewFollower: boolean
}

const EMAIL_PREFS: { key: keyof NotificationPreferences; label: string }[] = [
  { key: 'emailApplicationSubmitted', label: 'Nouvelle candidature sur mon opportunité' },
  { key: 'emailApplicationReviewed', label: 'Ma candidature a été revue' },
  { key: 'emailApplicationAccepted', label: 'Ma candidature a été acceptée' },
  { key: 'emailOpportunityApproved', label: 'Mon opportunité a été approuvée' },
  { key: 'emailOpportunityRejected', label: 'Mon opportunité a été refusée' },
  { key: 'emailNewMessage', label: 'Nouveau message privé' },
  { key: 'emailNewFollower', label: "Quelqu'un me suit" },
]

const INAPP_PREFS: { key: keyof NotificationPreferences; label: string }[] = [
  { key: 'inAppApplicationSubmitted', label: 'Nouvelle candidature sur mon opportunité' },
  { key: 'inAppApplicationReviewed', label: 'Ma candidature a été revue' },
  { key: 'inAppApplicationAccepted', label: 'Ma candidature a été acceptée' },
  { key: 'inAppOpportunityApproved', label: 'Mon opportunité a été approuvée' },
  { key: 'inAppOpportunityRejected', label: 'Mon opportunité a été refusée' },
  { key: 'inAppNewMessage', label: 'Nouveau message privé' },
  { key: 'inAppNewFollower', label: "Quelqu'un me suit" },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function PrefsPageContent() {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data: prefs, isLoading, isError } = useQuery<NotificationPreferences>({
    queryKey: ['notificationPrefs'],
    queryFn: () => apiJson('/notifications/preferences'),
  })

  const mutation = useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) =>
      apiJson('/notifications/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['notificationPrefs'], updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
    onError: () => {
      // Rollback optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['notificationPrefs'] })
    },
  })

  const toggle = (key: keyof NotificationPreferences) => {
    if (!prefs) return
    const previous = prefs
    const updated = { ...prefs, [key]: !prefs[key] }
    queryClient.setQueryData(['notificationPrefs'], updated)
    mutation.mutate({ [key]: !prefs[key] }, {
      onError: () => queryClient.setQueryData(['notificationPrefs'], previous),
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (isError || !prefs) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger vos préférences. Veuillez réessayer.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Bell className="h-7 w-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Préférences de notifications</h1>
        {saved && (
          <span className="ml-auto flex items-center gap-1 text-sm text-green-600 font-medium">
            <CheckCircle className="h-4 w-4" /> Sauvegardé
          </span>
        )}
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Mail className="h-5 w-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-800">Emails de notification</h2>
        </div>
        <div className="space-y-4">
          {EMAIL_PREFS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{label}</span>
              <Toggle checked={prefs[key]} onChange={() => toggle(key)} />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell className="h-5 w-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-800">Notifications dans l'application</h2>
        </div>
        <div className="space-y-4">
          {INAPP_PREFS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{label}</span>
              <Toggle checked={prefs[key]} onChange={() => toggle(key)} />
            </div>
          ))}
        </div>
      </section>

      <p className="mt-6 text-xs text-gray-400 text-center">
        Les emails de vérification de compte et de réinitialisation de mot de passe sont toujours envoyés.
      </p>
    </div>
  )
}

export default function NotificationPreferencesPage() {
  return (
    <AuthGuard>
      <PrefsPageContent />
    </AuthGuard>
  )
}
