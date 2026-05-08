'use client'

import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  const btnColor =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : variant === 'warning'
      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
      : 'bg-[#3b49df] hover:bg-[#2d3aba] text-white'

  const iconColor =
    variant === 'danger'
      ? 'text-red-500 bg-red-50'
      : variant === 'warning'
      ? 'text-yellow-500 bg-yellow-50'
      : 'text-[#3b49df] bg-blue-50'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${iconColor}`}>
          <AlertTriangle className="w-5 h-5" />
        </div>

        <h2 className="text-base font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">{description}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
