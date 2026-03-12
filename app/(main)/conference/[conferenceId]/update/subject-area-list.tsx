"use client"

import { useEffect, useState } from "react"
import { getSubjectAreasByTrack } from "@/app/api/track.api"
import type { SubjectAreaResponse } from "@/types/subject-area"
import { Loader2, BookOpen, Layers } from "lucide-react"

interface SubjectAreaListProps {
    trackId: number
    refreshKey: number
}

export function SubjectAreaList({ trackId, refreshKey }: SubjectAreaListProps) {
    const [subjectAreas, setSubjectAreas] = useState<SubjectAreaResponse[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAreas = async () => {
            if (!trackId) return
            try {
                setLoading(true)
                const data = await getSubjectAreasByTrack(trackId)
                setSubjectAreas(data || [])
            } catch (err) {
                console.error("Failed to load subject areas:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchAreas()
    }, [trackId, refreshKey])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        )
    }

    if (subjectAreas.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center bg-muted/10">
                <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground italic text-sm">No subject areas created for this track yet.</p>
            </div>
        )
    }

    // Organize into a tree structure
    const parents = subjectAreas.filter(sa => sa.parentId === null)
    const getChildren = (parentId: number) => subjectAreas.filter(sa => sa.parentId === parentId)

    return (
        <div className="space-y-4">
            <h3 className="text-base font-semibold ">Existing Subject Areas ({subjectAreas.length})</h3>
            <div className="rounded-lg border divide-y overflow-hidden bg-background">
                {parents.map((parent, index) => (
                    <div key={parent.id} className="flex flex-col bg-muted/10">
                        {/* Parent Row */}
                        <div className="flex flex-col px-4 py-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">{index + 1}</span>
                                <Layers className="h-4 w-4 text-primary" />
                                <p className="font-semibold text-sm">{parent.name}</p>
                            </div>
                            {parent.description && (
                                <p className="text-xs text-muted-foreground mt-1 ml-12">
                                    {parent.description}
                                </p>
                            )}
                        </div>

                        {/* Children Rows */}
                        {getChildren(parent.id).map((child, childIndex) => (
                            <div key={child.id} className="flex flex-col px-4 py-2 hover:bg-muted/30 transition-colors bg-background border-t border-muted/50">
                                <div className="flex items-center gap-3 ml-12">
                                    <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">{index + 1}.{childIndex + 1}</span>
                                    <p className="font-medium text-sm text-foreground/80">{child.name}</p>
                                </div>
                                {child.description && (
                                    <p className="text-xs text-muted-foreground mt-1 ml-[5.25rem]">
                                        {child.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ))}

                {/* Render any orphaned children just in case backend data is malformed */}
                {subjectAreas.filter(sa => sa.parentId !== null && !parents.find(p => p.id === sa.parentId)).map((orphan, index) => (
                    <div key={orphan.id} className="flex flex-col px-4 py-3 hover:bg-muted/30 transition-colors bg-destructive/5">
                        <div className="flex items-center gap-3 text-destructive/80">
                            <span className="text-xs font-mono w-6 shrink-0">!</span>
                            <p className="font-medium text-sm">{orphan.name} (Orphaned)</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
