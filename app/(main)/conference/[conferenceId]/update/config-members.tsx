"use client"

import { useState, useEffect, useCallback } from "react"
import { getUserByEmail, getConferenceMembers, assignRole, deleteRoleAssignment } from "@/app/api/user.api"
import { getTracksByConference } from "@/app/api/track.api"
import { getConference, downloadMemberTemplate, previewMemberImport, importMembers } from "@/app/api/conference.api"
import { sendInvitationEmail } from "@/app/api/email.api"
import type { User, ConferenceUserTrack, MemberWithRoles } from "@/types/user"
import type { TrackResponse } from "@/types/track"
import type { ConferenceResponse } from "@/types/conference"
import toast from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExcelImport } from "@/components/excel-import"
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
    Mail,
    Send,
    MoreHorizontal,
    Eye,
    Trash2,
    Calendar,
    User as UserIcon,
    FileSpreadsheet,
} from "lucide-react"

// ── Role constants ──────────────────────────────────────
const ROLE_OPTIONS = [
    { value: "CONFERENCE_CHAIR", label: "Conference Chair" },
    { value: "PROGRAM_CHAIR", label: "Program Chair" },
    { value: "REVIEWER", label: "Reviewer" },
] as const

const ROLE_DISPLAY: Record<string, string> = {
    CONFERENCE_CHAIR: "Conference Chair",
    PROGRAM_CHAIR: "Program Chair",
    REVIEWER: "Reviewer",
    AUTHOR: "Author",
    ATTENDEE: "Attendee",
}

const ROLE_COLORS: Record<string, string> = {
    CONFERENCE_CHAIR: "bg-violet-500/15 text-violet-700 border-violet-500/25 dark:text-violet-400",
    PROGRAM_CHAIR: "bg-sky-500/15 text-sky-700 border-sky-500/25 dark:text-sky-400",
    REVIEWER: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
    AUTHOR: "bg-amber-500/15 text-amber-700 border-amber-500/25 dark:text-amber-400",
    ATTENDEE: "bg-gray-500/15 text-gray-700 border-gray-500/25 dark:text-gray-400",
}

// Track-bound roles require at least 1 track
const TRACK_BOUND_ROLES = ["PROGRAM_CHAIR", "REVIEWER"]

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

            // Execute creates SEQUENTIALLY to avoid duplicate notifications
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

    // ── External invite state ───────────────────────────
    const [showExternalInvite, setShowExternalInvite] = useState(false)
    const [externalRole, setExternalRole] = useState("REVIEWER")
    const [externalName, setExternalName] = useState("")
    const [externalTrackId, setExternalTrackId] = useState<string>("")
    const [isSendingInvite, setIsSendingInvite] = useState(false)
    const [conference, setConference] = useState<ConferenceResponse | null>(null)

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

    // ── Remove member confirmation ──────────────────────
    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
    const [memberToRemove, setMemberToRemove] = useState<MemberWithRoles | null>(null)
    const [isRemoving, setIsRemoving] = useState(false)

    // ── Member detail dialog ─────────────────────────────
    const [detailOpen, setDetailOpen] = useState(false)
    const [detailMember, setDetailMember] = useState<MemberWithRoles | null>(null)

    // ── Add method tab ────────────────────────────────────
    const [memberTab, setMemberTab] = useState<'add-user' | 'import-excel'>('add-user')

    // ── Fetch members ───────────────────────────────────
    const fetchMembers = useCallback(
        async (page = 0) => {
            setIsLoadingMembers(true)
            try {
                const data = await getConferenceMembers(conferenceId, page, 10)
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

    // ── Fetch conference info ─────────────────────────
    const fetchConference = useCallback(async () => {
        try {
            const data = await getConference(conferenceId)
            setConference(data)
        } catch (err) {
            console.error("Failed to load conference:", err)
        }
    }, [conferenceId])

    useEffect(() => {
        fetchMembers()
        fetchTracks()
        fetchConference()
    }, [fetchMembers, fetchTracks, fetchConference])

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
            setShowExternalInvite(false)
        } catch (err: any) {
            if (err.response?.status === 404) {
                setSearchError("User with this email was not found in the system.")
                setShowExternalInvite(true)
                setExternalName("")
            } else {
                setSearchError("An error occurred while searching. Please try again.")
                setShowExternalInvite(false)
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

    // ── Get acceptance status for member ─────────────────
    const getAcceptanceStatus = (roles: ConferenceUserTrack[]) => {
        const hasAccepted = roles.some((r) => r.isAccepted === true)
        const hasDeclined = roles.some((r) => r.isAccepted === false)
        const hasPending = roles.some((r) => r.isAccepted === null)
        if (hasAccepted) return 'accepted'
        if (hasDeclined) return 'declined'
        if (hasPending) return 'pending'
        return 'pending'
    }

    // ── Handle remove member ─────────────────────────────
    const handleRemoveMember = async () => {
        if (!memberToRemove) return
        setIsRemoving(true)
        try {
            await Promise.all(memberToRemove.roles.map((r) => deleteRoleAssignment(r.id)))
            toast.success('Member removed successfully!')
            fetchMembers(currentPage)
        } catch (err) {
            console.error('Failed to remove member:', err)
            toast.error('Failed to remove member.')
        } finally {
            setIsRemoving(false)
            setRemoveConfirmOpen(false)
            setMemberToRemove(null)
        }
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

            {/* ── Tabbed Add Members Section ──────────── */}
            <div className="rounded-xl border bg-card overflow-hidden">
                {/* Section heading */}
                <div className="px-6 pt-5 pb-3">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-primary" />
                        Add Members
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Add individual users by email or bulk import from Excel.
                    </p>
                </div>
                {/* Tab buttons */}
                <div className="flex gap-1 border-b pb-0 px-6">
                    <button
                        onClick={() => setMemberTab('add-user')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            memberTab === 'add-user'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                        }`}
                    >
                        <UserPlus className="h-4 w-4" />
                        Add User
                    </button>
                    <button
                        onClick={() => setMemberTab('import-excel')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            memberTab === 'import-excel'
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
                    {memberTab === 'add-user' && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Search by email address to find and add users to this conference.
                            </p>

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

                            {/* Search error + External invite option */}
                            {searchError && (
                                <div className="space-y-3">
                                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                        {searchError}
                                    </div>

                                    {/* External invitation form */}
                                    {showExternalInvite && (
                                        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-blue-600" />
                                                <h4 className="text-sm font-semibold text-blue-800">Invite External User</h4>
                                            </div>
                                            <p className="text-xs text-blue-700">
                                                This person is not registered in the system. You can send them an email invitation to join the conference.
                                            </p>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-700">Recipient Name</label>
                                                    <Input
                                                        placeholder="Enter name..."
                                                        value={externalName}
                                                        onChange={(e) => setExternalName(e.target.value)}
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-700">Role</label>
                                                    <Select value={externalRole} onValueChange={(v) => { setExternalRole(v); setExternalTrackId(""); }}>
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {ROLE_OPTIONS.map((opt) => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Track selector for track-bound roles */}
                                            {TRACK_BOUND_ROLES.includes(externalRole) && (
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-700">
                                                        Track <span className="text-red-500">*</span>
                                                    </label>
                                                    {tracks.length === 0 ? (
                                                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                                            No tracks available. Please create tracks first in Config Tracks.
                                                        </p>
                                                    ) : (
                                                        <Select value={externalTrackId} onValueChange={setExternalTrackId}>
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="Select a track..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {tracks.map((t) => (
                                                                    <SelectItem key={t.id} value={String(t.id)}>
                                                                        {t.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/80 border rounded-md px-3 py-2">
                                                <span>Email:</span>
                                                <strong>{searchEmail}</strong>
                                            </div>

                                            <Button
                                                size="sm"
                                                className="gap-2 bg-blue-600 hover:bg-blue-700"
                                                disabled={
                                                    isSendingInvite ||
                                                    !externalName.trim() ||
                                                    (TRACK_BOUND_ROLES.includes(externalRole) && !externalTrackId)
                                                }
                                                onClick={async () => {
                                                    if (TRACK_BOUND_ROLES.includes(externalRole) && !externalTrackId) {
                                                        toast.error("Please select a track for this role.")
                                                        return
                                                    }
                                                    setIsSendingInvite(true)
                                                    try {
                                                        const selectedTrack = tracks.find(t => String(t.id) === externalTrackId)
                                                        const roleLabel = ROLE_DISPLAY[externalRole] || externalRole
                                                        const trackLabel = selectedTrack ? ` — ${selectedTrack.name}` : ""

                                                        const formData = new FormData()
                                                        formData.append('to', searchEmail.trim())
                                                        formData.append('recipientName', externalName.trim())
                                                        formData.append('subject', `Invitation to ${conference?.name || 'Conference'} as ${roleLabel}${trackLabel}`)
                                                        formData.append('conferenceName', conference?.name || '')
                                                        formData.append('conferenceId', String(conferenceId))
                                                        formData.append('role', roleLabel)
                                                        if (selectedTrack) {
                                                            formData.append('trackName', selectedTrack.name)
                                                        }
                                                        formData.append('invitationToken', 'external-' + Date.now())

                                                        await sendInvitationEmail(formData)
                                                        toast.success(`Invitation email sent to ${searchEmail}`)
                                                        setShowExternalInvite(false)
                                                        setSearchError(null)
                                                        setSearchEmail("")
                                                        setExternalName("")
                                                        setExternalTrackId("")
                                                    } catch (err) {
                                                        console.error('Failed to send invitation:', err)
                                                        toast.error('Failed to send invitation email. Please try again.')
                                                    } finally {
                                                        setIsSendingInvite(false)
                                                    }
                                                }}
                                            >
                                                {isSendingInvite ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Send className="h-4 w-4" />
                                                )}
                                                Send Invitation Email
                                            </Button>
                                        </div>
                                    )}
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
                    )}

                    {memberTab === 'import-excel' && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Download the template, fill in member details (email, role, track), then upload to preview and import.
                            </p>
                            <ExcelImport
                                entityName="Member"
                                previewHeaders={["email", "role", "trackName"]}
                                onDownloadTemplate={() => downloadMemberTemplate(conferenceId)}
                                onPreview={(file) => previewMemberImport(conferenceId, file)}
                                onImport={(file) => importMembers(conferenceId, file)}
                                onImportSuccess={() => fetchMembers()}
                                templateFilename="member_template.xlsx"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Members Table ────────────────────────── */}
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
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-12 text-center">#</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="w-28 text-center">Status</TableHead>
                                    <TableHead className="w-32 text-center">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((member, idx) => {
                                    const roleGroups = formatRoles(member.roles)
                                    const status = getAcceptanceStatus(member.roles)
                                    return (
                                        <TableRow key={member.user.id}>
                                            {/* # */}
                                            <TableCell className="text-center text-xs text-muted-foreground font-medium">
                                                {currentPage * 20 + idx + 1}
                                            </TableCell>

                                            {/* Name + Email */}
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                                                        {(member.user.fullName ?? "?")[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-sm truncate">{member.user.fullName}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Roles */}
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {[...roleGroups.entries()].map(([role, trackNames]) => (
                                                        <Badge
                                                            key={role}
                                                            variant="outline"
                                                            className={`text-[10px] py-0.5 ${ROLE_COLORS[role] ?? ""}`}
                                                        >
                                                            {ROLE_DISPLAY[role] ?? role}
                                                            {trackNames.length > 0 && (
                                                                <span className="opacity-60 ml-1">
                                                                    ({trackNames.length > 1 ? `${trackNames.length} tracks` : trackNames[0]})
                                                                </span>
                                                            )}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell className="text-center">
                                                {status === 'accepted' && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Accepted
                                                    </span>
                                                )}
                                                {status === 'pending' && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
                                                    </span>
                                                )}
                                                {status === 'declined' && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Declined
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                                        title="View Details"
                                                        onClick={() => {
                                                            setDetailMember(member)
                                                            setDetailOpen(true)
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                                        title="Manage Roles"
                                                        onClick={() => openManageRoles(member.user, member.roles)}
                                                    >
                                                        <Settings2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                                                        title="Remove Member"
                                                        onClick={() => {
                                                            setMemberToRemove(member)
                                                            setRemoveConfirmOpen(true)
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                        <p className="text-xs text-muted-foreground">
                            Page {currentPage + 1} of {totalPages} · {totalElements} members
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

            {/* ── Member Detail Dialog ─────────────────── */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5 text-primary" />
                            Member Details
                        </DialogTitle>
                        <DialogDescription>
                            Detailed information about this conference member.
                        </DialogDescription>
                    </DialogHeader>
                    {detailMember && (
                        <div className="space-y-5 py-2">
                            {/* User Info */}
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-lg font-bold text-primary">
                                    {(detailMember.user.fullName ?? "?")[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-base">{detailMember.user.fullName}</p>
                                    <p className="text-sm text-muted-foreground">{detailMember.user.email}</p>
                                </div>
                            </div>

                            {/* Detail Info */}
                            <div className="rounded-lg border bg-muted/20 divide-y">
                                {detailMember.user.country && (
                                    <div className="flex items-center gap-3 px-4 py-2.5">
                                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Country</p>
                                            <p className="text-sm font-medium">{detailMember.user.country}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 px-4 py-2.5">
                                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Joined Conference</p>
                                        <p className="text-sm font-medium">
                                            {detailMember.roles[0]?.createdAt
                                                ? new Date(detailMember.roles[0].createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric', month: 'long', day: 'numeric'
                                                })
                                                : 'N/A'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-2.5">
                                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Invitation Status</p>
                                        <p className="text-sm font-medium">
                                            {(() => {
                                                const s = getAcceptanceStatus(detailMember.roles)
                                                if (s === 'accepted') return '✅ Accepted'
                                                if (s === 'declined') return '❌ Declined'
                                                return '⏳ Pending'
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Roles Breakdown */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Assigned Roles</h4>
                                <div className="space-y-2">
                                    {[...formatRoles(detailMember.roles).entries()].map(([role, trackNames]) => (
                                        <div key={role} className="rounded-lg border p-3">
                                            <Badge
                                                variant="outline"
                                                className={`text-xs font-semibold ${ROLE_COLORS[role] ?? ""}`}
                                            >
                                                {ROLE_DISPLAY[role] ?? role}
                                            </Badge>
                                            {trackNames.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {trackNames.map((tn) => (
                                                        <span key={tn} className="text-xs bg-muted px-2 py-0.5 rounded-md">
                                                            {tn}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Activity History */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Activity History</h4>
                                <div className="rounded-lg border bg-muted/10 divide-y">
                                    {detailMember.roles
                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                        .map((role) => (
                                            <div key={role.id} className="px-4 py-2.5 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                                        role.isAccepted === true ? 'bg-green-500'
                                                        : role.isAccepted === false ? 'bg-red-500'
                                                        : 'bg-amber-500'
                                                    }`} />
                                                    <span className="text-sm font-medium">
                                                        {ROLE_DISPLAY[role.assignedRole] ?? role.assignedRole}
                                                    </span>
                                                    {role.conferenceTrackId && (
                                                        <span className="text-xs text-muted-foreground">
                                                            — {tracks.find(t => t.id === role.conferenceTrackId)?.name ?? `Track #${role.conferenceTrackId}`}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {new Date(role.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short', day: 'numeric', year: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                        {detailMember && (
                            <Button onClick={() => {
                                setDetailOpen(false)
                                openManageRoles(detailMember.user, detailMember.roles)
                            }}>
                                <Settings2 className="h-4 w-4 mr-1.5" />
                                Manage Roles
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
            {/* ── Remove Member Confirmation ──────────── */}
            <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{memberToRemove?.user.fullName}</strong> from this conference?
                            This will remove all their assigned roles.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveMember}
                            disabled={isRemoving}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isRemoving ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Removing...</>
                            ) : (
                                'Remove'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
