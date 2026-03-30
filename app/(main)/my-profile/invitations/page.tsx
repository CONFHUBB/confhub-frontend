'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserRoleAssignments, acceptInvitation, declineInvitation } from '@/app/api/conference-user-track.api'
import { getConference } from '@/app/api/conference.api'
import { getTracksByConference, getTrackReviewSettings } from '@/app/api/track.api'
import { useUserRoles } from '@/hooks/useUserConferenceRoles'
import type { ConferenceUserTrackResponse } from '@/types/notification'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { 
    Loader2, ArrowRight, Calendar, MapPin, Search, Filter, 
    X, ChevronLeft, ChevronRight, Check, Info, FolderOpen, Mail
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import toast from 'react-hot-toast'

interface ConferenceInfo {
    id: number
    name: string
    acronym: string
    location?: string
    startDate?: string
    endDate?: string
    status?: string
}

interface RoleInvitation {
    conferenceId: number
    conference: ConferenceInfo | null
    isAccepted: boolean | null
    assignedAt: string
    trackIds: number[]
    roles: string[]
}

export default function MyInvitationsPage() {
    const router = useRouter()
    const { userId, refreshRoles } = useUserRoles()
    const [invitations, setInvitations] = useState<RoleInvitation[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

    // Quota modal state
    const [quotaModalOpen, setQuotaModalOpen] = useState(false)
    const [selectedConferenceId, setSelectedConferenceId] = useState<number | null>(null)
    const [selectedConferenceName, setSelectedConferenceName] = useState<string>('')
    const [quotaValue, setQuotaValue] = useState<string>('')

    // Table state
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'DECLINED'>('ALL')
    const [currentPage, setCurrentPage] = useState(0)
    const PAGE_SIZE = 10

    const fetchInvitations = useCallback(async () => {
        if (!userId) { setLoading(false); return }
        try {
            const rolesObj = await getUserRoleAssignments(userId)
            const invitationRoles = rolesObj.filter((r: ConferenceUserTrackResponse) => r.invitedAt != null && r.isAccepted !== undefined)

            const grouped = new Map<number, { isAccepted: boolean | null; assignedAt: string; trackIds: number[], roles: Set<string> }>()
            for (const r of invitationRoles) {
                if (!grouped.has(r.conferenceId)) {
                    grouped.set(r.conferenceId, { isAccepted: r.isAccepted, assignedAt: r.invitedAt || r.createdAt, trackIds: [], roles: new Set<string>() })
                }
                const group = grouped.get(r.conferenceId)!
                if (r.conferenceTrackId) group.trackIds.push(r.conferenceTrackId)
                group.roles.add(r.assignedRole)
                if (r.isAccepted === null) group.isAccepted = null
            }

            const invitationsList: RoleInvitation[] = []
            await Promise.all(
                Array.from(grouped.entries()).map(async ([confId, data]) => {
                    let conf: ConferenceInfo | null = null
                    try { conf = await getConference(confId) } catch { /* ignore */ }
                    invitationsList.push({ conferenceId: confId, conference: conf, isAccepted: data.isAccepted, assignedAt: data.assignedAt, trackIds: data.trackIds, roles: Array.from(data.roles) })
                })
            )

            invitationsList.sort((a, b) => {
                const order = (v: boolean | null) => v === null ? 0 : v === true ? 1 : 2
                return order(a.isAccepted) - order(b.isAccepted)
            })
            setInvitations(invitationsList)
        } catch (err) { console.error('Failed to load invitations:', err) }
        finally { setLoading(false) }
    }, [userId])

    useEffect(() => { fetchInvitations() }, [fetchInvitations])

    const checkAllowReviewerQuota = async (conferenceId: number, trackIds: number[]): Promise<boolean> => {
        try {
            let tracksToCheck = trackIds
            if (tracksToCheck.length === 0) {
                const tracks = await getTracksByConference(conferenceId)
                tracksToCheck = tracks.map(t => t.id)
            }
            const results = await Promise.all(tracksToCheck.map(async (trackId) => { try { const s = await getTrackReviewSettings(trackId); return s.allowReviewerQuota === true } catch { return false } }))
            return results.some(r => r)
        } catch { return false }
    }

    const getRedirectUrl = (roles: string[], conferenceId: number) => {
        if (roles.includes('CONFERENCE_CHAIR')) return `/conference/my-conference`
        if (roles.includes('PROGRAM_CHAIR')) return `/conference/program-conference`
        if (roles.includes('REVIEWER')) return `/conference/${conferenceId}/reviewer`
        return `/conference/${conferenceId}`
    }

    const handleAcceptClick = async (inv: RoleInvitation) => {
        if (!userId) return
        setActionLoadingId(inv.conferenceId)
        try {
            if (inv.roles.includes('REVIEWER')) {
                const quotaAllowed = await checkAllowReviewerQuota(inv.conferenceId, inv.trackIds)
                if (quotaAllowed) {
                    setSelectedConferenceId(inv.conferenceId)
                    setSelectedConferenceName(inv.conference?.name || `Conference #${inv.conferenceId}`)
                    setQuotaValue('')
                    setQuotaModalOpen(true)
                    setActionLoadingId(null)
                    return
                }
            }
            await acceptInvitation(userId, inv.conferenceId)
            toast.success('Invitation accepted!')
            await refreshRoles()
            await fetchInvitations()
        } catch (err) {
            console.error('Failed to accept:', err)
            toast.error('Failed to accept invitation.')
        } finally { setActionLoadingId(null) }
    }

    const handleAcceptWithQuota = async () => {
        if (!userId || !selectedConferenceId) return
        setQuotaModalOpen(false)
        setActionLoadingId(selectedConferenceId)
        try {
            const quota = quotaValue ? parseInt(quotaValue, 10) : undefined
            if (quota !== undefined && (isNaN(quota) || quota < 1 || quota > 50)) {
                toast.error('Quota must be between 1 and 50.')
                setActionLoadingId(null)
                return
            }
            await acceptInvitation(userId, selectedConferenceId, quota)
            toast.success(quota ? `Accepted with quota of ${quota} papers!` : 'Invitation accepted!')
            await refreshRoles()
            await fetchInvitations()
        } catch (err) { console.error('Failed to accept:', err); toast.error('Failed to accept invitation.') }
        finally { setActionLoadingId(null) }
    }

    const handleSkipQuota = async () => {
        if (!userId || !selectedConferenceId) return
        setQuotaModalOpen(false)
        setActionLoadingId(selectedConferenceId)
        try {
            await acceptInvitation(userId, selectedConferenceId)
            toast.success('Invitation accepted!')
            await refreshRoles()
            await fetchInvitations()
        } catch (err) { console.error('Failed to accept:', err); toast.error('Failed to accept invitation.') }
        finally { setActionLoadingId(null) }
    }

    const handleDecline = async (conferenceId: number) => {
        if (!userId) return
        setActionLoadingId(conferenceId)
        try {
            await declineInvitation(userId, conferenceId)
            toast.success('Invitation declined.')
            await refreshRoles()
            await fetchInvitations()
        } catch (err) { console.error('Failed to decline:', err); toast.error('Failed to decline invitation.') }
        finally { setActionLoadingId(null) }
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    const filteredInvitations = invitations.filter(inv => {
        if (statusFilter === 'PENDING' && inv.isAccepted !== null) return false
        if (statusFilter === 'ACCEPTED' && inv.isAccepted !== true) return false
        if (statusFilter === 'DECLINED' && inv.isAccepted !== false) return false
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            if (!inv.conference?.name.toLowerCase().includes(q)
                && !inv.conference?.acronym.toLowerCase().includes(q)
                && !inv.conference?.location?.toLowerCase().includes(q)) return false
        }
        return true
    })

    const totalPages = Math.ceil(filteredInvitations.length / PAGE_SIZE)
    const pagedInvitations = filteredInvitations.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
    useEffect(() => { setCurrentPage(0) }, [searchQuery, statusFilter])

    const stats = {
        total: invitations.length,
        pending: invitations.filter(i => i.isAccepted === null).length,
        accepted: invitations.filter(i => i.isAccepted === true).length,
        declined: invitations.filter(i => i.isAccepted === false).length,
    }

    const roleConfig: Record<string, { label: string; color: string }> = {
        'REVIEWER': { label: 'Reviewer', color: 'bg-blue-100 text-blue-700' },
        'PROGRAM_CHAIR': { label: 'Program Chair', color: 'bg-purple-100 text-purple-700' },
        'CONFERENCE_CHAIR': { label: 'Conference Chair', color: 'bg-indigo-100 text-indigo-700' },
        'TRACK_CHAIR': { label: 'Track Chair', color: 'bg-teal-100 text-teal-700' },
        'AUTHOR': { label: 'Author', color: 'bg-orange-100 text-orange-700' },
        'ATTENDEE': { label: 'Attendee', color: 'bg-gray-100 text-gray-700' },
    }

    if (loading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2.5">
                    <Mail className="h-5 w-5 text-amber-600" />
                    My Invitations
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Accept or decline conference role invitations
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total", value: stats.total, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
                    { label: "Pending", value: stats.pending, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
                    { label: "Accepted", value: stats.accepted, color: "text-green-600", bg: "bg-green-50 border-green-100" },
                    { label: "Declined", value: stats.declined, color: "text-gray-600", bg: "bg-gray-50 border-gray-100" },
                ].map((stat) => (
                    <div key={stat.label} className={`rounded-xl border p-3 ${stat.bg}`}>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name, acronym, or location..." className="pl-9 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="w-full sm:w-40 h-9">
                        <div className="flex items-center gap-2">
                            <Filter className="h-3.5 w-3.5" />
                            <SelectValue placeholder="Filter status" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="ACCEPTED">Accepted</SelectItem>
                        <SelectItem value="DECLINED">Declined</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            {invitations.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
                    <FolderOpen className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-base font-semibold text-gray-700">No invitations yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">You have not received any conference invitations yet.</p>
                </div>
            ) : filteredInvitations.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 py-10 text-center">
                    <Search className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-muted-foreground">No invitations match your filters.</p>
                    <Button variant="link" className="mt-1 text-indigo-600" onClick={() => { setSearchQuery(""); setStatusFilter("ALL") }}>
                        Clear all filters
                    </Button>
                </div>
            ) : (
                <div className="rounded-xl border bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/30 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">#</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Conference</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Role</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {pagedInvitations.map((inv, idx) => (
                                    <tr key={inv.conferenceId} className="transition-colors hover:bg-indigo-50/30">
                                        <td className="px-4 py-3 text-xs text-muted-foreground font-medium">
                                            {currentPage * PAGE_SIZE + idx + 1}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium truncate max-w-[200px]">{inv.conference?.name || `Conference #${inv.conferenceId}`}</p>
                                            <p className="text-xs font-mono text-muted-foreground mt-0.5">{inv.conference?.acronym}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {inv.roles.map(role => {
                                                    const cfg = roleConfig[role] || { label: role, color: 'bg-gray-100 text-gray-600' }
                                                    return (
                                                        <Badge key={role} variant="outline" className={`text-[10px] font-semibold border-transparent ${cfg.color}`}>
                                                            {cfg.label}
                                                        </Badge>
                                                    )
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                                <Calendar className="size-3.5 shrink-0" />
                                                {inv.conference?.startDate ? formatDate(inv.conference.startDate) : 'TBA'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={`text-[10px] font-semibold border-transparent ${
                                                inv.isAccepted === null ? "bg-amber-100 text-amber-700" :
                                                inv.isAccepted === true ? "bg-green-100 text-green-700" :
                                                "bg-gray-100 text-gray-700"
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                    inv.isAccepted === null ? "bg-amber-600" :
                                                    inv.isAccepted === true ? "bg-green-600" : "bg-gray-600"
                                                }`} />
                                                {inv.isAccepted === null ? 'PENDING' : inv.isAccepted === true ? 'ACCEPTED' : 'DECLINED'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {inv.isAccepted === null ? (
                                                    <>
                                                        <Button variant="outline" size="sm" disabled={actionLoadingId === inv.conferenceId} onClick={() => handleAcceptClick(inv)} className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800">
                                                            {actionLoadingId === inv.conferenceId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                            Accept
                                                        </Button>
                                                        <Button variant="outline" size="sm" disabled={actionLoadingId === inv.conferenceId} onClick={() => handleDecline(inv.conferenceId)} className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                                                            <X className="h-3.5 w-3.5" />
                                                            Decline
                                                        </Button>
                                                    </>
                                                ) : inv.isAccepted === true ? (
                                                    <Button variant="outline" size="sm" onClick={() => router.push(getRedirectUrl(inv.roles, inv.conferenceId))} className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
                                                        Open Workspace <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">Declined</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted-foreground">
                        Page {currentPage + 1} of {totalPages} · {filteredInvitations.length} invitation{filteredInvitations.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-1">
                        <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <Button key={i} variant={i === currentPage ? "default" : "outline"} size="sm"
                                className={`w-8 h-8 p-0 text-xs ${i === currentPage ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                                onClick={() => setCurrentPage(i)}>
                                {i + 1}
                            </Button>
                        ))}
                        <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Reviewer Quota Modal */}
            <Dialog open={quotaModalOpen} onOpenChange={setQuotaModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Set Your Review Quota</DialogTitle>
                        <DialogDescription>
                            How many papers would you like to review for <span className="font-medium text-foreground">{selectedConferenceName}</span>?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label htmlFor="quota-input" className="text-sm font-medium text-gray-700">Maximum papers to review</label>
                            <Input id="quota-input" type="number" min={1} max={50} placeholder="e.g. 5" value={quotaValue} onChange={(e) => setQuotaValue(e.target.value)} className="w-full" />
                            <p className="text-xs text-muted-foreground">Optional — leave empty to use the conference default limit.</p>
                        </div>
                        <div className="flex items-start gap-2.5 rounded-lg bg-indigo-50 border border-blue-100 p-3">
                            <Info className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-indigo-700">Your quota will be used during paper assignment to limit the number of papers assigned to you.</p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={handleSkipQuota}>Skip</Button>
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleAcceptWithQuota}>
                            <Check className="h-4 w-4 mr-1.5" />
                            Accept {quotaValue ? `& Set Quota (${quotaValue})` : '& Set Quota'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
