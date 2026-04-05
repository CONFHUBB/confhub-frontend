'use client'

import { useMemo } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'

/**
 * Sticky Deadline Banner
 * Shows a prominent, color-coded deadline countdown at the top of workspace pages.
 * Color changes as deadline approaches: green → amber → red.
 */

interface DeadlineBannerProps {
    /** The deadline date string (ISO 8601) */
    deadline?: string | null
    /** Label for the deadline (e.g., "Review Submission", "Camera-Ready") */
    label?: string
    /** Additional CSS class */
    className?: string
}

export function DeadlineBanner({ deadline, label = 'Deadline', className = '' }: DeadlineBannerProps) {
    const info = useMemo(() => {
        if (!deadline) return null

        const deadlineDate = new Date(deadline)
        const now = new Date()
        const diffMs = deadlineDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

        if (diffMs < 0) {
            return {
                text: 'Deadline has passed',
                subtext: deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                color: 'bg-gray-50 border-gray-200 text-gray-600',
                iconColor: 'text-gray-400',
                urgent: false,
                passed: true,
            }
        }

        const dateStr = deadlineDate.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })

        if (diffDays <= 1) {
            const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)))
            return {
                text: hours <= 0 ? 'Less than 1 hour left!' : `${hours} hour${hours !== 1 ? 's' : ''} remaining`,
                subtext: dateStr,
                color: 'bg-red-50 border-red-200 text-red-800',
                iconColor: 'text-red-500',
                urgent: true,
                passed: false,
            }
        }

        if (diffDays <= 3) {
            return {
                text: `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`,
                subtext: dateStr,
                color: 'bg-amber-50 border-amber-200 text-amber-800',
                iconColor: 'text-amber-500',
                urgent: true,
                passed: false,
            }
        }

        if (diffDays <= 7) {
            return {
                text: `${diffDays} days remaining`,
                subtext: dateStr,
                color: 'bg-blue-50 border-blue-200 text-blue-800',
                iconColor: 'text-blue-500',
                urgent: false,
                passed: false,
            }
        }

        return {
            text: `${diffDays} days remaining`,
            subtext: dateStr,
            color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            iconColor: 'text-emerald-500',
            urgent: false,
            passed: false,
        }
    }, [deadline])

    if (!info) return null

    const Icon = info.urgent ? AlertTriangle : Clock

    return (
        <div
            className={`sticky top-16 z-30 flex items-center gap-3 px-4 py-2.5 border rounded-lg text-sm font-medium ${info.color} ${className}`}
            role="status"
            aria-live="polite"
        >
            <Icon className={`h-4 w-4 shrink-0 ${info.iconColor} ${info.urgent && !info.passed ? 'animate-pulse' : ''}`} />
            <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-semibold">{label}:</span>
                <span>{info.text}</span>
                <span className="text-xs opacity-70 hidden sm:inline">— {info.subtext}</span>
            </div>
        </div>
    )
}
