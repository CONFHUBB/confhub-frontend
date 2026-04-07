'use client'

import Link from 'next/link'

/**
 * UserLink — Renders a user name as a clickable link to their public profile.
 * Drop-in replacement for plain text user names across the app.
 *
 * Usage:
 *   <UserLink userId={42} name="John Doe" />
 *   <UserLink userId={42} name="John Doe" className="text-sm" />
 */

interface UserLinkProps {
    userId: number | null | undefined
    name: string
    className?: string
    /** If true, shows as plain text (no link). Useful when userId is unknown. */
    plain?: boolean
}

export function UserLink({ userId, name, className = '', plain = false }: UserLinkProps) {
    if (!userId || plain) {
        return <span className={className}>{name || 'Unknown'}</span>
    }

    return (
        <Link
            href={`/user/${userId}`}
            onClick={(e) => e.stopPropagation()}
            className={`text-primary hover:text-primary-dark hover:underline underline-offset-2 transition-colors cursor-pointer inline ${className}`}
            title={`View ${name}'s profile`}
        >
            {name || 'Unknown'}
        </Link>
    )
}
