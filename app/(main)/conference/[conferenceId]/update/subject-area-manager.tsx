"use client"

import { useEffect, useState } from "react"
import { getTracksByConference, getSubjectAreasByTrack } from "@/app/api/track.api"
import { createSubjectArea, updateSubjectArea, deleteSubjectArea } from "@/app/api/subject-area.api"
import type { TrackResponse } from "@/types/track"
import type { SubjectAreaResponse } from "@/types/subject-area"
import type { SubjectAreaData } from "@/types/conference-form"
import { Select } from "antd"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { AddSubjectArea } from "./add-subject-area"
import { SubjectAreaList } from "./subject-area-list"

interface SubjectAreaManagerProps {
    conferenceId: number
}

export function SubjectAreaManager({ conferenceId }: SubjectAreaManagerProps) {
    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null)
    const [subjectAreas, setSubjectAreas] = useState<SubjectAreaResponse[]>([])
    
    const [loadingTracks, setLoadingTracks] = useState(true)
    const [loadingAreas, setLoadingAreas] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [areaRefreshKey, setAreaRefreshKey] = useState(0)

    useEffect(() => {
        const fetchTracks = async () => {
            try {
                setLoadingTracks(true)
                const data = await getTracksByConference(conferenceId)
                setTracks(data)
                if (data.length > 0) {
                    setSelectedTrackId(data[0].id)
                }
            } catch (err) {
                console.error("Failed to load tracks:", err)
                toast.error("Failed to load tracks")
            } finally {
                setLoadingTracks(false)
            }
        }
        fetchTracks()
    }, [conferenceId])

    const fetchAreas = async (trackId: number) => {
        try {
            setLoadingAreas(true)
            const data = await getSubjectAreasByTrack(trackId)
            setSubjectAreas(data || [])
        } catch (err) {
            console.error("Failed to load subject areas:", err)
            toast.error("Failed to load subject areas")
            setSubjectAreas([])
        } finally {
            setLoadingAreas(false)
        }
    }

    useEffect(() => {
        if (!selectedTrackId) return
        fetchAreas(selectedTrackId)
    }, [selectedTrackId])

    const handleSaveAreas = async (submittedAreas: SubjectAreaData[]) => {
        if (!selectedTrackId) return
        setIsSaving(true)
        
        try {
            // Find which ones to delete
            const deletes = []
            // First pass: Delete children first to prevent constraint violations
            for (const existingArea of subjectAreas) {
                if (existingArea.parentId !== null) {
                    const stillExists = submittedAreas.find(sa => sa.id === existingArea.id)
                    if (!stillExists) {
                        deletes.push(deleteSubjectArea(existingArea.id))
                    }
                }
            }

            // Execute child deletes
            if (deletes.length > 0) {
                await Promise.all(deletes)
                deletes.length = 0 // Clear array
            }
            
            // Second pass: Delete parents
            for (const existingArea of subjectAreas) {
                if (existingArea.parentId === null) {
                    const stillExists = submittedAreas.find(sa => sa.id === existingArea.id)
                    if (!stillExists) {
                        deletes.push(deleteSubjectArea(existingArea.id))
                    }
                }
            }
            
            // Execute parent deletes
            if (deletes.length > 0) {
                await Promise.all(deletes)
            }
            
            // Now, separate parent and child creations/updates
            const idMapping = new Map<number, number>()
            const parents = submittedAreas.filter(sa => sa.parentId === null)
            const children = submittedAreas.filter(sa => sa.parentId !== null)
            
            // Process parents first
            for (const sa of parents) {
                if (sa.id < 0) {
                    const result = await createSubjectArea({ trackId: selectedTrackId, name: sa.name, description: sa.description || "", parentId: null })
                    idMapping.set(sa.id, result.id)
                } else {
                    await updateSubjectArea({ id: sa.id, trackId: selectedTrackId, name: sa.name, description: sa.description || "", parentId: null })
                }
            }
            
            // Then process children
            for (const sa of children) {
                let resolvedParentId = sa.parentId;
                if (resolvedParentId && resolvedParentId < 0 && idMapping.has(resolvedParentId)) {
                    resolvedParentId = idMapping.get(resolvedParentId)!
                }
                
                if (sa.id < 0) {
                    await createSubjectArea({ trackId: selectedTrackId, name: sa.name, description: sa.description || "", parentId: resolvedParentId })
                } else {
                    await updateSubjectArea({ id: sa.id, trackId: selectedTrackId, name: sa.name, description: sa.description || "", parentId: resolvedParentId })
                }
            }
            toast.success("Subject Areas saved successfully!")
            
            // Refresh to get actual full objects from backend and update list
            setAreaRefreshKey(prev => prev + 1)
            await fetchAreas(selectedTrackId)
        } catch (err) {
            console.error("Failed to save subject areas:", err)
            toast.error("Failed to save some subject areas. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    if (loadingTracks) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (tracks.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
                <p className="text-muted-foreground text-lg mb-2">No tracks found.</p>
                <p className="text-sm text-muted-foreground">Please add a track in 'Config Tracks' first.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 relative">
            {/* Header / Track Selector */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
                <div className="flex-1 max-w-sm">
                    <h3 className="text-sm font-semibold mb-2">Select Track</h3>
                    <Select
                        className="w-full h-10"
                        placeholder="Select a track"
                        value={selectedTrackId ?? undefined}
                        onChange={(val) => setSelectedTrackId(val)}
                        options={tracks.map((t) => ({ label: t.name, value: t.id }))}
                    />
                </div>
            </div>

            {/* Main Content */}
            {loadingAreas ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="relative">
                    {/* Dim the form if it is saving */}
                    {isSaving && (
                        <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center rounded-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    
                    {/* Main Management Section */}
                    {selectedTrackId && (
                        <div className="space-y-12">
                            {/* 1. Existing Areas List (Display) */}
                            <SubjectAreaList trackId={selectedTrackId} refreshKey={areaRefreshKey} />
                            
                            {/* 2. Management Form (Edit/Add/Delete) */}
                            <div className="border-t pt-8">
                                <h3 className="text-lg font-semibold mb-4 text-foreground/80">Manage Subject Areas</h3>
                                <AddSubjectArea 
                                    key={`track-${selectedTrackId}-${areaRefreshKey}-${subjectAreas.length}`}
                                    initialSubjectAreas={(subjectAreas || []).map(sa => ({ id: sa.id, name: sa.name, description: sa.description, parentId: sa.parentId }))} 
                                    onSubmit={handleSaveAreas} 
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
