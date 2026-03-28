'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getConference, getConferenceActivities } from '@/app/api/conference.api'
import { getTracksByConference } from '@/app/api/track.api'
import { getUserRoleAssignments, acceptInvitation, declineInvitation } from '@/app/api/conference-user-track.api'
import toast from 'react-hot-toast'
import type { ConferenceActivityDTO, ConferenceResponse, TrackResponse } from '@/types/conference'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, ExternalLink, Loader2, ArrowLeft, Settings,
    Globe, Phone, FileText, Clock, Send, Ticket, BookOpen
} from 'lucide-react'
import Link from 'next/link'
import { isActivityOpen } from '@/lib/activity'
import { useUserRoles } from '@/hooks/useUserConferenceRoles'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

export default function ConferenceDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { hasRoleInConference, userId, refreshRoles } = useUserRoles()
    const canManageConference = hasRoleInConference(conferenceId, 'CONFERENCE_CHAIR') || hasRoleInConference(conferenceId, 'PROGRAM_CHAIR')
    const [pendingInvitations, setPendingInvitations] = useState<any[]>([])
    const [actionLoading, setActionLoading] = useState(false)

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
                setPendingInvitations(userRoles.filter((r: any) => r.conferenceId === conferenceId && r.isAccepted === null))
            } catch (err: any) {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    setError('You must be logged in to view this conference.')
                    setTimeout(() => {
                        router.push('/auth/login')
                    }, 2000)
                } else {
                    setError('Failed to load conference details. Please try again later.')
                }
                console.error('Error fetching conference:', err)
            } finally {
                setLoading(false)
            }
        }

        if (conferenceId) {
            fetchData()
        }
    }, [conferenceId, router, userId])

    const handleAcceptInvitation = async () => {
        if (!userId || !conferenceId) return
        try {
            setActionLoading(true)
            await acceptInvitation(userId, conferenceId)
            toast.success('Invitation accepted!')
            setPendingInvitations([])
            await refreshRoles()
        } catch {
            toast.error('Failed to accept invitation.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleDeclineInvitation = async () => {
        if (!userId || !conferenceId) return
        try {
            setActionLoading(true)
            await declineInvitation(userId, conferenceId)
            toast.success('Invitation declined.')
            setPendingInvitations([])
            await refreshRoles()
        } catch {
            toast.error('Failed to decline invitation.')
        } finally {
            setActionLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '—'
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const formatDateShort = (dateString: string) => {
        if (!dateString) return '—'
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE':
            case 'APPROVED':
                return 'bg-green-100 text-green-800 border-green-200'
            case 'UPCOMING':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200'
            case 'PENDING':
                return 'bg-amber-100 text-amber-800 border-amber-200'
            case 'REJECTED':
                return 'bg-red-100 text-red-800 border-red-200'
            case 'COMPLETED':
                return 'bg-gray-100 text-gray-800 border-gray-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const ACTIVITY_ORDER = [
        'PAPER_SUBMISSION',
        'REVIEWER_BIDDING',
        'REVIEW_SUBMISSION',
        'REVIEW_DISCUSSION',
        'AUTHOR_NOTIFICATION',
        'CAMERA_READY_SUBMISSION',
        'REGISTRATION',
        'EVENT_DAY',
    ]

    const ACTIVITY_LABELS: Record<string, string> = {
        PAPER_SUBMISSION: 'Paper Submission',
        REVIEWER_BIDDING: 'Reviewer Bidding',
        REVIEW_SUBMISSION: 'Review Submission',
        REVIEW_DISCUSSION: 'Review Discussion',
        AUTHOR_NOTIFICATION: 'Author Notification',
        CAMERA_READY_SUBMISSION: 'Camera Ready',
        REGISTRATION: 'Registration',
        EVENT_DAY: 'Conference Event',
    }

    const paperSubmissionActivity = activities.find(a => a.activityType === 'PAPER_SUBMISSION')
    const isPaperSubmissionOpen = isActivityOpen(paperSubmissionActivity)

    const isSubmissionOpen = () => {
        return isPaperSubmissionOpen
    }

    const openActivities = activities.filter((a) => isActivityOpen(a))
    const sortedOpenActivities = [...openActivities].sort((a, b) => {
        const indexA = ACTIVITY_ORDER.indexOf(a.activityType)
        const indexB = ACTIVITY_ORDER.indexOf(b.activityType)
        if (indexA === -1 && indexB === -1) return 0
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
    })
    const currentActivity = sortedOpenActivities[0] || null

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-destructive text-lg">{error}</p>
                {error.includes('logged in') ? (
                    <Link href="/auth/login">
                        <Button>Go to Login</Button>
                    </Link>
                ) : (
                    <Button onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                )}
            </div>
        )
    }

    if (!conference) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-muted-foreground text-lg">Conference not found</p>
                <Link href="/conference">
                    <Button>Back to Conferences</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            {/* Back button */}
            <Link href="/conference">
                <Button variant="ghost" className="mb-6 gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Conferences
                </Button>
            </Link>

            {pendingInvitations.length > 0 && (
                <div className="bg-amber-50 border-[2px] border-amber-300 rounded-xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div>
                        <h3 className="font-bold text-amber-900 text-lg flex items-center gap-2">
                            👋 You have been invited
                        </h3>
                        <p className="text-amber-800 mt-1 font-medium">
                            You have a pending invitation to join this conference as: {Array.from(new Set(pendingInvitations.map(p => p.assignedRole.replace('_', ' ')))).join(', ')}. 
                        </p>
                    </div>
                    <div className="flex gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                        <Button variant="outline" onClick={handleDeclineInvitation} disabled={actionLoading} className="w-full sm:w-auto border-amber-300 text-amber-700 bg-white hover:bg-amber-100 font-bold">
                            Decline
                        </Button>
                        <Button onClick={handleAcceptInvitation} disabled={actionLoading} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold">
                            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Accept Invitation
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-10">
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-sm font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded">
                                {conference.acronym}
                            </span>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getStatusColor(conference.status)}`}>
                                {conference.status}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight mb-4">
                            {conference.name}
                        </h1>
                        <p className="text-muted-foreground text-base leading-relaxed">
                            {conference.description}
                        </p>
                    </div>

                    {/* Key details grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <MapPin className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</p>
                                <p className="text-sm font-medium">{conference.location}{conference.province ? `, ${conference.province}` : ''}{conference.country ? `, ${conference.country}` : ''}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <Calendar className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conference Dates</p>
                                <p className="text-sm font-medium">{formatDateShort(conference.startDate)} – {formatDateShort(conference.endDate)}</p>
                            </div>
                        </div>
                        {conference.paperDeadline && (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                <Clock className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paper Deadline</p>
                                    <p className="text-sm font-medium">{formatDate(conference.paperDeadline)}</p>
                                </div>
                            </div>
                        )}
                        {conference.cameraReadyDeadline && (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                <FileText className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Camera-ready Deadline</p>
                                    <p className="text-sm font-medium">{formatDate(conference.cameraReadyDeadline)}</p>
                                </div>
                            </div>
                        )}
                        {conference.contactInformation && (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                <Phone className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</p>
                                    <p className="text-sm font-medium">{conference.contactInformation}</p>
                                </div>
                            </div>
                        )}
                        {conference.websiteUrl && (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                <Globe className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Website</p>
                                    <a
                                        href={conference.websiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-indigo-600 hover:underline flex items-center gap-1"
                                    >
                                        Visit site <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

        
                    {/* ── Call-to-Action Buttons ── */}
                    {(() => {
                        const registrationActivity = activities.find(a => a.activityType === 'REGISTRATION')
                        const eventDayActivity = activities.find(a => a.activityType === 'EVENT_DAY')
                        const canRegister = isActivityOpen(registrationActivity)
                        const hasProgramAvailable = isActivityOpen(eventDayActivity)

                        return (
                            <TooltipProvider delayDuration={200}>
                                <div className="flex gap-3 pt-4 flex-wrap">
                                    {/* Register to Attend */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex" tabIndex={0} style={{ pointerEvents: 'auto' }}>
                                                <Button
                                                    size="lg"
                                                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:pointer-events-none"
                                                    disabled={!canRegister}
                                                    onClick={() => canRegister && window.location.assign(`/conference/${conferenceId}/register`)}
                                                >
                                                    <Ticket className="h-5 w-5" />
                                                    Register to Attend
                                                </Button>
                                            </span>
                                        </TooltipTrigger>
                                        {!canRegister && (
                                            <TooltipContent side="bottom" className="max-w-xs">
                                                {registrationActivity?.deadline && new Date(registrationActivity.deadline).getTime() < Date.now()
                                                    ? 'Registration is closed.'
                                                    : 'Registration is not open yet. Please wait until the Registration phase.'}
                                            </TooltipContent>
                                        )}
                                    </Tooltip>

                                    {/* View Program */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex" tabIndex={0} style={{ pointerEvents: 'auto' }}>
                                                <Button
                                                    size="lg"
                                                    variant="outline"
                                                    className="gap-2 disabled:pointer-events-none"
                                                    disabled={!hasProgramAvailable}
                                                    onClick={() => hasProgramAvailable && window.location.assign(`/conference/${conferenceId}/program`)}
                                                >
                                                    <Calendar className="h-5 w-5" />
                                                    View Program
                                                </Button>
                                            </span>
                                        </TooltipTrigger>
                                        {!hasProgramAvailable && (
                                            <TooltipContent side="bottom" className="max-w-xs">
                                                Detailed program is not yet available
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </div>
                            </TooltipProvider>
                        )
                    })()}


                </div>

                <div className="lg:col-span-3 pt-9">
                    <div className="sticky rounded-xl overflow-hidden border shadow-sm">
                        {conference.bannerImageUrl ? (
                            <img
                                src={conference.bannerImageUrl}
                                alt={conference.name}
                                className="w-full object-cover"
                            />
                        ) : (
                            <div className="w-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white/60 text-5xl font-bold tracking-wider">
                                    {conference.acronym}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Phase Indicator — always render so user sees full roadmap */}
            <div className="mb-8 rounded-xl border bg-card p-4 sm:p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                    Conference Progress
                </h3>
                <div className="w-full overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    <div className="flex flex-row flex-nowrap items-center min-w-max">
                        {ACTIVITY_ORDER.map((actType, idx) => {
                            const activity = activities.find(a => a.activityType === actType)
                            const isActive = activity?.isEnabled === true
                            const isCompleted = !isActive && activities
                                .filter(a => ACTIVITY_ORDER.indexOf(a.activityType) > ACTIVITY_ORDER.indexOf(actType))
                                .some(a => a.isEnabled)
                            const isPast = activity?.deadline ? new Date(activity.deadline).getTime() < Date.now() : false
                            const done = isCompleted || (isPast && !isActive)

                            return (
                                <div key={actType} className="flex items-center shrink-0">
                                    {/* Phase badge */}
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0
                                        ${isActive
                                            ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                                            : done
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-muted text-muted-foreground/40'
                                        }`}
                                    >
                                        {done ? (
                                            <svg className="h-3.5 w-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                        ) : isActive ? (
                                            <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                                        ) : (
                                            <span className="h-2 w-2 rounded-full bg-muted-foreground/30 shrink-0" />
                                        )}
                                        {ACTIVITY_LABELS[actType]}
                                    </div>

                                    {/* Connector line between nodes */}
                                    {idx < ACTIVITY_ORDER.length - 1 && (
                                        <div className={`min-w-[24px] w-6 h-[2px] mx-2 shrink-0 rounded-full ${
                                            done ? 'bg-emerald-300' : 'bg-slate-200'
                                        }`} />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <section>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Conference Tracks</h2>
                        <p className="text-muted-foreground mt-1">
                            {tracks.length === 0
                                ? 'No tracks available yet.'
                                : `${tracks.length} track${tracks.length > 1 ? 's' : ''} available for submission`}
                        </p>
                    </div>
                </div>

                {tracks.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
                            <p className="text-muted-foreground text-lg font-medium">No tracks yet</p>
                            <p className="text-sm text-muted-foreground mt-1">Tracks will appear here once the organizer adds them.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {tracks.map((track) => {
                            const submissionOpen = isSubmissionOpen()
                            return (
                                <Card key={track.id} className="hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <CardTitle className="text-lg leading-tight">
                                                {track.name}
                                            </CardTitle>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        !submissionOpen && currentActivity
                                                            ? 'border-indigo-300 text-indigo-700 bg-indigo-50 shrink-0'
                                                            : submissionOpen
                                                                ? 'border-green-300 text-green-700 bg-green-50 shrink-0'
                                                                : 'border-gray-300 text-gray-500 bg-gray-50 shrink-0'
                                                    }
                                                >
                                                    {!submissionOpen && currentActivity
                                                        ? (ACTIVITY_LABELS[currentActivity.activityType] || currentActivity.name || currentActivity.activityType)
                                                        : (submissionOpen ? 'Open' : 'Closed')}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {track.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-3">
                                                {track.description}
                                            </p>
                                        )}

                                        <div className="space-y-2 text-xs text-muted-foreground">
                                        </div>

                                        <div className="pt-2">
                                            {submissionOpen ? (
                                                <Link href={`/track/${track.id}/submit?conferenceId=${conferenceId}`}>
                                                    <Button
                                                        className="w-full gap-2"
                                                        variant="default"
                                                    >
                                                        <Send className="h-4 w-4" />
                                                        Submit Paper
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <Button
                                                    className="w-full gap-2"
                                                    variant="outline"
                                                    disabled
                                                >
                                                    <Send className="h-4 w-4" />
                                                    Submission Closed
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </section>
        </div>
    )
}
