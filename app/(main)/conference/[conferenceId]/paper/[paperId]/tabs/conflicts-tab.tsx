'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trash2, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getConflictsByPaper, deletePaperConflict } from '@/app/api/conflict.api'
import type { PaperConflictResponse } from '@/types/conflict'
import { CONFLICT_TYPE_LABELS } from '@/types/conflict'
import toast from 'react-hot-toast'

interface ConflictsTabProps {
    paperId: number
    conferenceId: number
    isChair: boolean
}

export function ConflictsTab({ paperId, conferenceId, isChair }: ConflictsTabProps) {
    const [conflicts, setConflicts] = useState<PaperConflictResponse[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const data = await getConflictsByPaper(paperId).catch(() => [])
            setConflicts(data || [])
            setLoading(false)
        }
        fetch()
    }, [paperId])

    const handleDelete = async (id: number) => {
        if (!confirm('Remove this conflict declaration?')) return
        try {
            await deletePaperConflict(id)
            setConflicts(prev => prev.filter(c => c.id !== id))
            toast.success('Conflict removed')
        } catch {
            toast.error('Failed to remove conflict')
        }
    }

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

    return (
        <div className="space-y-4">
            <div className="rounded-lg border bg-card p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-4 tracking-wider">
                    Conflicts ({conflicts.length})
                </h3>
                {conflicts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No conflicts declared for this paper.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {conflicts.map(c => (
                            <div key={c.id} className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                                        <Shield className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{c.user?.firstName} {c.user?.lastName}</p>
                                        <p className="text-xs text-muted-foreground">{c.user?.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-300">
                                        {CONFLICT_TYPE_LABELS[c.conflictType] || c.conflictType}
                                    </Badge>
                                    {isChair && (
                                        <Button
                                            variant="ghost" size="sm"
                                            className="text-destructive hover:text-destructive h-8"
                                            onClick={() => handleDelete(c.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
