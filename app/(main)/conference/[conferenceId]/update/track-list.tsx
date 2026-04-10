"use client"

import { useEffect, useState } from "react"
import { getTracksByConference } from "@/app/api/track.api"
import { updateTrack, deleteTrack } from "@/app/api/conference.api"
import type { TrackResponse } from "@/types/track"
import { Loader2, Layers, Pencil, Trash2, Check, X } from "lucide-react"
import { StandardPagination } from "@/components/ui/standard-pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
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

interface TrackListProps {
    conferenceId: number
    refreshKey: number
    onTrackDeleted?: () => void
}

const PAGE_SIZE = 10

export function TrackList({ conferenceId, refreshKey, onTrackDeleted }: TrackListProps) {
    const [allTracks, setAllTracks] = useState<TrackResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(0)

    // Inline edit state
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [editDesc, setEditDesc] = useState('')
    const [saving, setSaving] = useState(false)

    // Delete dialog state
    const [deleteTarget, setDeleteTarget] = useState<TrackResponse | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchTracks = async () => {
        try {
            setLoading(true)
            const data = await getTracksByConference(conferenceId)
            setAllTracks(data)
        } catch (err) {
            console.error("Failed to load tracks:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTracks()
    }, [conferenceId, refreshKey])

    // Reset to page 0 when data changes
    useEffect(() => {
        setCurrentPage(0)
    }, [allTracks.length])

    const startEdit = (track: TrackResponse) => {
        setEditingId(track.id)
        setEditName(track.name)
        setEditDesc(track.description || '')
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditName('')
        setEditDesc('')
    }

    const handleSaveEdit = async () => {
        if (!editingId) return
        if (!editName.trim()) {
            toast.error('Track name is required.')
            return
        }

        // Check duplicate name (case-insensitive) within same conference
        const duplicate = allTracks.find(
            t => t.id !== editingId && t.name.trim().toLowerCase() === editName.trim().toLowerCase()
        )
        if (duplicate) {
            toast.error(`A track named "${editName.trim()}" already exists.`)
            return
        }

        try {
            setSaving(true)
            await updateTrack(editingId, {
                id: editingId,
                name: editName.trim(),
                description: editDesc.trim(),
                conferenceId,
            })
            toast.success('Track updated successfully!')
            setEditingId(null)
            await fetchTracks()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update track')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            setDeleting(true)
            await deleteTrack(deleteTarget.id)
            toast.success(`Track "${deleteTarget.name}" deleted successfully!`)
            setDeleteTarget(null)
            await fetchTracks()
            onTrackDeleted?.()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete track')
        } finally {
            setDeleting(false)
        }
    }

    const totalElements = allTracks.length
    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))
    const paginatedTracks = allTracks.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

    return (
        <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Conference Tracks
                    {!loading && (
                        <span className="text-xs font-normal text-muted-foreground">
                            ({totalElements})
                        </span>
                    )}
                </h3>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : allTracks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                    <Layers className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    No tracks created yet. Use the Add Tracks section above to create tracks.
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
                                <TableHead className="w-28 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedTracks.map((track, idx) => (
                                <TableRow key={track.id}>
                                    <TableCell className="text-center text-xs text-muted-foreground font-medium">
                                        {currentPage * PAGE_SIZE + idx + 1}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === track.id ? (
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
                                            <p className="font-medium text-sm">{track.name}</p>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === track.id ? (
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
                                                {track.description || "—"}
                                            </p>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {editingId === track.id ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={handleSaveEdit}
                                                    disabled={saving}
                                                >
                                                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                    onClick={cancelEdit}
                                                    disabled={saving}
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
                                                    onClick={() => startEdit(track)}
                                                    title="Edit track"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setDeleteTarget(track)}
                                                    title="Delete track"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                </div>
            )}

            <StandardPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalElements={totalElements}
                entityName="tracks"
                onPageChange={setCurrentPage}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Track</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the track <strong>&quot;{deleteTarget?.name}&quot;</strong>?
                            This will also remove all subject areas and review settings associated with this track.
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</> : 'Delete Track'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
