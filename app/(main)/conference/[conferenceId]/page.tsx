'use client'

import { useEffect, useState } from 'react'
import { fmtDate } from '@/lib/utils'
import { useParams, useRouter } from 'next/navigation'
import { approveConference, getConference, getConferenceActivities, getConferences, rejectConference } from '@/app/api/conference.api'
import { getTracksByConference } from '@/app/api/track.api'
import { getPapersByConference } from '@/app/api/paper.api'
import { getUserRoleAssignments, acceptInvitation, declineInvitation } from '@/app/api/conference-user-track.api'
import { getMyTicket, type TicketResponse } from '@/app/api/registration.api'
import { toast } from 'sonner'
import type { ConferenceActivityDTO, ConferenceResponse, ConferenceListResponse, TrackResponse } from '@/types/conference'
import type { ConferenceUserTrackResponse } from '@/types/notification'
import type { PaperResponse } from '@/types/paper'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, ExternalLink, Loader2, Globe, Phone, FileText, Clock, Send, Ticket, BookOpen, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Building2, Mail, Users, ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { ProgramViewer } from '@/components/program-viewer'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { isActivityOpen } from '@/lib/activity'
import { useUserRoles } from '@/hooks/useUserConferenceRoles'
import { useUserRole } from '@/hooks/useUserRole'
import { ConferenceFeedback } from '@/components/conference-feedback'
import { Breadcrumb } from '@/components/shared/breadcrumb'
import { DetailPageSkeleton } from '@/components/shared/skeletons'
import { ConferencePhaseTracker } from '@/components/conference-phase-tracker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'

type ApiError = {
    response?: {
        status?: number
        data?: {
            message?: string
        }
    }
}

export default function ConferenceDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { userId, refreshRoles } = useUserRoles()
    const { isAdminOrStaff } = useUserRole()
    const [pendingInvitations, setPendingInvitations] = useState<ConferenceUserTrackResponse[]>([])
    const [invitationActionLoading, setInvitationActionLoading] = useState(false)
    const [moderationAction, setModerationAction] = useState<'approve' | 'reject' | null>(null)
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [isCheckedIn, setIsCheckedIn] = useState(false)
    const [hasTicket, setHasTicket] = useState(false)
    const [showProgramPopup, setShowProgramPopup] = useState(false)
    const [programData, setProgramData] = useState<Record<string, unknown> | null>(null)
    const [allPapers, setAllPapers] = useState<PaperResponse[]>([])
    const [similarConferences, setSimilarConferences] = useState<ConferenceListResponse[]>([])
    const getApiErrorMessage = (error: unknown) => (error as ApiError)?.response?.data?.message

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const [conferenceData, tracksData, activitiesData, userRoles] = await Promise.all([
                    getConference(conferenceId),
                    getTracksByConference(conferenceId),
                    getConferenceActivities(conferenceId).catch(() => [] as ConferenceActivityDTO[]),
                    userId ? getUserRoleAssignments(userId).catch(() => []) : Promise.resolve([])
                ])
                setConference(conferenceData)
                setTracks(tracksData)
                setActivities(activitiesData)
                setPendingInvitations(userRoles.filter((r: ConferenceUserTrackResponse) => r.conferenceId === conferenceId && r.isAccepted === null))

                if (userId) {
                    try {
                        const ticket = await getMyTicket(conferenceId, userId)
                        if (ticket) {
                            setHasTicket(true)
                            if (ticket.isCheckedIn || (ticket as TicketResponse & { checkedIn?: boolean }).checkedIn) setIsCheckedIn(true)
                        }
                    } catch { }
                }

                if (conferenceData.programSchedule) {
                    try {
                        const parsed = typeof conferenceData.programSchedule === 'string'
                            ? JSON.parse(conferenceData.programSchedule) : conferenceData.programSchedule
                        if (parsed?.published) {
                            setProgramData(parsed.schedule ? parsed : null)
                            const papersData = await getPapersByConference(conferenceId)
                            setAllPapers(papersData.filter((p: PaperResponse) => p.status === 'ACCEPTED'))
                        }
                    } catch { }
                }

                // Similar / other conferences — same area first, then the rest
                try {
                    const allConfs = await getConferences()
                    const currentArea = conferenceData.area?.toLowerCase() || ''
                    const others = allConfs.filter(c => c.id !== conferenceId)
                    // Sort: same area first
                    others.sort((a, b) => {
                        const aMatch = a.area?.toLowerCase() === currentArea && currentArea !== '' ? 0 : 1
                        const bMatch = b.area?.toLowerCase() === currentArea && currentArea !== '' ? 0 : 1
                        return aMatch - bMatch
                    })
                    setSimilarConferences(others.slice(0, 8))
                } catch { }
            } catch (err: unknown) {
                const apiError = err as ApiError
                if (apiError.response?.status === 401 || apiError.response?.status === 403) {
                    setError('You must be logged in to view this conference.')
                    setTimeout(() => router.push('/auth/login'), 2000)
                } else {
                    setError('Failed to load conference details. Please try again later.')
                }
            } finally {
                setLoading(false)
            }
        }
        if (conferenceId) fetchData()
    }, [conferenceId, router, userId])

    const handleAcceptInvitation = async () => {
        if (!userId || !conferenceId) return
        try {
            setInvitationActionLoading(true)
            await acceptInvitation(userId, conferenceId)
            toast.success('Invitation accepted!')
            setPendingInvitations([])
            await refreshRoles()
        } catch { toast.error('Failed to accept invitation.') }
        finally { setInvitationActionLoading(false) }
    }

    const handleDeclineInvitation = async () => {
        if (!userId || !conferenceId) return
        try {
            setInvitationActionLoading(true)
            await declineInvitation(userId, conferenceId)
            toast.success('Invitation declined.')
            setPendingInvitations([])
            await refreshRoles()
        } catch { toast.error('Failed to decline invitation.') }
        finally { setInvitationActionLoading(false) }
    }

    const handleApproveConference = async () => {
        if (!conference) return
        try {
            setModerationAction('approve')
            await approveConference(conference.id)
            setConference(prev => prev ? { ...prev, status: 'APPROVED', rejectionReason: null } : prev)
            toast.success('Conference approved successfully.')
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err) || 'Failed to approve conference.')
        } finally {
            setModerationAction(null)
        }
    }

    const handleRejectConference = async () => {
        if (!conference || !rejectReason.trim()) return
        try {
            setModerationAction('reject')
            await rejectConference(conference.id, rejectReason.trim())
            setConference(prev => prev ? { ...prev, status: 'REJECTED', rejectionReason: rejectReason.trim() } : prev)
            setShowRejectDialog(false)
            setRejectReason('')
            toast.success('Conference rejected successfully.')
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err) || 'Failed to reject conference.')
        } finally {
            setModerationAction(null)
        }
    }

    const fmt = (d: string) => fmtDate(d)

    const ACTIVITY_LABELS: Record<string, string> = {
        PAPER_SUBMISSION: 'Paper Submission', REVIEWER_BIDDING: 'Reviewer Bidding',
        REVIEW_SUBMISSION: 'Review Submission', REVIEW_DISCUSSION: 'Review Discussion',
        AUTHOR_NOTIFICATION: 'Author Notification', CAMERA_READY_SUBMISSION: 'Camera Ready',
        REGISTRATION: 'Registration', EVENT_DAY: 'Conference Event',
    }

    const isPaperSubmissionOpen = isActivityOpen(activities.find(a => a.activityType === 'PAPER_SUBMISSION'))
    const openActivities = activities.filter(a => isActivityOpen(a))
    const currentActivity = [...openActivities].sort((a, b) => {
        const order = Object.keys(ACTIVITY_LABELS)
        return order.indexOf(a.activityType) - order.indexOf(b.activityType)
    })[0] || null

    if (loading) return <DetailPageSkeleton />
    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <p className="text-destructive text-lg">{error}</p>
            {error.includes('logged in') ? <Link href="/auth/login"><Button>Go to Login</Button></Link>
                : <Button onClick={() => window.location.reload()}>Retry</Button>}
        </div>
    )
    if (!conference) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <p className="text-muted-foreground text-lg">Conference not found</p>
            <Link href="/conference"><Button>Back to Conferences</Button></Link>
        </div>
    )

    const registrationActivity = activities.find(a => a.activityType === 'REGISTRATION')
    const eventDayActivity = activities.find(a => a.activityType === 'EVENT_DAY')
    const canRegister = isActivityOpen(registrationActivity)
    let isProgramPublished = false
    if (conference.programSchedule) {
        try {
            const parsed = typeof conference.programSchedule === 'string'
                ? JSON.parse(conference.programSchedule) : conference.programSchedule
            isProgramPublished = !!parsed?.published
        } catch { }
    }
    const hasProgramAvailable = isProgramPublished || isActivityOpen(eventDayActivity)
    const conferenceStatus = conference.status?.toUpperCase() ?? ''
    const canModeratePendingConference = isAdminOrStaff && conferenceStatus === 'PENDING_APPROVAL'
    const sponsorList = (conference.societySponsor || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    const chairEmailList = (conference.chairEmails || '')
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)

    return (
        <div className="page-wide">
            <Breadcrumb items={[
                { label: 'Conferences', href: '/conference' },
                { label: conference.acronym || conference.name },
            ]} className="mb-5" />

            {/* Invitation banner */}
            {pendingInvitations.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div>
                        <h3 className="font-bold text-amber-900 text-lg">{'\uD83D\uDC4B'} You have been invited</h3>
                        <p className="text-amber-800 mt-1">Join as: {Array.from(new Set(pendingInvitations.map(p => p.assignedRole.replace('_', ' ')))).join(', ')}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button variant="outline" onClick={handleDeclineInvitation} disabled={invitationActionLoading} className="border-amber-300 text-amber-700 hover:bg-amber-100">Decline</Button>
                        <Button onClick={handleAcceptInvitation} disabled={invitationActionLoading} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                            {invitationActionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Accept
                        </Button>
                    </div>
                </div>
            )}

            {/* ═══════ HERO ═══════ */}
            <div className="relative rounded-2xl overflow-hidden mb-8">
                {conference.bannerImageUrl ? (
                    <img src={conference.bannerImageUrl} alt={conference.name} fetchPriority="high" decoding="async"
                        className="w-full h-[280px] lg:h-[340px] object-cover" />
                ) : (
                    <div className="w-full h-[280px] lg:h-[340px] bg-primary" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

                <div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-8">
                    <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                        <span className="text-sm font-mono text-white bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded border border-white/25">
                            {conference.acronym}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold backdrop-blur-sm border ${conference.status?.toUpperCase() === 'ACTIVE' || conference.status?.toUpperCase() === 'APPROVED'
                                ? 'bg-emerald-500/25 text-emerald-100 border-emerald-400/40'
                                : conference.status?.toUpperCase() === 'PENDING_APPROVAL'
                                    ? 'bg-amber-500/25 text-amber-100 border-amber-400/40'
                                    : 'bg-white/15 text-white/80 border-white/25'
                            }`}>
                            {conference.status}
                        </span>
                    </div>

                    <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight max-w-3xl leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                        {conference.name}
                    </h1>
                    {conference.description && (
                        <p className="text-white/80 text-base mt-2 max-w-2xl line-clamp-2 leading-relaxed" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                            {conference.description}
                        </p>
                    )}

                    {/* CTA — solid colored buttons for visibility */}
                    <TooltipProvider delayDuration={200}>
                        <div className="flex gap-3 mt-4 flex-wrap">
                            {hasTicket ? (
                                <Link href={`/conference/${conferenceId}/attendee`}>
                                    <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg font-bold">
                                        <Ticket className="h-5 w-5" /> My Workspace
                                    </Button>
                                </Link>
                            ) : (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex" tabIndex={0} style={{ pointerEvents: 'auto' }}>
                                            <Button size="lg" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg disabled:opacity-40 disabled:pointer-events-none font-bold"
                                                disabled={!canRegister} onClick={() => canRegister && window.location.assign(`/conference/${conferenceId}/register`)}>
                                                <Ticket className="h-5 w-5" /> Register to Attend
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    {!canRegister && (
                                        <TooltipContent side="bottom" className="max-w-xs">
                                            {registrationActivity?.deadline && new Date(registrationActivity.deadline).getTime() < Date.now()
                                                ? 'Registration is closed.' : 'Registration is not open yet.'}
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            )}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="inline-flex" tabIndex={0} style={{ pointerEvents: 'auto' }}>
                                        <Button size="lg"
                                            className="gap-2 bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 disabled:opacity-30 disabled:pointer-events-none font-medium"
                                            disabled={!hasProgramAvailable} onClick={() => hasProgramAvailable && setShowProgramPopup(true)}>
                                            <Calendar className="h-5 w-5" /> View Program
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                {!hasProgramAvailable && (
                                    <TooltipContent side="bottom" className="max-w-xs">Program not yet available</TooltipContent>
                                )}
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                </div>
            </div>

            {/* ═══════ INFO CARDS ═══════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-12 relative z-10 mb-8 px-2 lg:px-4">
                <div className="bg-white dark:bg-card rounded-xl border shadow-lg p-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0"><MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /></div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Location</p>
                    </div>
                    <p className="text-sm font-semibold truncate">{conference.location}{conference.province ? `, ${conference.province}` : ''}</p>
                    {conference.country && <p className="text-xs text-muted-foreground">{conference.country}</p>}
                </div>
                <div className="bg-white dark:bg-card rounded-xl border shadow-lg p-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0"><Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /></div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Event Dates</p>
                    </div>
                    <p className="text-sm font-semibold">{fmt(conference.startDate)}</p>
                    <p className="text-xs text-muted-foreground">to {fmt(conference.endDate)}</p>
                </div>
                <div className="bg-white dark:bg-card rounded-xl border shadow-lg p-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0"><BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tracks</p>
                    </div>
                    <p className="text-2xl font-bold">{tracks.length}</p>
                    <p className="text-xs text-muted-foreground">research track{tracks.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-white dark:bg-card rounded-xl border shadow-lg p-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                            {conference.paperDeadline ? <Clock className="h-4 w-4 text-orange-600" /> : conference.websiteUrl ? <Globe className="h-4 w-4 text-orange-600" /> : <Phone className="h-4 w-4 text-orange-600" />}
                        </div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            {conference.paperDeadline ? 'Deadline' : conference.websiteUrl ? 'Website' : 'Contact'}
                        </p>
                    </div>
                    {conference.paperDeadline ? (
                        <><p className="text-sm font-semibold">{fmt(conference.paperDeadline)}</p><p className="text-xs text-muted-foreground">submission closes</p></>
                    ) : conference.websiteUrl ? (
                        <a href={conference.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-indigo-600 hover:underline flex items-center gap-1">Visit site <ExternalLink className="h-3 w-3" /></a>
                    ) : conference.contactInformation ? (
                        <p className="text-sm font-semibold truncate">{conference.contactInformation}</p>
                    ) : <p className="text-sm text-muted-foreground">{'\u2014'}</p>}
                </div>
            </div>

            {/* Sample manuscript */}
            <Card className="mb-8">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-100">
                            <FileText className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="font-semibold">Sample Manuscript</p>
                            <p className="text-sm text-muted-foreground">
                                {conference.paperTemplateUrl ? 'Download the template before submitting.' : 'No template uploaded yet.'}
                            </p>
                        </div>
                    </div>
                    {conference.paperTemplateUrl ? (
                        <Button variant="outline" size="sm" asChild>
                            <a href={conference.paperTemplateUrl} target="_blank" rel="noreferrer">
                                Download
                            </a>
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" disabled>
                            Unavailable
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Phase Indicator */}
            <div className="mb-8">
                <ConferencePhaseTracker conferenceId={conferenceId} />
            </div>

            {/* ═══════ TRACKS (left) & REVIEWS (right) — side by side ═══════ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-10">
                {/* TRACKS / ADMIN REVIEW — 3/5 width */}
                <div className="lg:col-span-3">
                    <h2 className="text-xl font-bold tracking-tight mb-4">
                        {canModeratePendingConference ? 'Conference Review Details' : 'Conference Tracks'}
                    </h2>
                    {canModeratePendingConference ? (
                        <Card className="overflow-hidden border-indigo-100 shadow-sm">
                            <CardContent className="p-0">
                                <div className="border-b bg-gradient-to-r from-indigo-50 via-white to-amber-50 p-6">
                                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                                                    Pending Approval
                                                </Badge>
                                                {conference.acronym && (
                                                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                                                        {conference.acronym}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-base font-semibold text-slate-900">
                                                Review the information submitted by the conference chair before making the final decision.
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                This section shows the original conference profile created during the initial setup flow.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            <Button
                                                size="lg"
                                                onClick={handleApproveConference}
                                                disabled={moderationAction !== null}
                                                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                {moderationAction === 'approve' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                                                Accept
                                            </Button>
                                            <Button
                                                size="lg"
                                                variant="outline"
                                                onClick={() => setShowRejectDialog(true)}
                                                disabled={moderationAction !== null}
                                                className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                            >
                                                <XCircle className="h-5 w-5" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 p-6 sm:grid-cols-2">
                                    <div className="rounded-xl border bg-white p-4">
                                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                            <Building2 className="h-4 w-4 text-indigo-600" />
                                            Basic Information
                                        </div>
                                        <div className="space-y-2 text-sm text-slate-700">
                                            <p><span className="font-medium text-slate-900">Conference:</span> {conference.name}</p>
                                            <p><span className="font-medium text-slate-900">Area:</span> {conference.area || 'Not provided'}</p>
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {sponsorList.length > 0 ? sponsorList.map((sponsor) => (
                                                    <Badge key={sponsor} variant="secondary" className="bg-indigo-50 text-indigo-700">
                                                        {sponsor}
                                                    </Badge>
                                                )) : (
                                                    <span className="text-slate-500">No society sponsor selected</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border bg-white p-4">
                                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                            <MapPin className="h-4 w-4 text-indigo-600" />
                                            Venue and Dates
                                        </div>
                                        <div className="space-y-2 text-sm text-slate-700">
                                            <p><span className="font-medium text-slate-900">Location:</span> {conference.location || 'Not provided'}</p>
                                            <p><span className="font-medium text-slate-900">Province:</span> {conference.province || 'Not provided'}</p>
                                            <p><span className="font-medium text-slate-900">Country:</span> {conference.country || 'Not provided'}</p>
                                            <p><span className="font-medium text-slate-900">Dates:</span> {fmt(conference.startDate)} to {fmt(conference.endDate)}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border bg-white p-4">
                                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                            <Globe className="h-4 w-4 text-indigo-600" />
                                            Website and Contact
                                        </div>
                                        <div className="space-y-2 text-sm text-slate-700">
                                            <p>
                                                <span className="font-medium text-slate-900">Website:</span>{' '}
                                                {conference.websiteUrl ? (
                                                    <a href={conference.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                                        {conference.websiteUrl}
                                                    </a>
                                                ) : 'Not provided'}
                                            </p>
                                            <p><span className="font-medium text-slate-900">Contact:</span> {conference.contactInformation || 'Not provided'}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border bg-white p-4">
                                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                            <Users className="h-4 w-4 text-indigo-600" />
                                            Conference Chairs
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {chairEmailList.length > 0 ? chairEmailList.map((email) => (
                                                <Badge key={email} variant="outline" className="gap-1 border-slate-200 text-slate-700">
                                                    <Mail className="h-3 w-3" />
                                                    {email}
                                                </Badge>
                                            )) : (
                                                <p className="text-sm text-slate-500">No chair emails provided</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border bg-white p-4 sm:col-span-2">
                                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                            <FileText className="h-4 w-4 text-indigo-600" />
                                            Description
                                        </div>
                                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                            {conference.description || 'No description provided.'}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border bg-white p-4 sm:col-span-2">
                                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                            <ImageIcon className="h-4 w-4 text-indigo-600" />
                                            Banner Submission
                                        </div>
                                        {conference.bannerImageUrl ? (
                                            <div className="overflow-hidden rounded-xl border">
                                                <img
                                                    src={conference.bannerImageUrl}
                                                    alt={`${conference.name} banner`}
                                                    className="h-56 w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed bg-slate-50 text-sm text-slate-500">
                                                No banner image uploaded
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : tracks.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
                                <p className="text-muted-foreground text-lg font-medium">No tracks yet</p>
                                <p className="text-sm text-muted-foreground mt-1">Tracks will appear once the organizer adds them.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="rounded-xl border overflow-hidden bg-white dark:bg-card">
                            {/* Table header */}
                            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-muted/50 border-b text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                <div className="col-span-4">Track</div>
                                <div className="col-span-4 hidden sm:block">Description</div>
                                <div className="col-span-4 sm:col-span-2 text-center">Status</div>
                                <div className="col-span-4 sm:col-span-2 text-right">Action</div>
                            </div>
                            {tracks.map((track, idx) => (
                                <div key={track.id} className={`grid grid-cols-12 gap-3 px-4 py-3.5 items-center hover:bg-muted/30 transition-colors ${idx < tracks.length - 1 ? 'border-b border-dashed' : ''}`}>
                                    <div className="col-span-4">
                                        <p className="font-semibold text-sm">{track.name}</p>
                                    </div>
                                    <div className="col-span-4 hidden sm:block">
                                        <p className="text-sm text-muted-foreground line-clamp-1">{track.description || '\u2014'}</p>
                                    </div>
                                    <div className="col-span-4 sm:col-span-2 text-center">
                                        <Badge variant="outline" className={
                                            isPaperSubmissionOpen
                                                ? 'border-green-300 text-green-700 bg-green-50'
                                                : currentActivity
                                                    ? 'border-indigo-300 text-indigo-700 bg-indigo-50'
                                                    : 'border-gray-300 text-gray-500 bg-gray-50'
                                        }>
                                            {isPaperSubmissionOpen ? 'Open' : currentActivity
                                                ? (ACTIVITY_LABELS[currentActivity.activityType] || currentActivity.activityType) : 'Closed'}
                                        </Badge>
                                    </div>
                                    <div className="col-span-4 sm:col-span-2 text-right">
                                        {isPaperSubmissionOpen ? (
                                            <Link href={`/track/${track.id}/submit?conferenceId=${conferenceId}`}>
                                                <Button size="sm" className="gap-1.5 h-8"><Send className="h-3.5 w-3.5" /> Submit</Button>
                                            </Link>
                                        ) : (
                                            <Button size="sm" variant="outline" disabled className="h-8 gap-1.5"><Send className="h-3.5 w-3.5" /> Closed</Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* REVIEWS — 2/5 width */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold tracking-tight mb-4">Reviews & Feedback</h2>
                    <ConferenceFeedback conferenceId={conferenceId} isCheckedIn={isCheckedIn} />
                </div>
            </div>

            {/* ═══════ EXPLORE MORE — horizontal carousel ═══════ */}
            {similarConferences.length > 0 && (
                <section className="mb-10 pt-8 border-t">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight mb-1">Explore More Conferences</h2>
                            <p className="text-sm text-muted-foreground">
                                Discover other conferences{conference.area ? <> — related to <span className="font-semibold text-foreground">{conference.area}</span> listed first</> : ' on ConfHub'}
                            </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => { const el = document.getElementById('conf-carousel'); if (el) el.scrollBy({ left: -300, behavior: 'smooth' }) }}
                                className="h-9 w-9 rounded-full border bg-white dark:bg-card shadow-sm flex items-center justify-center hover:bg-muted transition-colors">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button onClick={() => { const el = document.getElementById('conf-carousel'); if (el) el.scrollBy({ left: 300, behavior: 'smooth' }) }}
                                className="h-9 w-9 rounded-full border bg-white dark:bg-card shadow-sm flex items-center justify-center hover:bg-muted transition-colors">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    <div id="conf-carousel" className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {similarConferences.map(c => (
                            <Link key={c.id} href={`/conference/${c.id}`} className="group snap-start shrink-0 w-[260px]">
                                <div className="rounded-xl border bg-white dark:bg-card overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all duration-200 h-full flex flex-col">
                                    {c.bannerImageUrl ? (
                                        <img src={c.bannerImageUrl} alt={c.name} className="w-full h-28 object-cover" />
                                    ) : (
                                        <div className="w-full h-28 bg-primary flex items-center justify-center">
                                            <span className="text-white/70 text-lg font-bold">{c.acronym}</span>
                                        </div>
                                    )}
                                    <div className="p-3.5 flex flex-col flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{c.acronym}</span>
                                            <Badge variant="outline" className="text-[10px] py-0">{c.status}</Badge>
                                        </div>
                                        <h3 className="text-sm font-bold line-clamp-2 group-hover:text-indigo-600 transition-colors flex-1">{c.name}</h3>
                                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{c.location}</span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3 shrink-0" /> {fmt(c.startDate)}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Program Dialog */}
            <Dialog open={showProgramPopup} onOpenChange={setShowProgramPopup}>
                <DialogContent className="!max-w-[95vw] sm:max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-y-auto bg-[#f8fafc] sm:rounded-2xl border-none">
                    <DialogHeader className="mb-6 sticky top-0 z-50 bg-[#f8fafc] py-2">
                        <DialogTitle className="text-2xl font-black text-slate-800">Conference Program</DialogTitle>
                    </DialogHeader>
                    {programData ? <ProgramViewer program={programData} allPapers={allPapers} />
                        : <div className="py-12 text-center text-slate-500">Program could not be loaded.</div>}
                </DialogContent>
            </Dialog>
            <Dialog
                open={showRejectDialog}
                onOpenChange={(open) => {
                    if (moderationAction === 'reject') return
                    setShowRejectDialog(open)
                    if (!open) setRejectReason('')
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reject Conference</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this conference. The organizer will see this reason.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Enter rejection reason..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="min-h-28"
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowRejectDialog(false)
                                setRejectReason('')
                            }}
                            disabled={moderationAction === 'reject'}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRejectConference}
                            disabled={!rejectReason.trim() || moderationAction !== null}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {moderationAction === 'reject' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
