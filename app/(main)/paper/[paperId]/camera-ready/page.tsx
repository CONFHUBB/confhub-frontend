'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPaperById } from '@/app/api/paper.api'
import { Loader2 } from 'lucide-react'

/**
 * Wrapper that resolves conferenceId from the paper, then renders
 * the full Camera-Ready wizard living under /conference/[conferenceId]/paper/[paperId]/camera-ready.
 * This keeps authors on the /paper/{id} route family.
 */
export default function PaperCameraReadyRedirect() {
    const params = useParams()
    const router = useRouter()
    const paperId = Number(params.paperId)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!paperId) return
        getPaperById(paperId)
            .then(paper => {
                const confId = paper.conferenceId || paper.track?.conference?.id
                if (confId) {
                    router.replace(`/conference/${confId}/paper/${paperId}/camera-ready`)
                } else {
                    router.back()
                }
            })
            .catch(() => router.back())
            .finally(() => setLoading(false))
    }, [paperId, router])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }
    return null
}
