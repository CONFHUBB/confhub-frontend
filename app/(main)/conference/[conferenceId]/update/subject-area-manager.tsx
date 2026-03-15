"use client"

import { useEffect, useState } from "react"
import { getTracksByConference, getSubjectAreasByTrack } from "@/app/api/track.api"
import { createSubjectArea, updateSubjectArea, deleteSubjectArea } from "@/app/api/subject-area.api"
import type { TrackResponse } from "@/types/track"
import type { SubjectAreaResponse } from "@/types/subject-area"
import type { SubjectAreaData } from "@/types/conference-form"
import { Select } from "antd"
import { Loader2, Plus, Upload, FolderTree } from "lucide-react"
import toast from "react-hot-toast"
import { AddSubjectArea } from "./add-subject-area"
import { SubjectAreaList } from "./subject-area-list"
import { Button } from "@/components/ui/button"
import { ExcelImport } from "@/components/excel-import"
import { downloadSubjectAreaTemplate, previewSubjectAreaImport, importSubjectAreas } from "@/app/api/conference.api"

interface SubjectAreaManagerProps {
    conferenceId: number
}

type ActivePanel = null | 'manage' | 'import'

export function SubjectAreaManager({ conferenceId }: SubjectAreaManagerProps) {
    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null)
    const [subjectAreas, setSubjectAreas] = useState<SubjectAreaResponse[]>([])
    
    const [loadingTracks, setLoadingTracks] = useState(true)
    const [loadingAreas, setLoadingAreas] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [areaRefreshKey, setAreaRefreshKey] = useState(0)
    const [activePanel, setActivePanel] = useState<ActivePanel>(null)

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
            setActivePanel(null)
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
                <p className="text-sm text-muted-foreground">Please add a track in &apos;Config Tracks&apos; first.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Track Selector */}
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

            {/* Subject Areas List */}
            {loadingAreas ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : selectedTrackId && (
                <div className="relative">
                    {isSaving && (
                        <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center rounded-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    <SubjectAreaList trackId={selectedTrackId} refreshKey={areaRefreshKey} />
                </div>
            )}

            {/* Action Buttons */}
            {selectedTrackId && (
                <div className="space-y-4 border-t pt-6">
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant={activePanel === 'manage' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setActivePanel(activePanel === 'manage' ? null : 'manage')}
                        >
                            <Plus className="mr-1.5 h-4 w-4" />
                            {activePanel === 'manage' ? "Cancel" : "Add / Edit Subject Areas"}
                        </Button>
                        <Button
                            type="button"
                            variant={activePanel === 'import' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setActivePanel(activePanel === 'import' ? null : 'import')}
                        >
                            <Upload className="mr-1.5 h-4 w-4" />
                            {activePanel === 'import' ? "Cancel" : "Import from Excel"}
                        </Button>
                    </div>

                    {/* Manage Panel */}
                    {activePanel === 'manage' && (
                        <div className="rounded-lg border bg-white p-5">
                            <h3 className="font-semibold text-gray-900 mb-4">Manage Subject Areas</h3>
                            <AddSubjectArea 
                                key={`track-${selectedTrackId}-${areaRefreshKey}-${subjectAreas.length}`}
                                initialSubjectAreas={(subjectAreas || []).map(sa => ({ id: sa.id, name: sa.name, description: sa.description, parentId: sa.parentId }))} 
                                onSubmit={handleSaveAreas} 
                            />
                        </div>
                    )}

                    {/* Import Panel */}
                    {activePanel === 'import' && (
                        <div className="rounded-lg border bg-white p-5 space-y-3">
                            <h3 className="font-semibold text-gray-900">Import Subject Areas from Excel</h3>
                            <p className="text-sm text-gray-500">
                                Upload an Excel file to batch-create subject areas for the selected track.
                            </p>
                            <ExcelImport
                                entityName="Subject Area"
                                previewHeaders={["name", "description", "parentName"]}
                                onDownloadTemplate={downloadSubjectAreaTemplate}
                                onPreview={previewSubjectAreaImport}
                                onImport={(file) => importSubjectAreas(selectedTrackId, file)}
                                onImportSuccess={() => {
                                    setAreaRefreshKey(prev => prev + 1)
                                    fetchAreas(selectedTrackId)
                                }}
                                templateFilename="subject_area_template.xlsx"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
