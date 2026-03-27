'use client'

/**
 * FilterPanel — reusable filter trigger + panel matching the conference listing page style.
 *
 * Usage:
 *   <FilterPanel
 *     groups={[
 *       {
 *         label: 'Status',
 *         type: 'radio',           // 'radio' = pick one, 'pills' = pick one pill
 *         options: [{ value: 'ALL', label: 'All' }, { value: 'COMPLETED', label: 'Paid' }],
 *         value: statusFilter,
 *         onChange: setStatusFilter,
 *       },
 *     ]}
 *     triggerClassName="..."   // optional
 *   />
 */

import { useState, useRef, useEffect } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from './button'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterGroup {
  label: string
  /** 'radio' renders native radio buttons; 'pills' renders pill toggle buttons */
  type: 'radio' | 'pills'
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

interface FilterPanelProps {
  groups: FilterGroup[]
  /** Optional extra className on the trigger button */
  triggerClassName?: string
}

export function FilterPanel({ groups, triggerClassName }: FilterPanelProps) {
  const [open, setOpen] = useState(false)
  // Temporary state — applied only when "Apply" is clicked
  const [tempValues, setTempValues] = useState<Record<string, string>>({})
  const ref = useRef<HTMLDivElement>(null)

  const activeCount = groups.filter(g => g.value !== g.options[0]?.value).length

  // Sync temp values when opening
  const openPanel = () => {
    const initial: Record<string, string> = {}
    groups.forEach(g => { initial[g.label] = g.value })
    setTempValues(initial)
    setOpen(true)
  }

  const apply = () => {
    groups.forEach(g => {
      g.onChange(tempValues[g.label] ?? g.options[0]?.value ?? 'ALL')
    })
    setOpen(false)
  }

  const reset = () => {
    const cleared: Record<string, string> = {}
    groups.forEach(g => { cleared[g.label] = g.options[0]?.value ?? 'ALL' })
    setTempValues(cleared)
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isActive = activeCount > 0

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button — matches conference page pill style */}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={[
          'flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border transition-colors cursor-pointer',
          isActive
            ? 'bg-[#6366f1] text-white border-[#6366f1]'
            : 'border-gray-300 text-gray-600 hover:border-[#6366f1] hover:text-[#6366f1]',
          triggerClassName ?? '',
        ].join(' ')}
      >
        <Filter className="h-4 w-4" />
        Filters
        {isActive && (
          <>
            <span className="bg-white/20 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeCount}
            </span>
            <X
              className="h-3.5 w-3.5 ml-0.5"
              onClick={(e) => {
                e.stopPropagation()
                groups.forEach(g => g.onChange(g.options[0]?.value ?? 'ALL'))
                setOpen(false)
              }}
            />
          </>
        )}
      </button>

      {/* Floating panel */}
      {open && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border w-72 z-50">
          <div className="p-5 space-y-5">
            {groups.map((group, gi) => (
              <div key={group.label}>
                {gi > 0 && <hr className="mb-5" />}
                <h4 className="text-sm font-semibold text-gray-800 mb-3">{group.label}</h4>

                {group.type === 'radio' && (
                  <div className="space-y-2">
                    {group.options.map(opt => (
                      <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name={`fp-${gi}-${group.label}`}
                          checked={tempValues[group.label] === opt.value}
                          onChange={() => setTempValues(p => ({ ...p, [group.label]: opt.value }))}
                          className="w-4 h-4 accent-[#6366f1]"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-[#6366f1] transition-colors">
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {group.type === 'pills' && (
                  <div className="flex flex-wrap gap-2">
                    {group.options.map(opt => {
                      const selected = tempValues[group.label] === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTempValues(p => ({ ...p, [group.label]: opt.value }))}
                          className={[
                            'px-3 py-1.5 text-sm rounded-full border transition-colors cursor-pointer',
                            selected
                              ? 'bg-[#6366f1] text-white border-[#6366f1]'
                              : 'border-gray-300 text-gray-700 hover:border-[#6366f1] hover:text-[#6366f1]',
                          ].join(' ')}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Reset / Apply */}
          <div className="flex gap-3 p-5 pt-0">
            <Button variant="outline" onClick={reset} className="flex-1">Reset</Button>
            <Button onClick={apply} className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5]">Apply</Button>
          </div>
        </div>
      )}
    </div>
  )
}
