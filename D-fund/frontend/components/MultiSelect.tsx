'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiJson } from '@/app/lib/api'
import { ChevronDown, X, Check } from 'lucide-react'

interface Item { id: string; name: string }

interface Props {
  /** API endpoint returning { id, name }[] — e.g. '/industries' */
  endpoint: string
  /** Currently selected names */
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  label?: string
  /** Maximum items selectable (default: unlimited) */
  max?: number
}

/**
 * Multi-select dropdown backed by a live API endpoint.
 * Renders selected items as removable chips.
 * Falls back gracefully when the endpoint returns nothing.
 */
export default function MultiSelect({ endpoint, value, onChange, placeholder = 'Select…', label, max }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ['multiselect', endpoint],
    queryFn: () => apiJson<Item[]>(endpoint),
    staleTime: 5 * 60 * 1000, // cache 5 min — reference data changes rarely
  })

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter((v) => v !== name))
    } else {
      if (max && value.length >= max) return
      onChange([...value, name])
    }
  }

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[38px] px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-sm text-left flex items-center gap-1.5 flex-wrap focus:outline-none focus:ring-2 focus:ring-[#3b49df] focus:border-[#3b49df]"
      >
        {value.length === 0 ? (
          <span className="text-gray-400 flex-1">{placeholder}</span>
        ) : (
          <span className="flex flex-wrap gap-1 flex-1">
            {value.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 bg-[#3b49df]/10 text-[#3b49df] text-xs font-semibold px-2 py-0.5 rounded-full"
              >
                {v}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(v) }}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search inside dropdown */}
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3b49df]"
            />
          </div>

          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-400 text-center">Aucun résultat</li>
            ) : (
              filtered.map((item) => {
                const selected = value.includes(item.name)
                const disabled = !selected && !!max && value.length >= max
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggle(item.name)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                        selected
                          ? 'bg-[#3b49df]/5 text-[#3b49df] font-semibold'
                          : disabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.name}
                      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  </li>
                )
              })
            )}
          </ul>

          {max && (
            <div className="px-3 py-1.5 border-t border-gray-100 text-[10px] text-gray-400">
              {value.length}/{max} sélectionné(s)
            </div>
          )}
        </div>
      )}
    </div>
  )
}
