'use client'

import { useEffect, useState } from 'react'
import { Loader2, History as HistoryIcon, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getActivityAuditLogs } from '@/app/api/conference.api'
import type { ActivityAuditLogDTO } from '@/types/conference'

const ACTION_COLORS: Record<string, string> = {
    ENABLED: 'bg-emerald-100 text-emerald-700',
    DISABLED: 'bg-red-100 text-red-700',
    DEADLINE_CHANGED: 'bg-amber-100 text-amber-700',
}

interface HistoryTabProps {
    paperId: number
    conferenceId: number
}

export function HistoryTab({ paperId, conferenceId }: HistoryTabProps) {
    const [logs, setLogs] = useState<ActivityAuditLogDTO[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            try {
                // Fetch all audit logs for now. 
                // TODO: Replace with dedicated backend endpoint GET /api/v1/conference-activity/{conferenceId}/paper/{paperId}
                const allLogs = await getActivityAuditLogs(conferenceId).catch(() => [])
                // Show all conference activity logs for context (until paper-specific endpoint is ready)
                setLogs(allLogs || [])
            } catch {
                setLogs([])
            }
            setLoading(false)
        }
        fetch()
    }, [paperId, conferenceId])

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

    return (
        <div className="space-y-4">
            <div className="rounded-lg border bg-card p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-4 tracking-wider">
                    Conference Activity History
                </h3>

                {logs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <HistoryIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No activity history available yet.</p>
                        <p className="text-xs mt-1 text-muted-foreground/70">
                            Paper-specific activity tracking will be enabled with a dedicated backend endpoint.
                        </p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
                        <div className="space-y-4 pl-10">
                            {logs.map((log, idx) => (
                                <div key={log.id || idx} className="relative">
                                    {/* Timeline dot */}
                                    <div className="absolute -left-[1.625rem] top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                                    
                                    <div className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">{log.activityLabel}</span>
                                                <Badge className={`text-[10px] shadow-none ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                                                    {log.action}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 ml-4">
                                                <Clock className="h-3 w-3" />
                                                {log.createdAt ? new Date(log.createdAt).toLocaleString('en-US') : '—'}
                                            </div>
                                        </div>
                                        {log.oldValue && log.newValue && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                <span className="line-through text-red-400">{log.oldValue}</span>
                                                {' → '}
                                                <span className="text-emerald-600 font-medium">{log.newValue}</span>
                                            </p>
                                        )}
                                        {log.performedBy && (
                                            <p className="text-xs text-muted-foreground mt-0.5">by {log.performedBy}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
