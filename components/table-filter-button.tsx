'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface FilterOption {
    value: string
    label: string
}

export interface FilterSection {
    key: string
    title: string
    /** 'pills' = tag buttons; 'radio' = radio list */
    type: 'pills' | 'radio'
    options: FilterOption[]
}

interface TableFilterButtonProps {
    sections: FilterSection[]
    values: Record<string, string>
    onChange: (values: Record<string, string>) => void
    className?: string
}

/**
 * A reusable "Filters" dropdown button matching the design of the
 * conference-list filter bar. Uses position:fixed so it is never
 * clipped by overflow-y:auto/scroll parent containers.
 */
export function TableFilterButton({ sections, values, onChange, className }: TableFilterButtonProps) {
    const [open, setOpen] = useState(false)
    const [temp, setTemp] = useState<Record<string, string>>(values)
    const [popoverStyle, setPopoverStyle] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
    const buttonRef = useRef<HTMLButtonElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)

    const handleOpen = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setPopoverStyle({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            })
        }
        setTemp({ ...values })
        setOpen(true)
    }

    // Close on outside click
    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (
                (buttonRef.current && buttonRef.current.contains(e.target as Node)) ||
                (popoverRef.current && popoverRef.current.contains(e.target as Node))
            ) return
            setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    // Reposition on scroll/resize while open
    const reposition = useCallback(() => {
        if (!open || !buttonRef.current) return
        const rect = buttonRef.current.getBoundingClientRect()
        setPopoverStyle({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }, [open])

    useEffect(() => {
        if (!open) return
        window.addEventListener('scroll', reposition, true)
        window.addEventListener('resize', reposition)
        return () => {
            window.removeEventListener('scroll', reposition, true)
            window.removeEventListener('resize', reposition)
        }
    }, [open, reposition])

    const activeCount = sections.filter(s => {
        const v = values[s.key]
        return v && v !== 'all' && v !== 'ALL'
    }).length

    const handleApply = () => {
        onChange(temp)
        setOpen(false)
    }

    const handleReset = () => {
        const reset: Record<string, string> = {}
        sections.forEach(s => { reset[s.key] = 'all' })
        setTemp(reset)
    }

    const handleClearAll = (e: React.MouseEvent) => {
        e.stopPropagation()
        const reset: Record<string, string> = {}
        sections.forEach(s => { reset[s.key] = 'all' })
        onChange(reset)
        setOpen(false)
    }

    return (
        <>
            {/* Trigger */}
            <button
                ref={buttonRef}
                onClick={open ? () => setOpen(false) : handleOpen}
                className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border transition-colors cursor-pointer ${
                    activeCount > 0
                        ? 'bg-[#6366f1] text-white border-[#6366f1]'
                        : 'border-gray-300 text-gray-600 hover:border-[#6366f1] hover:text-[#6366f1]'
                }${className ? ` ${className}` : ''}`}
            >
                <Filter className="h-4 w-4" />
                Filters
                {activeCount > 0 && (
                    <>
                        <span className="bg-white/20 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {activeCount}
                        </span>
                        <X className="h-3.5 w-3.5 ml-0.5" onClick={handleClearAll} />
                    </>
                )}
            </button>

            {/* Popover — position:fixed so it is never clipped by overflow containers */}
            {open && (
                <div
                    ref={popoverRef}
                    style={{ position: 'fixed', top: popoverStyle.top, right: popoverStyle.right, zIndex: 9999 }}
                    className="bg-white rounded-xl shadow-2xl border w-[360px]"
                >
                    <div className="p-5 space-y-5">
                        {sections.map((section, idx) => (
                            <div key={section.key}>
                                {idx > 0 && <hr className="mb-5" />}
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">{section.title}</h4>

                                {section.type === 'radio' ? (
                                    <div className="space-y-2">
                                        {section.options.map(opt => (
                                            <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name={section.key}
                                                    checked={(temp[section.key] ?? 'all') === opt.value}
                                                    onChange={() => setTemp(prev => ({ ...prev, [section.key]: opt.value }))}
                                                    className="w-4 h-4 accent-[#6366f1]"
                                                />
                                                <span className="text-sm text-gray-700 group-hover:text-[#6366f1] transition-colors">
                                                    {opt.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {section.options.map(opt => {
                                            const active = (temp[section.key] ?? 'all') === opt.value
                                            return (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setTemp(prev => ({ ...prev, [section.key]: opt.value }))}
                                                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors cursor-pointer ${
                                                        active
                                                            ? 'bg-[#6366f1] text-white border-[#6366f1]'
                                                            : 'border-gray-300 text-gray-700 hover:border-[#6366f1] hover:text-[#6366f1]'
                                                    }`}
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

                    {/* Footer */}
                    <div className="flex gap-3 px-5 pb-5">
                        <Button variant="outline" onClick={handleReset} className="flex-1">Reset</Button>
                        <Button onClick={handleApply} className="flex-1">Apply</Button>
                    </div>
                </div>
            )}
        </>
    )
}
