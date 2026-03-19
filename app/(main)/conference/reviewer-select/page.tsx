'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserRoleAssignments, acceptInvitation, declineInvitation } from '@/app/api/conference-user-track.api'
import { getConference } from '@/app/api/conference.api'
import { getTracksByConference } from '@/app/api/track.api'
import { getTrackReviewSettings } from '@/app/api/track.api'
import { useUserRoles } from '@/hooks/useUserConferenceRoles'
import type { ConferenceUserTrackResponse } from '@/types/notification'
import { Card, CardContent } from '@/components/ui/card'
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
import { Loader2, ArrowRight, Calendar, MapPin, ShieldAlert, Check, X, Clock, CheckCircle2, Info } from 'lucide-react'
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

interface ReviewerInvitation {
    conferenceId: number
    conference: ConferenceInfo | null
    isAccepted: boolean | null
    assignedAt: string
    trackIds: number[]
}

export default function ReviewerSelectPage() {
    const router = useRouter()
    const { userId, refreshRoles } = useUserRoles()
    const [invitations, setInvitations] = useState<ReviewerInvitation[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

    // Quota modal state
    const [quotaModalOpen, setQuotaModalOpen] = useState(false)
    const [selectedConferenceId, setSelectedConferenceId] = useState<number | null>(null)
    const [selectedConferenceName, setSelectedConferenceName] = useState<string>('')
    const [quotaValue, setQuotaValue] = useState<string>('')

    const fetchInvitations = useCallback(async () => {
        if (!userId) {
            setLoading(false)
            return
        }
        try {
            const roles = await getUserRoleAssignments(userId)
            // Filter reviewer roles and group by conferenceId
            const reviewerRoles = roles.filter((r: ConferenceUserTrackResponse) => r.assignedRole === 'REVIEWER')

            const grouped = new Map<number, { isAccepted: boolean | null; assignedAt: string; trackIds: number[] }>()
            for (const r of reviewerRoles) {
                if (!grouped.has(r.conferenceId)) {
                    grouped.set(r.conferenceId, {
                        isAccepted: r.isAccepted,
                        assignedAt: r.invitedAt || r.createdAt,
                        trackIds: []
                    })
                }
                if (r.conferenceTrackId) {
                    grouped.get(r.conferenceId)!.trackIds.push(r.conferenceTrackId)
                }
            }

            // Fetch conference details for each unique conference
            const invitationsList: ReviewerInvitation[] = []
            await Promise.all(
                Array.from(grouped.entries()).map(async ([confId, data]) => {
                    let conf: ConferenceInfo | null = null
                    try {
                        conf = await getConference(confId)
                    } catch { /* ignore */ }
                    invitationsList.push({
                        conferenceId: confId,
                        conference: conf,
                        isAccepted: data.isAccepted,
                        assignedAt: data.assignedAt,
                        trackIds: data.trackIds,
                    })
                })
            )

            // Sort: pending first, then accepted, then declined
            invitationsList.sort((a, b) => {
                const order = (v: boolean | null) => v === null ? 0 : v === true ? 1 : 2
                return order(a.isAccepted) - order(b.isAccepted)
            })

            setInvitations(invitationsList)
        } catch (err) {
            console.error('Failed to load reviewer invitations:', err)
        } finally {
            setLoading(false)
        }
    }, [userId])

    useEffect(() => {
        fetchInvitations()
    }, [fetchInvitations])

    /**
     * Check if allowReviewerQuota is enabled for any track in this conference.
     * If the invitation has specific trackIds, check those; otherwise check all conference tracks.
     */
    const checkAllowReviewerQuota = async (conferenceId: number, trackIds: number[]): Promise<boolean> => {
        try {
            let tracksToCheck = trackIds
            if (tracksToCheck.length === 0) {
                // Fallback: get all tracks for this conference
                const tracks = await getTracksByConference(conferenceId)
                tracksToCheck = tracks.map(t => t.id)
            }
            // Check if any track has allowReviewerQuota enabled
            const results = await Promise.all(
                tracksToCheck.map(async (trackId) => {
                    try {
                        const settings = await getTrackReviewSettings(trackId)
                        return settings.allowReviewerQuota === true
                    } catch {
                        return false
                    }
                })
            )
            return results.some(r => r)
        } catch {
            return false
        }
    }

    const handleAcceptClick = async (inv: ReviewerInvitation) => {
        if (!userId) return
        setActionLoadingId(inv.conferenceId)
        try {
            const quotaAllowed = await checkAllowReviewerQuota(inv.conferenceId, inv.trackIds)
            if (quotaAllowed) {
                // Show quota modal
                setSelectedConferenceId(inv.conferenceId)
                setSelectedConferenceName(inv.conference?.name || `Conference #${inv.conferenceId}`)
                setQuotaValue('')
                setQuotaModalOpen(true)
                setActionLoadingId(null)
            } else {
                // Accept directly without quota
                await acceptInvitation(userId, inv.conferenceId)
                toast.success('Invitation accepted!')
                await refreshRoles()
                await fetchInvitations()
                setActionLoadingId(null)
            }
        } catch (err) {
            console.error('Failed to accept:', err)
            toast.error('Failed to accept invitation.')
            setActionLoadingId(null)
        }
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
            toast.success(quota ? `Invitation accepted with quota of ${quota} papers!` : 'Invitation accepted!')
            await refreshRoles()
            await fetchInvitations()
        } catch (err) {
            console.error('Failed to accept:', err)
            toast.error('Failed to accept invitation.')
        } finally {
            setActionLoadingId(null)
        }
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
        } catch (err) {
            console.error('Failed to accept:', err)
            toast.error('Failed to accept invitation.')
        } finally {
            setActionLoadingId(null)
        }
    }

    const handleDecline = async (conferenceId: number) => {
        if (!userId) return
        setActionLoadingId(conferenceId)
        try {
            await declineInvitation(userId, conferenceId)
            toast.success('Invitation declined.')
            await refreshRoles()
            await fetchInvitations()
        } catch (err) {
            console.error('Failed to decline:', err)
            toast.error('Failed to decline invitation.')
        } finally {
            setActionLoadingId(null)
        }
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const pendingInvitations = invitations.filter(i => i.isAccepted === null)
    const acceptedInvitations = invitations.filter(i => i.isAccepted === true)
    const declinedInvitations = invitations.filter(i => i.isAccepted === false)

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Reviewer Console</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your reviewer invitations and access conference review dashboards.
                </p>
            </div>

            {invitations.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                        <p className="font-medium text-gray-600">No reviewer invitations</p>
                        <p className="text-sm mt-1">You haven&apos;t been invited as a reviewer for any conference yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* ── Pending Invitations ── */}
                    {pendingInvitations.length > 0 && (
                        <section>
                            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-amber-500" />
                                Pending Invitations
                                <Badge variant="secondary" className="ml-1">{pendingInvitations.length}</Badge>
                            </h2>
                            <div className="grid gap-4">
                                {pendingInvitations.map(inv => (
                                    <Card key={inv.conferenceId} className="border-amber-200 bg-amber-50/30">
                                        <CardContent className="p-5">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {inv.conference?.name || `Conference #${inv.conferenceId}`}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                                                        {inv.conference?.startDate && (
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                {formatDate(inv.conference.startDate)} — {formatDate(inv.conference.endDate || '')}
                                                            </span>
                                                        )}
                                                        {inv.conference?.location && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="h-3.5 w-3.5" />
                                                                {inv.conference.location}
                                                            </span>
                                                        )}
                                                        {inv.conference?.acronym && <Badge variant="secondary">{inv.conference.acronym}</Badge>}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        Invited on {formatDate(inv.assignedAt)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                                        onClick={() => handleDecline(inv.conferenceId)}
                                                        disabled={actionLoadingId === inv.conferenceId}
                                                    >
                                                        {actionLoadingId === inv.conferenceId ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <><X className="h-4 w-4 mr-1" /> Decline</>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => handleAcceptClick(inv)}
                                                        disabled={actionLoadingId === inv.conferenceId}
                                                    >
                                                        {actionLoadingId === inv.conferenceId ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <><Check className="h-4 w-4 mr-1" /> Accept</>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Accepted — Active Conferences ── */}
                    {acceptedInvitations.length > 0 && (
                        <section>
                            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                Active Conferences
                                <Badge variant="secondary" className="ml-1">{acceptedInvitations.length}</Badge>
                            </h2>
                            <div className="grid gap-4">
                                {acceptedInvitations.map(inv => (
                                    <Card key={inv.conferenceId} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-gray-900">
                                                    {inv.conference?.name || `Conference #${inv.conferenceId}`}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                                                    {inv.conference?.startDate && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {formatDate(inv.conference.startDate)} — {formatDate(inv.conference.endDate || '')}
                                                        </span>
                                                    )}
                                                    {inv.conference?.location && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="h-3.5 w-3.5" />
                                                            {inv.conference.location}
                                                        </span>
                                                    )}
                                                    {inv.conference?.acronym && <Badge variant="secondary">{inv.conference.acronym}</Badge>}
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/conference/${inv.conferenceId}/reviewer`)}
                                            >
                                                Open Console <ArrowRight className="ml-1.5 h-4 w-4" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Declined ── */}
                    {declinedInvitations.length > 0 && (
                        <section>
                            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <X className="h-5 w-5 text-gray-400" />
                                Declined
                                <Badge variant="secondary" className="ml-1">{declinedInvitations.length}</Badge>
                            </h2>
                            <div className="grid gap-4">
                                {declinedInvitations.map(inv => (
                                    <Card key={inv.conferenceId} className="opacity-60">
                                        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-medium text-gray-600 line-through">
                                                    {inv.conference?.name || `Conference #${inv.conferenceId}`}
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    You declined this invitation.
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleAcceptClick(inv)}
                                                disabled={actionLoadingId === inv.conferenceId}
                                            >
                                                {actionLoadingId === inv.conferenceId ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    'Reconsider'
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}

            {/* ── Reviewer Quota Modal ── */}
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
                            <label htmlFor="reviewer-quota-input" className="text-sm font-medium text-gray-700">
                                Maximum papers to review
                            </label>
                            <Input
                                id="reviewer-quota-input"
                                type="number"
                                min={1}
                                max={50}
                                placeholder="e.g. 5"
                                value={quotaValue}
                                onChange={(e) => setQuotaValue(e.target.value)}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                                Optional — leave empty to use the conference default limit.
                            </p>
                        </div>

                        <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 border border-blue-100 p-3">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-blue-700">
                                Your quota will be used during paper assignment to limit the number of papers assigned to you. You can update this later from your reviewer settings.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={handleSkipQuota}
                        >
                            Skip
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleAcceptWithQuota}
                        >
                            <Check className="h-4 w-4 mr-1.5" />
                            Accept {quotaValue ? `& Set Quota (${quotaValue})` : '& Set Quota'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
