"use client"

import { useState, useEffect } from "react"
import { assignRole, deleteRoleAssignment } from "@/app/api/user.api"
import type { User, ConferenceUserTrack } from "@/types/user"
import type { TrackResponse } from "@/types/track"
import { toast } from 'sonner'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Shield, X, Plus, Loader2 } from "lucide-react"

// ── Role constants ──────────────────────────────────────
export const ROLE_OPTIONS = [
    { value: "CONFERENCE_CHAIR", label: "Conference Chair" },
    { value: "PROGRAM_CHAIR", label: "Program Chair" },
    { value: "REVIEWER", label: "Reviewer" },
] as const

export const ROLE_DISPLAY: Record<string, string> = {
    CONFERENCE_CHAIR: "Conference Chair",
    PROGRAM_CHAIR: "Program Chair",
    REVIEWER: "Reviewer",
    AUTHOR: "Author",
    ATTENDEE: "Attendee",
}

export const ROLE_COLORS: Record<string, string> = {
    CONFERENCE_CHAIR: "bg-violet-500/15 text-violet-700 border-violet-500/25 dark:text-violet-400",
    PROGRAM_CHAIR: "bg-sky-500/15 text-sky-700 border-sky-500/25 dark:text-sky-400",
    REVIEWER: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
    AUTHOR: "bg-amber-500/15 text-amber-700 border-amber-500/25 dark:text-amber-400",
    ATTENDEE: "bg-gray-500/15 text-gray-700 border-gray-500/25 dark:text-gray-400",
}

// Track-bound roles require at least 1 track
export const TRACK_BOUND_ROLES = ["PROGRAM_CHAIR", "REVIEWER"]

// ── Internal types ───────────────────────────────────────
interface EditableRole {
    role: string
    tracks: { id: number; conferenceTrackId: number | null; label: string; recordId: number | null }[]
}

// ── Helper: build editable roles from backend data ──────
export function buildEditableRoles(roles: ConferenceUserTrack[], allTracks: TrackResponse[]): EditableRole[] {
    const map = new Map<string, EditableRole>()

    for (const r of roles) {
        if (!map.has(r.assignedRole)) {
            map.set(r.assignedRole, { role: r.assignedRole, tracks: [] })
        }
        const entry = map.get(r.assignedRole)!
        if (r.conferenceTrackId != null) {
            const track = allTracks.find((t) => t.id === r.conferenceTrackId)
            entry.tracks.push({
                id: r.conferenceTrackId,
                conferenceTrackId: r.conferenceTrackId,
                label: track?.name ?? `Track #${r.conferenceTrackId}`,
                recordId: r.id,
            })
        } else {
            entry.tracks.push({ id: 0, conferenceTrackId: null, label: "", recordId: r.id })
        }
    }

    return Array.from(map.values())
}

// ═══════════════════════════════════════════════════════════
// ManageRolesDialog
// ═══════════════════════════════════════════════════════════
interface ManageRolesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: User
    initialRoles: ConferenceUserTrack[]
    conferenceId: number
    tracks: TrackResponse[]
    onSaved: () => void
}

export function ManageRolesDialog({
    open,
    onOpenChange,
    user,
    initialRoles,
    conferenceId,
    tracks,
    onSaved,
}: ManageRolesDialogProps) {
    const [editableRoles, setEditableRoles] = useState<EditableRole[]>([])
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (open) {
            setEditableRoles(buildEditableRoles(initialRoles, tracks))
        }
    }, [open, initialRoles, tracks])

    const handleAddRole = (roleValue: string) => {
        if (editableRoles.some((r) => r.role === roleValue)) {
            toast.error(`${ROLE_DISPLAY[roleValue]} is already assigned.`)
            return
        }
        const newRole: EditableRole = { role: roleValue, tracks: [] }
        if (!TRACK_BOUND_ROLES.includes(roleValue)) {
            newRole.tracks.push({ id: 0, conferenceTrackId: null, label: "", recordId: null })
        }
        setEditableRoles((prev) => [...prev, newRole])
    }

    const handleRemoveRole = (roleValue: string) => {
        setEditableRoles((prev) => prev.filter((r) => r.role !== roleValue))
    }

    const handleAddTrack = (roleValue: string, trackId: string) => {
        const tid = Number(trackId)
        const track = tracks.find((t) => t.id === tid)
        if (!track) return

        setEditableRoles((prev) =>
            prev.map((r) => {
                if (r.role !== roleValue) return r
                if (r.tracks.some((t) => t.id === tid)) {
                    toast.error(`${track.name} is already assigned to this role.`)
                    return r
                }
                return {
                    ...r,
                    tracks: [
                        ...r.tracks,
                        { id: tid, conferenceTrackId: tid, label: track.name, recordId: null },
                    ],
                }
            })
        )
    }

    const handleRemoveTrack = (roleValue: string, trackId: number) => {
        setEditableRoles((prev) =>
            prev.map((r) => {
                if (r.role !== roleValue) return r
                return { ...r, tracks: r.tracks.filter((t) => t.id !== trackId) }
            })
        )
    }

    const handleSave = async () => {
        for (const r of editableRoles) {
            if (TRACK_BOUND_ROLES.includes(r.role) && r.tracks.length === 0) {
                toast.error(`${ROLE_DISPLAY[r.role]} must have at least one track assigned.`)
                return
            }
        }

        setIsSaving(true)
        try {
            const initialRecordIds = new Set(initialRoles.map((r) => r.id))
            const keptRecordIds = new Set<number>()
            const newAssignments: { role: string; trackId: number | null }[] = []

            for (const er of editableRoles) {
                for (const t of er.tracks) {
                    if (t.recordId != null) {
                        keptRecordIds.add(t.recordId)
                    } else {
                        newAssignments.push({ role: er.role, trackId: t.conferenceTrackId })
                    }
                }
            }

            const toDelete = [...initialRecordIds].filter((id) => !keptRecordIds.has(id))
            await Promise.all(toDelete.map((id) => deleteRoleAssignment(id)))

            for (const a of newAssignments) {
                await assignRole({
                    userId: user.id,
                    conferenceId,
                    trackId: a.trackId,
                    assignedRole: a.role,
                })
            }

            toast.success("Roles updated successfully!")
            onSaved()
            onOpenChange(false)
        } catch (err) {
            console.error("Failed to save roles:", err)
            toast.error("Failed to update roles. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    const availableRoles = ROLE_OPTIONS.filter(
        (opt) => !editableRoles.some((r) => r.role === opt.value)
    )

    const getAvailableTracks = (roleValue: string) => {
        const assigned = editableRoles.find((r) => r.role === roleValue)
        const assignedIds = new Set(assigned?.tracks.map((t) => t.id) ?? [])
        return tracks.filter((t) => !assignedIds.has(t.id))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Manage Roles — {user.fullName}
                    </DialogTitle>
                    <DialogDescription>
                        Add or remove roles for this member. Track-bound roles (Program Chair, Reviewer)
                        must have at least one track.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                    {editableRoles.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            No roles assigned yet. Use the button below to add a role.
                        </p>
                    )}

                    {editableRoles.map((er) => (
                        <div
                            key={er.role}
                            className="rounded-lg border bg-muted/30 p-4 space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <Badge
                                    variant="outline"
                                    className={`text-xs font-semibold ${ROLE_COLORS[er.role] ?? ""}`}
                                >
                                    {ROLE_DISPLAY[er.role] ?? er.role}
                                </Badge>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveRole(er.role)}
                                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10"
                                    title="Remove this role"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {TRACK_BOUND_ROLES.includes(er.role) && (
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                        {er.tracks.map((t) => (
                                            <Badge
                                                key={t.id}
                                                variant="secondary"
                                                className="pl-2.5 pr-1 py-1 flex items-center gap-1.5 text-xs"
                                            >
                                                {t.label}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveTrack(er.role, t.id)}
                                                    className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5 transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>

                                    {getAvailableTracks(er.role).length > 0 && (
                                        <Select onValueChange={(v) => handleAddTrack(er.role, v)}>
                                            <SelectTrigger className="w-full h-8 text-xs">
                                                <SelectValue placeholder="+ Add Track" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getAvailableTracks(er.role).map((t) => (
                                                    <SelectItem key={t.id} value={String(t.id)}>
                                                        {t.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {availableRoles.length > 0 && (
                    <Select onValueChange={handleAddRole}>
                        <SelectTrigger className="w-full">
                            <div className="flex items-center gap-2 text-sm">
                                <Plus className="h-4 w-4" />
                                <SelectValue placeholder="Add Role" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {availableRoles.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                <DialogFooter className="gap-2 pt-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
