'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trash2, Shield, Plus, AlertCircle, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getConflictsByPaper, deletePaperConflict, createPaperConflict } from '@/app/api/conflict.api'
import type { PaperConflictResponse, ConflictType } from '@/types/conflict'
import { CONFLICT_TYPE_LABELS } from '@/types/conflict'
import { useTrackSettings } from '@/hooks/useTrackSettings'
import { toast } from 'sonner'

interface ConflictsTabProps {
    paperId: number
    conferenceId: number
    isChair: boolean
    isAuthor?: boolean
}

export function ConflictsTab({ paperId, conferenceId, isChair, isAuthor }: ConflictsTabProps) {
    const [conflicts, setConflicts] = useState<PaperConflictResponse[]>([])
    const [loading, setLoading] = useState(true)
    const { settings } = useTrackSettings(conferenceId)

    // Author COI Declaration form state
    const [showDeclareForm, setShowDeclareForm] = useState(false)
    const [declareUserId, setDeclareUserId] = useState('')
    const [declareType, setDeclareType] = useState<ConflictType>('PERSONAL')
    const [declaring, setDeclaring] = useState(false)

    const canAuthorDeclare = isAuthor && settings.allowAuthorConfigureConflict

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

    const handleDeclare = async () => {
        const userId = parseInt(declareUserId)
        if (!userId || isNaN(userId)) {
            toast.error('Please enter a valid Reviewer User ID')
            return
        }
        setDeclaring(true)
        try {
            const newConflict = await createPaperConflict({
                paperId,
                userId,
                conflictType: declareType,
            })
            setConflicts(prev => [...prev, newConflict])
            setDeclareUserId('')
            setDeclareType('PERSONAL')
            setShowDeclareForm(false)
            toast.success('Conflict of interest declared successfully')
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to declare conflict')
        } finally {
            setDeclaring(false)
        }
    }

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

    return (
        <div className="space-y-4">
            <div className="rounded-lg border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Conflicts ({conflicts.length})
                    </h3>
                    {canAuthorDeclare && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => setShowDeclareForm(!showDeclareForm)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Declare COI
                        </Button>
                    )}
                </div>

                {/* Author COI Declaration Form */}
                {canAuthorDeclare && showDeclareForm && (
                    <Card className="mb-4 border-amber-200 bg-amber-50/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Shield className="h-4 w-4 text-amber-600" />
                                Declare Conflict of Interest
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Reviewer User ID</label>
                                <Input
                                    type="number"
                                    placeholder="Enter the reviewer's user ID"
                                    value={declareUserId}
                                    onChange={e => setDeclareUserId(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Conflict Type</label>
                                <select
                                    value={declareType}
                                    onChange={e => setDeclareType(e.target.value as ConflictType)}
                                    className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {Object.entries(CONFLICT_TYPE_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <Button size="sm" onClick={handleDeclare} disabled={declaring} className="gap-1.5">
                                    {declaring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                    Submit Declaration
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setShowDeclareForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Info banner when author COI is disabled */}
                {isAuthor && !settings.allowAuthorConfigureConflict && (
                    <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        Author conflict-of-interest declaration is not enabled for this track. Contact the Chair if you need to report a conflict.
                    </div>
                )}

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
                                    {(isChair || canAuthorDeclare) && (
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
