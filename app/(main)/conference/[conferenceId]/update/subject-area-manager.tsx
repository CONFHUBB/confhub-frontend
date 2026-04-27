"use client"

import { useEffect, useState, useCallback } from "react"
import { getTracksByConference, getSubjectAreasByTrack } from "@/app/api/track.api"
import { createSubjectArea, updateSubjectArea, deleteSubjectArea } from "@/app/api/subject-area.api"
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
    Pencil,
    Trash2,
    Check,
    X,
} from "lucide-react"
import { StandardPagination } from "@/components/ui/standard-pagination"
import { toast } from 'sonner'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { V } from "@/lib/validation"
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface SubjectAreaManagerProps {
    conferenceId: number
    isReadOnly?: boolean
}

type AddTab = 'manage' | 'import'

const PAGE_SIZE = 10

export function SubjectAreaManager({ conferenceId, isReadOnly = false }: SubjectAreaManagerProps) {
    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null)
    // allSubjectAreas: subject areas across ALL tracks (for the table)
    const [allSubjectAreas, setAllSubjectAreas] = useState<SubjectAreaResponse[]>([])
    // currentTrackAreas: subject areas for the currently selected track (for parent dropdown & duplicate check)
    const [currentTrackAreas, setCurrentTrackAreas] = useState<SubjectAreaResponse[]>([])

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

    // Inline edit state
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [editDesc, setEditDesc] = useState('')
    const [editSaving, setEditSaving] = useState(false)

    // Delete dialog state
    const [deleteTarget, setDeleteTarget] = useState<SubjectAreaResponse | null>(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        const fetchTracks = async () => {
            try {
                setLoadingTracks(true)
                const data = await getTracksByConference(conferenceId)
                setTracks(data)
            } catch (err) {
                console.error("Failed to load tracks:", err)
                toast.error("Failed to load tracks")
            } finally {
                setLoadingTracks(false)
            }
        }
        fetchTracks()
    }, [conferenceId])

    // Fetch ALL subject areas across all tracks for the table display
    const fetchAllAreas = useCallback(async () => {
        if (tracks.length === 0) return
        try {
            setLoadingAreas(true)
            const allAreas: SubjectAreaResponse[] = []
            for (const track of tracks) {
                const data = await getSubjectAreasByTrack(track.id)
                allAreas.push(...(data || []))
            }
            setAllSubjectAreas(allAreas)
            setCurrentPage(0)
        } catch (err) {
            console.error("Failed to load subject areas:", err)
            toast.error("Failed to load subject areas")
            setAllSubjectAreas([])
        } finally {
            setLoadingAreas(false)
        }
    }, [tracks])

    useEffect(() => {
        fetchAllAreas()
    }, [fetchAllAreas, areaRefreshKey])

    // When selectedTrackId changes, update the current track areas for parent dropdown
    useEffect(() => {
        if (!selectedTrackId) {
            setCurrentTrackAreas([])
            return
        }
        setCurrentTrackAreas(allSubjectAreas.filter(sa => sa.trackId === selectedTrackId))
    }, [selectedTrackId, allSubjectAreas])

    const handleAddSingle = async () => {
        if (!selectedTrackId) {
            toast.error('Please select a track first.')
            return
        }
        if (!newName.trim()) {
            setNameError('Subject Area name is required.')
            return
        }
        const nameErr = V.maxLen(newName, 200)
        if (nameErr) {
            setNameError(nameErr)
            return
        }
        // Duplicate name check within the same track
        const trimmedName = newName.trim().toLowerCase()
        const duplicate = currentTrackAreas.find(
            sa => sa.name.trim().toLowerCase() === trimmedName
        )
        if (duplicate) {
            setNameError(`A subject area named "${newName.trim()}" already exists in this track.`)
            return
        }
        const descErr = V.maxLen(newDesc, 2000)
        if (descErr) {
            toast.error(descErr)
            return
        }
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

    // ── Inline Edit ──
    const startEdit = (sa: SubjectAreaResponse) => {
        setEditingId(sa.id)
        setEditName(sa.name)
        setEditDesc(sa.description || '')
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditName('')
        setEditDesc('')
    }

    const handleSaveEdit = async () => {
        if (!editingId) return
        if (!editName.trim()) {
            toast.error('Subject area name is required.')
            return
        }

        const editingArea = allSubjectAreas.find(sa => sa.id === editingId)
        if (!editingArea) return

        // Duplicate check within same track
        const duplicate = allSubjectAreas.find(
            sa => sa.id !== editingId &&
                sa.trackId === editingArea.trackId &&
                sa.name.trim().toLowerCase() === editName.trim().toLowerCase()
        )
        if (duplicate) {
            toast.error(`A subject area named "${editName.trim()}" already exists in this track.`)
            return
        }

        try {
            setEditSaving(true)
            await updateSubjectArea({
                id: editingId,
                trackId: editingArea.trackId,
                name: editName.trim(),
                description: editDesc.trim(),
                parentId: editingArea.parentId,
            })
            toast.success('Subject area updated!')
            setEditingId(null)
            setAreaRefreshKey(prev => prev + 1)
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update subject area')
        } finally {
            setEditSaving(false)
        }
    }

    // ── Delete ──
    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            setDeleting(true)
            await deleteSubjectArea(deleteTarget.id)
            toast.success(`Subject area "${deleteTarget.name}" deleted!`)
            setDeleteTarget(null)
            setAreaRefreshKey(prev => prev + 1)
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete subject area')
        } finally {
            setDeleting(false)
        }
    }

    // Helper: get track name by id
    const getTrackName = (trackId: number) => {
        return tracks.find(t => t.id === trackId)?.name || 'Unknown'
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

    // Pagination for the table — show ALL areas across all tracks
    const totalElements = allSubjectAreas.length
    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))
    const parents = allSubjectAreas.filter(sa => sa.parentId === null)
    const getChildren = (parentId: number) => allSubjectAreas.filter(sa => sa.parentId === parentId)

    // Flatten for pagination: parent row + its children as sub-rows
    const flatRows: { area: SubjectAreaResponse; isChild: boolean; parentIndex: number; childIndex?: number }[] = []
    parents.forEach((parent, pIdx) => {
        flatRows.push({ area: parent, isChild: false, parentIndex: pIdx })
        getChildren(parent.id).forEach((child, cIdx) => {
            flatRows.push({ area: child, isChild: true, parentIndex: pIdx, childIndex: cIdx })
        })
    })
    // Also add orphans
    const orphans = allSubjectAreas.filter(sa => sa.parentId !== null && !parents.find(p => p.id === sa.parentId))
    orphans.forEach((orphan) => {
        flatRows.push({ area: orphan, isChild: false, parentIndex: -1 })
    })

    const paginatedRows = flatRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

    return (
        <div className="space-y-6">
            {/* ── Tabbed Add Section ──────────────── */}
            {!isReadOnly && (
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
                                {/* Track selector - inside the form */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">
                                        Track <span className="text-red-500">*</span>
                                    </label>
                                    <Select
                                        className="w-full h-10"
                                        placeholder="Select a track"
                                        value={selectedTrackId ?? undefined}
                                        onChange={(val) => {
                                            setSelectedTrackId(val)
                                            setNewParentId(null)
                                        }}
                                        options={tracks.map((t) => ({ label: t.name, value: t.id }))}
                                    />
                                </div>
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
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Parent (optional)</label>
                                    <AntdSelect
                                        className="w-full h-10"
                                        placeholder="None (root level)"
                                        allowClear
                                        disabled={!selectedTrackId}
                                        value={newParentId ?? undefined}
                                        onChange={(val) => setNewParentId(val === 0 ? null : (val ?? null))}
                                        options={[
                                            { label: '— None (root level)', value: 0 },
                                            ...currentTrackAreas.filter(sa => sa.parentId === null).map(sa => ({
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
                                <Button size="sm" className="px-6" onClick={handleAddSingle} disabled={isSaving || !selectedTrackId}>
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
                                }}
                                templateFilename="subject_area_template.xlsx"
                            />
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* ── Subject Areas Table (ALL tracks) ──────────────── */}
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
                ) : allSubjectAreas.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                        <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                        No subject areas created yet.
                    </div>
                ) : (
                    <div className="rounded-lg border overflow-hidden">
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-12 text-center">#</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-36">Track</TableHead>
                                    <TableHead className="w-24 text-center">Type</TableHead>
                                    {!isReadOnly && <TableHead className="w-28 text-center">Actions</TableHead>}
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
                                            {editingId === row.area.id ? (
                                                <Input
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className="h-8 text-sm"
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveEdit()
                                                        if (e.key === 'Escape') cancelEdit()
                                                    }}
                                                    autoFocus
                                                />
                                            ) : (
                                                <p className={`text-sm ${row.isChild ? 'pl-6 text-foreground/80' : 'font-medium'}`}>
                                                    {row.isChild && <span className="text-muted-foreground mr-1">└</span>}
                                                    {row.area.name}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {editingId === row.area.id ? (
                                                <Input
                                                    value={editDesc}
                                                    onChange={e => setEditDesc(e.target.value)}
                                                    className="h-8 text-sm"
                                                    placeholder="Description (optional)"
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveEdit()
                                                        if (e.key === 'Escape') cancelEdit()
                                                    }}
                                                />
                                            ) : (
                                                <p className="text-sm text-muted-foreground truncate max-w-md">
                                                    {row.area.description || "—"}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                                                {getTrackName(row.area.trackId)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`inline-flex items-center text-[10px] font-medium rounded-full px-2 py-0.5 ${
                                                row.isChild
                                                    ? 'text-indigo-700 bg-indigo-50 border border-indigo-200'
                                                    : 'text-indigo-700 bg-indigo-50 border border-indigo-200'
                                            }`}>
                                                {row.isChild ? 'Sub' : 'Primary'}
                                            </span>
                                        </TableCell>
                                        {!isReadOnly && (
                                        <TableCell className="text-center">
                                            {editingId === row.area.id ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={handleSaveEdit}
                                                        disabled={editSaving}
                                                    >
                                                        {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                        onClick={cancelEdit}
                                                        disabled={editSaving}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50"
                                                        onClick={() => startEdit(row.area)}
                                                        title="Edit subject area"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => setDeleteTarget(row.area)}
                                                        title="Delete subject area"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                <StandardPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalElements={totalElements}
                    entityName="subject areas"
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Subject Area</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the subject area <strong>&quot;{deleteTarget?.name}&quot;</strong>?
                            If papers are using this subject area, deletion will be blocked.
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</> : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
