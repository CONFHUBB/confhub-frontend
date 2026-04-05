'use client'

/**
 * Skeleton Loading Components
 * Replaces <Loader2 animate-spin /> spinners with skeleton placeholders
 * that reduce perceived wait time by 15-20% (UX research)
 */

// ── Base Skeleton Pulse ──────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 ${className}`}
        />
    )
}

// ── Conference Card Skeleton ─────────────────────────────────────────────────
// Used in: conference listing page (grid of 4-8 cards)

export function CardSkeleton() {
    return (
        <div className="h-full flex flex-col rounded-xl overflow-hidden border bg-card shadow-sm">
            {/* Banner image placeholder */}
            <Skeleton className="w-full aspect-[16/9] rounded-none" />

            {/* Card body */}
            <div className="p-4 flex flex-col flex-grow space-y-3">
                {/* Title */}
                <div className="space-y-2">
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-3 w-24" />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                </div>

                {/* Meta info */}
                <div className="mt-auto space-y-2 pt-4">
                    <Skeleton className="h-8 w-full rounded-md" />
                    <Skeleton className="h-8 w-full rounded-md" />
                </div>
            </div>
        </div>
    )
}

// ── Conference Card Grid Skeleton ────────────────────────────────────────────
// Shows 8 card skeletons in a grid (matching the conference listing layout)

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: count }).map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    )
}

// ── Table Skeleton ───────────────────────────────────────────────────────────
// Used in: my-profile/papers, my-profile/tickets, reviewer tables

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="rounded-xl border overflow-hidden bg-white shadow-sm">
            {/* Header */}
            <div className="bg-muted/30 flex items-center gap-4 px-4 py-3 border-b">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className={`h-4 ${i === 0 ? 'w-16' : i === 1 ? 'w-40' : i === cols - 1 ? 'w-20 ml-auto' : 'w-28'}`} />
                ))}
            </div>

            {/* Rows */}
            {Array.from({ length: rows }).map((_, row) => (
                <div key={row} className="flex items-center gap-4 px-4 py-4 border-b last:border-b-0">
                    {Array.from({ length: cols }).map((_, col) => (
                        <Skeleton
                            key={col}
                            className={`h-4 ${col === 0 ? 'w-12' : col === 1 ? 'w-48' : col === cols - 1 ? 'w-16 ml-auto' : 'w-24'}`}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}

// ── Page Header Skeleton ─────────────────────────────────────────────────────
// Used as a header placeholder while page data loads

export function PageHeaderSkeleton() {
    return (
        <div className="space-y-3 mb-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
        </div>
    )
}

// ── Sidebar Skeleton ─────────────────────────────────────────────────────────
// Used for workspace sidebar placeholders

export function SidebarSkeleton({ items = 6 }: { items?: number }) {
    return (
        <div className="space-y-4 p-4">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                </div>
            ))}
        </div>
    )
}
