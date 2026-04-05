'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

/**
 * Smart Breadcrumb Navigation
 * Auto-generates breadcrumb trail from pathname + optional overrides.
 * Only renders when depth ≥ 3 (e.g., /conference/123/reviewer).
 */

interface BreadcrumbItem {
    label: string
    href?: string
}

interface BreadcrumbProps {
    /** Override the auto-generated items. If provided, these are used directly. */
    items?: BreadcrumbItem[]
    /** Optionally add conference name for nicer display */
    conferenceName?: string
    /** Custom class for the container */
    className?: string
}

export function Breadcrumb({ items, conferenceName, className = '' }: BreadcrumbProps) {
    if (!items || items.length < 2) return null

    return (
        <nav
            aria-label="Breadcrumb"
            className={`flex items-center gap-1.5 text-sm text-muted-foreground mb-4 ${className}`}
        >
            <Link
                href="/"
                className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
                aria-label="Home"
            >
                <Home className="h-3.5 w-3.5" />
            </Link>

            {items.map((item, index) => {
                const isLast = index === items.length - 1
                return (
                    <span key={index} className="flex items-center gap-1.5 min-w-0">
                        <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        {isLast || !item.href ? (
                            <span
                                className={`truncate ${isLast ? 'text-foreground font-medium' : ''}`}
                                aria-current={isLast ? 'page' : undefined}
                            >
                                {item.label}
                            </span>
                        ) : (
                            <Link
                                href={item.href}
                                className="truncate hover:text-foreground transition-colors"
                            >
                                {item.label}
                            </Link>
                        )}
                    </span>
                )
            })}
        </nav>
    )
}
