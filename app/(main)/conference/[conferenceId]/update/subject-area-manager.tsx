"use client"

import { useEffect, useState, useCallback } from "react"
import { getTracksByConference, getSubjectAreasByTrack } from "@/app/api/track.api"
import { createSubjectArea } from "@/app/api/subject-area.api"
import type { TrackResponse } from "@/types/track"
import type { SubjectAreaResponse } from "@/types/subject-area"
import { Select } from "antd"
import { Select as AntdSelect } from "antd"
import {
    Loader2,
    Plus,
    FileSpreadsheet,
    BookOpen,
    UserPlus,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import toast from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ExcelImport } from "@/components/excel-import"
import { downloadSubjectAreaTemplate, previewSubjectAreaImport, importSubjectAreas } from "@/app/api/conference.api"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface SubjectAreaManagerProps {
    conferenceId: number
}

type AddTab = 'manage' | 'import'

const PAGE_SIZE = 10

export function SubjectAreaManager({ conferenceId }: SubjectAreaManagerProps) {
    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null)
    const [subjectAreas, setSubjectAreas] = useState<SubjectAreaResponse[]>([])

    const [loadingTracks, setLoadingTracks] = useState(true)
    const [loadingAreas, setLoadingAreas] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [areaRefreshKey, setAreaRefreshKey] = useState(0)
    const [activeTab, setActiveTab] = useState<AddTab>('manage')
    const [currentPage, setCurrentPage] = useState(0)

    // Single-add form state
    const [newName, setNewName] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [newParentId, setNewParentId] = useState<number | null>(null)
    const [nameError, setNameError] = useState('')

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

    const fetchAreas = useCallback(async (trackId: number) => {
        try {
            setLoadingAreas(true)
            const data = await getSubjectAreasByTrack(trackId)
            setSubjectAreas(data || [])
            setCurrentPage(0)
        } catch (err) {
            console.error("Failed to load subject areas:", err)
            toast.error("Failed to load subject areas")
            setSubjectAreas([])
        } finally {
            setLoadingAreas(false)
        }
    }, [])

    useEffect(() => {
        if (!selectedTrackId) return
        fetchAreas(selectedTrackId)
    }, [selectedTrackId, areaRefreshKey, fetchAreas])

    const handleAddSingle = async () => {
        if (!newName.trim()) {
            setNameError('Subject Area name is required.')
            return
        }
        if (!selectedTrackId) return
        setIsSaving(true)
        try {
            await createSubjectArea({
                trackId: selectedTrackId,
                name: newName.trim(),
                description: newDesc.trim(),
                parentId: newParentId,
            })
            toast.success('Subject Area created!')
            setNewName('')
            setNewDesc('')
            setNewParentId(null)
            setNameError('')
            setAreaRefreshKey(prev => prev + 1)
        } catch (err) {
            console.error('Failed to create subject area:', err)
            toast.error('Failed to create subject area.')
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

    // Pagination for the table
    const totalElements = subjectAreas.length
    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))
    const parents = subjectAreas.filter(sa => sa.parentId === null)
    const getChildren = (parentId: number) => subjectAreas.filter(sa => sa.parentId === parentId)

    // Flatten for pagination: parent row + its children as sub-rows
    const flatRows: { area: SubjectAreaResponse; isChild: boolean; parentIndex: number; childIndex?: number }[] = []
    parents.forEach((parent, pIdx) => {
        flatRows.push({ area: parent, isChild: false, parentIndex: pIdx })
        getChildren(parent.id).forEach((child, cIdx) => {
            flatRows.push({ area: child, isChild: true, parentIndex: pIdx, childIndex: cIdx })
        })
    })
    // Also add orphans
    const orphans = subjectAreas.filter(sa => sa.parentId !== null && !parents.find(p => p.id === sa.parentId))
    orphans.forEach((orphan) => {
        flatRows.push({ area: orphan, isChild: false, parentIndex: -1 })
    })

    const paginatedRows = flatRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

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

            {/* ── Tabbed Add Section ──────────────── */}
            {selectedTrackId && (
                <div className="rounded-xl border bg-card overflow-hidden relative">
                    {isSaving && (
                        <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center rounded-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}

                    {/* Section heading */}
                    <div className="px-6 pt-5 pb-3">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                            <Plus className="h-4 w-4 text-primary" />
                            Add Subject Areas
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Add or edit subject areas manually, or bulk import from an Excel file.
                        </p>
                    </div>

                    {/* Tab buttons */}
                    <div className="flex gap-1 border-b pb-0 px-6">
                        <button
                            onClick={() => setActiveTab('manage')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                activeTab === 'manage'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                            }`}
                        >
                            <UserPlus className="h-4 w-4" />
                            Add Manually
                        </button>
                        <button
                            onClick={() => setActiveTab('import')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                activeTab === 'import'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                            }`}
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Import Excel
                        </button>
                    </div>

                    {/* Tab content */}
                    <div className="p-6">
                        {activeTab === 'manage' && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Fill in the details below to create a new subject area.
                                </p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">
                                            Name <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            placeholder="e.g. Machine Learning"
                                            className="h-10"
                                            value={newName}
                                            onChange={(e) => { setNewName(e.target.value); setNameError('') }}
                                        />
                                        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Parent (optional)</label>
                                        <AntdSelect
                                            className="w-full h-10"
                                            placeholder="None (root level)"
                                            allowClear
                                            value={newParentId ?? undefined}
                                            onChange={(val) => setNewParentId(val === 0 ? null : (val ?? null))}
                                            options={[
                                                { label: '— None (root level)', value: 0 },
                                                ...subjectAreas.filter(sa => sa.parentId === null).map(sa => ({
                                                    label: sa.name,
                                                    value: sa.id,
                                                }))
                                            ]}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Description</label>
                                    <Textarea
                                        className="min-h-[80px]"
                                        placeholder="Describe the scope of this subject area..."
                                        rows={3}
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button size="sm" className="px-6" onClick={handleAddSingle} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                                        Save Subject Area
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'import' && (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Upload an Excel file to batch-create subject areas. Include the <strong>trackName</strong> column to import for multiple tracks at once.
                                </p>
                                <ExcelImport
                                    entityName="Subject Area"
                                    previewHeaders={["trackName", "name", "description", "parentName"]}
                                    onDownloadTemplate={() => downloadSubjectAreaTemplate(conferenceId)}
                                    onPreview={(file) => previewSubjectAreaImport(conferenceId, file)}
                                    onImport={(file) => importSubjectAreas(conferenceId, file)}
                                    onImportSuccess={() => {
                                        setAreaRefreshKey(prev => prev + 1)
                                        if (selectedTrackId) fetchAreas(selectedTrackId)
                                    }}
                                    templateFilename="subject_area_template.xlsx"
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Subject Areas Table ──────────────── */}
            {selectedTrackId && (
                <div className="rounded-xl border bg-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            Subject Areas
                            {!loadingAreas && (
                                <span className="text-xs font-normal text-muted-foreground">
                                    ({totalElements})
                                </span>
                            )}
                        </h3>
                    </div>

                    {loadingAreas ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : subjectAreas.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                            No subject areas created for this track yet.
                        </div>
                    ) : (
                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="w-16 text-center">#</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="w-24 text-center">Type</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRows.map((row) => (
                                        <TableRow key={row.area.id} className={row.isChild ? "bg-muted/10" : ""}>
                                            <TableCell className="text-center text-xs text-muted-foreground font-medium">
                                                {row.isChild
                                                    ? `${row.parentIndex + 1}.${(row.childIndex ?? 0) + 1}`
                                                    : row.parentIndex >= 0 ? row.parentIndex + 1 : '!'
                                                }
                                            </TableCell>
                                            <TableCell>
                                                <p className={`text-sm ${row.isChild ? 'pl-6 text-foreground/80' : 'font-medium'}`}>
                                                    {row.isChild && <span className="text-muted-foreground mr-1">└</span>}
                                                    {row.area.name}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm text-muted-foreground truncate max-w-md">
                                                    {row.area.description || "—"}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`inline-flex items-center text-[10px] font-medium rounded-full px-2 py-0.5 ${
                                                    row.isChild
                                                        ? 'text-blue-700 bg-blue-50 border border-blue-200'
                                                        : 'text-purple-700 bg-purple-50 border border-purple-200'
                                                }`}>
                                                    {row.isChild ? 'Sub' : 'Primary'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t">
                            <p className="text-xs text-muted-foreground">
                                Page {currentPage + 1} of {totalPages} · {totalElements} subject areas
                            </p>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 0}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage >= totalPages - 1}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
