"use client"

import { useState, useEffect, useCallback } from "react"
import { getUserByEmail, getConferenceMembers, assignRole, deleteRoleAssignment } from "@/app/api/user.api"
import { getTracksByConference } from "@/app/api/track.api"
import { getConference, downloadMemberTemplate, previewMemberImport, importMembers } from "@/app/api/conference.api"
import { sendInvitationEmail, sendExternalInvitation } from "@/app/api/email.api"
import type { User, ConferenceUserTrack, MemberWithRoles } from "@/types/user"
import type { TrackResponse } from "@/types/track"
import type { ConferenceResponse } from "@/types/conference"
import { toast } from 'sonner'
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
    X,
    Plus,
    Loader2,
    Settings2,
    Globe,
    Mail,
    Send,
    Eye,
    Trash2,
    FileSpreadsheet,
    Download,
    CheckSquare
} from "lucide-react"
import { StandardPagination } from "@/components/ui/standard-pagination"
import { Checkbox } from "@/components/ui/checkbox"
import { FilterPanel } from "@/components/ui/filter-panel"
import { V } from "@/lib/validation"
import { MemberDetailDialog } from "./_components/member-detail-dialog"
import { UserLink } from '@/components/shared/user-link'
import { ManageRolesDialog, ROLE_OPTIONS, ROLE_DISPLAY, ROLE_COLORS, TRACK_BOUND_ROLES } from "./_components/manage-roles-dialog"

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
    const [externalTrackIds, setExternalTrackIds] = useState<string[]>([])
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

    // ── Filter & Search (client-side) ────────────────────
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [memberSearch, setMemberSearch] = useState('')

    // ── Bulk selection ───────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
    const [isBulkRemoving, setIsBulkRemoving] = useState(false)

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

        const emailErr = V.email(email)
        if (emailErr) {
            setSearchError(emailErr)
            setShowExternalInvite(false)
            return
        }

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

    // ── Filtered members (client-side) ───────────────────
    const filteredMembers = members.filter((m) => {
        // Role filter
        if (roleFilter !== 'all') {
            const hasRole = m.roles.some(r => r.assignedRole === roleFilter)
            if (!hasRole) return false
        }
        // Name/email search
        if (memberSearch.trim()) {
            const q = memberSearch.toLowerCase()
            const nameMatch = m.user.fullName?.toLowerCase().includes(q)
            const emailMatch = m.user.email?.toLowerCase().includes(q)
            if (!nameMatch && !emailMatch) return false
        }
        return true
    })

    // Derived state
    const activeFilterCount = roleFilter !== 'all' ? 1 : 0

    // ── CSV Export ───────────────────────────────────────
    const handleExportCSV = () => {
        const header = 'Name,Email,Country,Roles,Tracks,Status'
        const rows = filteredMembers.map((m) => {
            const roleGroups = formatRoles(m.roles)
            const roles = [...roleGroups.keys()].map(r => ROLE_DISPLAY[r] ?? r).join('; ')
            const trackList = [...roleGroups.values()].flat().join('; ')
            const status = getAcceptanceStatus(m.roles)
            return [
                `"${m.user.fullName ?? ''}"`,
                `"${m.user.email ?? ''}"`,
                `"${m.user.country ?? ''}"`,
                `"${roles}"`,
                `"${trackList}"`,
                `"${status}"`,
            ].join(',')
        })
        const csv = [header, ...rows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `conference-members-${conferenceId}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`Exported ${filteredMembers.length} members to CSV`)
    }

    // ── Bulk select helpers ──────────────────────────────
    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredMembers.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredMembers.map(m => m.user.id)))
        }
    }

    // ── Bulk remove ─────────────────────────────────────
    const handleBulkRemove = async () => {
        setIsBulkRemoving(true)
        try {
            const toRemove = members.filter(m => selectedIds.has(m.user.id))
            const allRoleIds = toRemove.flatMap(m => m.roles.map(r => r.id))
            await Promise.all(allRoleIds.map(id => deleteRoleAssignment(id)))
            toast.success(`Removed ${toRemove.length} members successfully!`)
            setSelectedIds(new Set())
            fetchMembers(currentPage)
        } catch (err) {
            console.error('Bulk remove failed:', err)
            toast.error('Failed to remove selected members.')
        } finally {
            setIsBulkRemoving(false)
            setBulkConfirmOpen(false)
        }
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
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${memberTab === 'add-user'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                            }`}
                    >
                        <UserPlus className="h-4 w-4" />
                        Add User
                    </button>
                    <button
                        onClick={() => setMemberTab('import-excel')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${memberTab === 'import-excel'
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
                                        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-indigo-600" />
                                                <h4 className="text-sm font-semibold text-indigo-800">Invite External User</h4>
                                            </div>
                                            <p className="text-xs text-indigo-700">
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
                                                    <Select value={externalRole} onValueChange={(v) => { setExternalRole(v); setExternalTrackIds([]); }}>
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

                                            {/* Track selector for track-bound roles (multi-select) */}
                                            {TRACK_BOUND_ROLES.includes(externalRole) && (
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-700">
                                                        Tracks <span className="text-red-500">*</span>
                                                        {externalTrackIds.length > 0 && (
                                                            <span className="ml-1 text-indigo-600">({externalTrackIds.length} selected)</span>
                                                        )}
                                                    </label>
                                                    {tracks.length === 0 ? (
                                                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                                            No tracks available. Please create tracks first in Config Tracks.
                                                        </p>
                                                    ) : (
                                                        <div className="rounded-md border bg-white max-h-40 overflow-y-auto">
                                                            {tracks.map((t) => {
                                                                const isChecked = externalTrackIds.includes(String(t.id))
                                                                return (
                                                                    <label
                                                                        key={t.id}
                                                                        className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50/50 transition-colors border-b last:border-b-0"
                                                                    >
                                                                        <Checkbox
                                                                            checked={isChecked}
                                                                            onCheckedChange={(checked) => {
                                                                                setExternalTrackIds(prev =>
                                                                                    checked
                                                                                        ? [...prev, String(t.id)]
                                                                                        : prev.filter(id => id !== String(t.id))
                                                                                )
                                                                            }}
                                                                        />
                                                                        <span>{t.name}</span>
                                                                    </label>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/80 border rounded-md px-3 py-2">
                                                <span>Email:</span>
                                                <strong>{searchEmail}</strong>
                                            </div>

                                            <Button
                                                size="sm"
                                                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                                                disabled={
                                                    isSendingInvite ||
                                                    !externalName.trim() ||
                                                    (TRACK_BOUND_ROLES.includes(externalRole) && externalTrackIds.length === 0)
                                                }
                                                onClick={async () => {
                                                    const nameErr = V.maxLen(externalName.trim(), 100)
                                                    if (nameErr) {
                                                        toast.error(`Recipient Name: ${nameErr}`)
                                                        return
                                                    }
                                                    if (TRACK_BOUND_ROLES.includes(externalRole) && externalTrackIds.length === 0) {
                                                        toast.error("Please select at least one track for this role.")
                                                        return
                                                    }
                                                    setIsSendingInvite(true)
                                                    try {
                                                        await sendExternalInvitation({
                                                            email: searchEmail.trim(),
                                                            recipientName: externalName.trim(),
                                                            conferenceId,
                                                            assignedRole: externalRole,
                                                            trackId: TRACK_BOUND_ROLES.includes(externalRole) && externalTrackIds.length > 0
                                                                ? parseInt(externalTrackIds[0])
                                                                : undefined,
                                                            trackName: TRACK_BOUND_ROLES.includes(externalRole) && externalTrackIds.length > 0
                                                                ? tracks.find(t => String(t.id) === externalTrackIds[0])?.name
                                                                : undefined,
                                                            conferenceName: conference?.name,
                                                        })
                                                        toast.success(`Invitation email sent to ${searchEmail}`)
                                                        setShowExternalInvite(false)
                                                        setSearchError(null)
                                                        setSearchEmail("")
                                                        setExternalName("")
                                                        setExternalTrackIds([])
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
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs"
                        onClick={handleExportCSV}
                        disabled={isLoadingMembers || members.length === 0}
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export CSV
                    </Button>
                </div>

                {/* Filter Toolbar */}
                {!isLoadingMembers && members.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Inline Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or email..."
                                className="pl-9 h-9 text-sm"
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                            />
                        </div>
                        <FilterPanel
                            groups={[
                                {
                                    label: 'Role',
                                    type: 'radio',
                                    options: [
                                        { value: 'all', label: 'All Roles' },
                                        { value: 'CONFERENCE_CHAIR', label: 'Conference Chair' },
                                        { value: 'PROGRAM_CHAIR', label: 'Program Chair' },
                                        { value: 'REVIEWER', label: 'Reviewer' },
                                        { value: 'AUTHOR', label: 'Author' },
                                        { value: 'ATTENDEE', label: 'Attendee' },
                                    ],
                                    value: roleFilter,
                                    onChange: (v) => { setRoleFilter(v); setCurrentPage(0) },
                                },
                            ]}
                        />
                    </div>
                )}

                {/* Bulk Actions Bar */}
                {selectedIds.size > 0 && (
                    <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="h-4 w-4 text-indigo-600" />
                            <span className="text-sm font-medium text-indigo-700">
                                {selectedIds.size} member{selectedIds.size > 1 ? 's' : ''} selected
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-gray-600 hover:text-gray-800"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Clear
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="text-xs gap-1.5"
                                onClick={() => setBulkConfirmOpen(true)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove Selected
                            </Button>
                        </div>
                    </div>
                )}

                {isLoadingMembers ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : members.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                        No members found. Use the search above to add users.
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No members match the current filter.
                    </div>
                ) : (
                    <div className="rounded-lg border overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="w-10 text-center">
                                            <Checkbox
                                                checked={selectedIds.size === filteredMembers.length && filteredMembers.length > 0}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead className="w-12 text-center">#</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="w-28 text-center">Status</TableHead>
                                        <TableHead className="w-32 text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMembers.map((member, idx) => {
                                        const roleGroups = formatRoles(member.roles)
                                        const status = getAcceptanceStatus(member.roles)
                                        return (
                                            <TableRow key={member.user.id} className={selectedIds.has(member.user.id) ? 'bg-indigo-50/50' : ''}>
                                                {/* Checkbox */}
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={selectedIds.has(member.user.id)}
                                                        onCheckedChange={() => toggleSelect(member.user.id)}
                                                    />
                                                </TableCell>
                                                {/* # */}
                                                <TableCell className="text-center text-xs text-muted-foreground font-medium">
                                                    {currentPage * 10 + idx + 1}
                                                </TableCell>

                                                {/* Name + Email */}
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                                                            {(member.user.fullName ?? "?")[0]?.toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <UserLink userId={member.user.id} name={member.user.fullName ?? ''} className="font-medium text-sm truncate" />
                                                            <p className="text-xs text-muted-foreground truncate" title={member.user.email}>{member.user.email}</p>
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
                                                            aria-label="View member details"
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
                                                            aria-label="Manage member roles"
                                                            onClick={() => openManageRoles(member.user, member.roles)}
                                                        >
                                                            <Settings2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                                                            title="Remove Member"
                                                            aria-label="Remove member"
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
                    </div>
                )}

                <StandardPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalElements={totalElements}
                    entityName="members"
                    onPageChange={(page) => fetchMembers(page)}
                />
            </div>

            {/* ── Member Detail Dialog ─────────────────── */}
            <MemberDetailDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                member={detailMember}
                tracks={tracks}
                formatRoles={formatRoles}
                getAcceptanceStatus={getAcceptanceStatus}
                onManageRoles={() => {
                    setDetailOpen(false)
                    if (detailMember) openManageRoles(detailMember.user, detailMember.roles)
                }}
            />

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

            {/* ── Bulk Remove Confirmation ────────────── */}
            <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {selectedIds.size} Members</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{selectedIds.size}</strong> selected member{selectedIds.size > 1 ? 's' : ''} from this conference?
                            This will remove all their assigned roles and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkRemoving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkRemove}
                            disabled={isBulkRemoving}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isBulkRemoving ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Removing...</>
                            ) : (
                                `Remove ${selectedIds.size} Members`
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
