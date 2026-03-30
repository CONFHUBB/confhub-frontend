'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Legacy redirect — all invitations are now managed at /my-profile/invitations.
 */
export default function ReviewerSelectRedirect() {
    const router = useRouter()
    useEffect(() => { router.replace('/my-profile/invitations') }, [router])
    return (
        <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
        </div>
    )
}
