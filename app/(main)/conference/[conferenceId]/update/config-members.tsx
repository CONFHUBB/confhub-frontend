"use client"

import { useState, useEffect, useCallback } from "react"
import { getUserByEmail, getConferenceMembers, assignRole, deleteRoleAssignment } from "@/app/api/user.api"
import { getTracksByConference } from "@/app/api/track.api"
import type { User, ConferenceUserTrack, MemberWithRoles } from "@/types/user"
import type { TrackResponse } from "@/types/track"
import toast from "react-hot-toast"
import { Input } from "@/components/ui/input"
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
import {
    Search,
    UserPlus,
    Users,
    Shield,
    X,
    Plus,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Settings2,
    Globe,
} from "lucide-react"

// ── Role constants ──────────────────────────────────────
const ROLE_OPTIONS = [
    { value: "ORGANIZER", label: "Conference Chair" },
    { value: "TRACK_CHAIR", label: "Program Chair" },
    { value: "REVIEWER", label: "Reviewer" },
] as const

const ROLE_DISPLAY: Record<string, string> = {
    ORGANIZER: "Conference Chair",
    TRACK_CHAIR: "Program Chair",
    REVIEWER: "Reviewer",
}

const ROLE_COLORS: Record<string, string> = {
    ORGANIZER: "bg-violet-500/15 text-violet-700 border-violet-500/25 dark:text-violet-400",
    TRACK_CHAIR: "bg-sky-500/15 text-sky-700 border-sky-500/25 dark:text-sky-400",
    REVIEWER: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
}

// Track-bound roles require at least 1 track
const TRACK_BOUND_ROLES = ["TRACK_CHAIR", "REVIEWER"]

// ── Internal types for the Manage Roles modal ───────────
interface EditableRole {
    role: string
    tracks: { id: number; conferenceTrackId: number | null; label: string; recordId: number | null }[]
    // recordId on each track entry references the ConferenceUserTrack.id (null = newly added)
}

// ── Helper: build editable roles from backend data ──────
function buildEditableRoles(roles: ConferenceUserTrack[], allTracks: TrackResponse[]): EditableRole[] {
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
            // ORGANIZER — single entry with no track
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

function ManageRolesDialog({
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

    // Reset whenever the dialog opens with new data
    useEffect(() => {
        if (open) {
            setEditableRoles(buildEditableRoles(initialRoles, tracks))
        }
    }, [open, initialRoles, tracks])

    // ── Add Role ────────────────────────────────────────
    const handleAddRole = (roleValue: string) => {
        if (editableRoles.some((r) => r.role === roleValue)) {
            toast.error(`${ROLE_DISPLAY[roleValue]} is already assigned.`)
            return
        }
        const newRole: EditableRole = { role: roleValue, tracks: [] }
        if (!TRACK_BOUND_ROLES.includes(roleValue)) {
            // ORGANIZER → auto-add a "no track" entry
            newRole.tracks.push({ id: 0, conferenceTrackId: null, label: "", recordId: null })
        }
        setEditableRoles((prev) => [...prev, newRole])
    }

    // ── Remove Role entirely ────────────────────────────
    const handleRemoveRole = (roleValue: string) => {
        setEditableRoles((prev) => prev.filter((r) => r.role !== roleValue))
    }

    // ── Add Track to a track-bound role ─────────────────
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

    // ── Remove single track from a role ─────────────────
    const handleRemoveTrack = (roleValue: string, trackId: number) => {
        setEditableRoles((prev) =>
            prev.map((r) => {
                if (r.role !== roleValue) return r
                return { ...r, tracks: r.tracks.filter((t) => t.id !== trackId) }
            })
        )
    }

    // ── Save: diff and call APIs ────────────────────────
    const handleSave = async () => {
        // Validation: track-bound roles must have ≥1 track
        for (const r of editableRoles) {
            if (TRACK_BOUND_ROLES.includes(r.role) && r.tracks.length === 0) {
                toast.error(`${ROLE_DISPLAY[r.role]} must have at least one track assigned.`)
                return
            }
        }

        setIsSaving(true)
        try {
            // Collect all existing record IDs from initial state
            const initialRecordIds = new Set(initialRoles.map((r) => r.id))

            // Collect record IDs still present in the edited state
            const keptRecordIds = new Set<number>()
            const newAssignments: { role: string; trackId: number | null }[] = []

            for (const er of editableRoles) {
                for (const t of er.tracks) {
                    if (t.recordId != null) {
                        keptRecordIds.add(t.recordId)
                    } else {
                        // New assignment
                        newAssignments.push({ role: er.role, trackId: t.conferenceTrackId })
                    }
                }
            }

            // IDs to delete = initial - kept
            const toDelete = [...initialRecordIds].filter((id) => !keptRecordIds.has(id))

            // Execute deletes
            await Promise.all(toDelete.map((id) => deleteRoleAssignment(id)))

            // Execute creates
            await Promise.all(
                newAssignments.map((a) =>
                    assignRole({
                        userId: user.id,
                        conferenceId,
                        trackId: a.trackId,
                        assignedRole: a.role,
                    })
                )
            )

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

    // Available roles to add (not already assigned)
    const availableRoles = ROLE_OPTIONS.filter(
        (opt) => !editableRoles.some((r) => r.role === opt.value)
    )

    // For a given role, available tracks (not already assigned)
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
                            {/* Role header */}
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

                            {/* Track tags (for track-bound roles) */}
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

                                    {/* Add Track dropdown */}
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

                {/* Add Role */}
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

// ═══════════════════════════════════════════════════════════
// ConfigMembers (main component)
// ═══════════════════════════════════════════════════════════
interface ConfigMembersProps {
    conferenceId: number
}

export function ConfigMembers({ conferenceId }: ConfigMembersProps) {
    // ── Search state ────────────────────────────────────
    const [searchEmail, setSearchEmail] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    const [searchResult, setSearchResult] = useState<User | null>(null)
    const [searchError, setSearchError] = useState<string | null>(null)

    // ── Members list state ──────────────────────────────
    const [members, setMembers] = useState<MemberWithRoles[]>([])
    const [totalElements, setTotalElements] = useState(0)
    const [currentPage, setCurrentPage] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [isLoadingMembers, setIsLoadingMembers] = useState(true)

    // ── Tracks ──────────────────────────────────────────
    const [tracks, setTracks] = useState<TrackResponse[]>([])

    // ── Manage Roles dialog ─────────────────────────────
    const [dialogOpen, setDialogOpen] = useState(false)
    const [dialogUser, setDialogUser] = useState<User | null>(null)
    const [dialogRoles, setDialogRoles] = useState<ConferenceUserTrack[]>([])

    // ── Fetch members ───────────────────────────────────
    const fetchMembers = useCallback(
        async (page = 0) => {
            setIsLoadingMembers(true)
            try {
                const data = await getConferenceMembers(conferenceId, page)
                setMembers(data.content)
                setTotalElements(data.totalElements)
                setTotalPages(data.totalPages)
                setCurrentPage(page)
            } catch (err) {
                console.error("Failed to load members:", err)
                toast.error("Failed to load conference members.")
            } finally {
                setIsLoadingMembers(false)
            }
        },
        [conferenceId]
    )

    // ── Fetch tracks ────────────────────────────────────
    const fetchTracks = useCallback(async () => {
        try {
            const data = await getTracksByConference(conferenceId)
            setTracks(data)
        } catch (err) {
            console.error("Failed to load tracks:", err)
        }
    }, [conferenceId])

    useEffect(() => {
        fetchMembers()
        fetchTracks()
    }, [fetchMembers, fetchTracks])

    // ── Search handler ──────────────────────────────────
    const handleSearch = async () => {
        const email = searchEmail.trim()
        if (!email) return

        setIsSearching(true)
        setSearchResult(null)
        setSearchError(null)

        try {
            const user = await getUserByEmail(email)
            setSearchResult(user)
        } catch (err: any) {
            if (err.response?.status === 404) {
                setSearchError("User with this email was not found.")
            } else {
                setSearchError("An error occurred while searching. Please try again.")
            }
        } finally {
            setIsSearching(false)
        }
    }

    // ── Open manage roles dialog ────────────────────────
    const openManageRoles = (user: User, roles: ConferenceUserTrack[]) => {
        setDialogUser(user)
        setDialogRoles(roles)
        setDialogOpen(true)
    }

    // ── Format role display for member card ─────────────
    const formatRoles = (roles: ConferenceUserTrack[]) => {
        const grouped = new Map<string, string[]>()
        for (const r of roles) {
            if (!grouped.has(r.assignedRole)) grouped.set(r.assignedRole, [])
            if (r.conferenceTrackId != null) {
                const track = tracks.find((t) => t.id === r.conferenceTrackId)
                grouped.get(r.assignedRole)!.push(track?.name ?? `Track #${r.conferenceTrackId}`)
            }
        }
        return grouped
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold mb-1">Config Members</h2>
                <p className="text-sm text-muted-foreground">
                    Manage conference members and their roles.
                </p>
            </div>

            {/* ── Search Section ──────────────────────── */}
            <div className="rounded-xl border bg-card p-6 space-y-4">
                <h3 className="text-base font-semibold flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-primary" />
                    Add User to Conference
                </h3>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="member-search-email"
                            type="email"
                            placeholder="Search by email address..."
                            className="pl-9"
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                    </div>
                    <Button onClick={handleSearch} disabled={isSearching || !searchEmail.trim()}>
                        {isSearching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Search className="h-4 w-4" />
                        )}
                        <span className="ml-2">Search</span>
                    </Button>
                </div>

                {/* Search error */}
                {searchError && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        {searchError}
                    </div>
                )}

                {/* Search result card */}
                {searchResult && (
                    <div className="rounded-lg border bg-muted/20 p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium truncate">{searchResult.fullName}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {searchResult.email}
                                </p>
                                {searchResult.country && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Globe className="h-3 w-3" />
                                        {searchResult.country}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => openManageRoles(searchResult, [])}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add to Conference
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Members List ────────────────────────── */}
            <div className="rounded-xl border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Conference Members
                        {!isLoadingMembers && (
                            <span className="text-xs font-normal text-muted-foreground">
                                ({totalElements})
                            </span>
                        )}
                    </h3>
                </div>

                {isLoadingMembers ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : members.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                        No members found. Use the search above to add users.
                    </div>
                ) : (
                    <div className="divide-y">
                        {members.map((member, idx) => {
                            const roleGroups = formatRoles(member.roles)
                            return (
                                <div
                                    key={member.user.id}
                                    className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                                >
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 text-sm font-bold text-primary mt-0.5">
                                            {(member.user.fullName ?? "?")[0]?.toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm">
                                                <span className="text-muted-foreground mr-1.5">
                                                    {currentPage * 20 + idx + 1}.
                                                </span>
                                                {member.user.fullName}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {member.user.email}
                                            </p>
                                            {/* Role badges */}
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {[...roleGroups.entries()].map(([role, trackNames]) => (
                                                    <Badge
                                                        key={role}
                                                        variant="outline"
                                                        className={`text-[11px] ${ROLE_COLORS[role] ?? ""}`}
                                                    >
                                                        {ROLE_DISPLAY[role] ?? role}
                                                        {trackNames.length > 0 && (
                                                            <span className="opacity-70 ml-1">
                                                                ({trackNames.join(", ")})
                                                            </span>
                                                        )}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0 mt-1"
                                        onClick={() => openManageRoles(member.user, member.roles)}
                                    >
                                        <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                                        Manage Roles
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                        <p className="text-xs text-muted-foreground">
                            Page {currentPage + 1} of {totalPages}
                        </p>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 0}
                                onClick={() => fetchMembers(currentPage - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage >= totalPages - 1}
                                onClick={() => fetchMembers(currentPage + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Manage Roles Dialog ─────────────────── */}
            {dialogUser && (
                <ManageRolesDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    user={dialogUser}
                    initialRoles={dialogRoles}
                    conferenceId={conferenceId}
                    tracks={tracks}
                    onSaved={() => fetchMembers(currentPage)}
                />
            )}
        </div>
    )
}
