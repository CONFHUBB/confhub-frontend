'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getConference, getConferenceActivities } from '@/app/api/conference.api'
import { getReviewsByReviewerAndConference } from '@/app/api/review.api'
import { getUserProfile, createOrUpdateUserProfile } from '@/app/api/user.api'
import { getInterestsByReviewer } from '@/app/api/reviewer-interest.api'
import type { ConferenceResponse, ConferenceActivityDTO } from '@/types/conference'

import type { ReviewResponse } from '@/types/review'
import type { UserProfile } from '@/types/user'
import type { UserConflictResponse, UserConflictRequest } from '@/types/conflict'
import { getUserConflicts, addUserConflict, deleteUserConflict } from '@/app/api/user-conflict.api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Loader2, ArrowLeft, LayoutDashboard, User2, Shield, Target, FileSearch,
    ClipboardList, ChevronDown, ChevronRight, CheckCircle2, Circle, Lock,
    Clock, Zap, ThumbsUp, Minus, ThumbsDown, AlertTriangle,
    Building2, Mail, Globe, GraduationCap, Phone,
    ChevronUp, XCircle, ArrowRight, MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'
import { SubjectAreasTab } from './subject-areas-tab'
import { BiddingTab } from './bidding-tab'
import { ReviewsTab } from './reviews-tab'
import { DiscussionTab } from './discussion-tab'
import { FieldError } from '@/components/ui/field'
import { V } from '@/lib/validation'
import { useTrackSettings } from '@/hooks/useTrackSettings'
import { reviewStatusClass } from '@/lib/constants/status'
import { getCurrentUserId } from '@/lib/auth'
import { Breadcrumb } from '@/components/shared/breadcrumb'
import { DeadlineBanner } from '@/components/shared/deadline-banner'

// ──────────────────────────── Types ────────────────────────────
type ReviewerTab =
    | 'dashboard'
    | 'profile'
    | 'bidding'
    | 'reviews'
    | 'discussion'

interface StepGroup {
    title: string
    icon: React.ReactNode
    accentColor: string
    items: { key: ReviewerTab; label: string; completionKey: string }[]
}

// ──────────────────────────── Step Config ────────────────────────────
const TAB_GROUPS: StepGroup[] = [
    {
        title: "Overview",
        icon: <LayoutDashboard className="h-4 w-4" />,
        accentColor: "text-primary",
        items: [
            { key: "dashboard", label: "Dashboard", completionKey: "" }
        ]
    },
    {
        title: "Reviewer Profile",
        icon: <User2 className="h-4 w-4" />,
        accentColor: "text-indigo-600",
        items: [
            { key: "profile", label: "Profile & Subject Areas", completionKey: "profile-complete" },
        ]
    },
    {
        title: "Paper Bidding",
        icon: <FileSearch className="h-4 w-4" />,
        accentColor: "text-teal-600",
        items: [
            { key: "bidding", label: "Bidding", completionKey: "bidding-done" },
        ]
    },
    {
        title: "Review",
        icon: <ClipboardList className="h-4 w-4" />,
        accentColor: "text-amber-600",
        items: [
            { key: "reviews", label: "Assigned Reviews", completionKey: "reviews-done" },
            { key: "discussion", label: "Consensus Discussion", completionKey: "" },
        ]
    }
]



const BID_ICONS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    EAGER: { icon: <Zap className="h-4 w-4" />, color: 'text-emerald-600', label: 'Eager' },
    WILLING: { icon: <ThumbsUp className="h-4 w-4" />, color: 'text-indigo-600', label: 'Willing' },
    IN_A_PINCH: { icon: <Minus className="h-4 w-4" />, color: 'text-amber-600', label: 'In a Pinch' },
    NOT_WILLING: { icon: <ThumbsDown className="h-4 w-4" />, color: 'text-red-600', label: 'Not Willing' },
}

// ──────────────────────────── Component ────────────────────────────
export default function ReviewerConsole() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const { settings } = useTrackSettings(conferenceId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<ReviewerTab>('dashboard')
    const [expandedGroups, setExpandedGroups] = useState<string[]>(
        TAB_GROUPS.map(g => g.title)
    )
    const [reviewerId, setReviewerId] = useState<number | null>(null)

    // Data states
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [bidCounts, setBidCounts] = useState<Record<string, number>>({})
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])
    const [interestsCount, setInterestsCount] = useState(0)
    const [userConflicts, setUserConflicts] = useState<UserConflictResponse[]>([])

    // Workflow status
    const [workflowStatus, setWorkflowStatus] = useState<Record<string, boolean>>({})

    // Get userId from JWT
    useEffect(() => {
        setReviewerId(getCurrentUserId())
    }, [])

    // Fetch all data
    const fetchData = useCallback(async () => {
        if (!reviewerId) return
        try {
            setLoading(true)
            const [conf, activitiesData] = await Promise.all([
                getConference(conferenceId),
                getConferenceActivities(conferenceId).catch(() => []),
            ])
            setConference(conf)
            setActivities(activitiesData)

            const [profileData, reviewsData, interests] = await Promise.all([
                getUserProfile(reviewerId).catch(() => null),
                getReviewsByReviewerAndConference(reviewerId, conferenceId).catch(() => []),
                getInterestsByReviewer(reviewerId).catch(() => []),
            ])

            setProfile(profileData)
            const reviewList = Array.isArray(reviewsData) ? reviewsData : (reviewsData as any)?.content || []
            setReviews(reviewList)
            setInterestsCount(Array.isArray(interests) ? interests.length : 0)

            // Fetch user conflicts
            const conflicts = await getUserConflicts(reviewerId).catch(() => [])
            setUserConflicts(conflicts)

            // Compute workflow status
            const profileComplete = !!(profileData && profileData.institution) && (Array.isArray(interests) && interests.length > 0)
            const biddingDone = false // Will be updated via onBidCountsChanged callback from BiddingTab
            const reviewsDone = reviewList.length > 0 && reviewList.every((r: ReviewResponse) => r.status === 'COMPLETED')

            setWorkflowStatus({
                'profile-complete': profileComplete,
                'bidding-done': biddingDone,
                'reviews-done': reviewsDone,
            })
        } catch (err) {
            console.error('Failed to load reviewer console:', err)
        } finally {
            setLoading(false)
        }
    }, [conferenceId, reviewerId])

    useEffect(() => {
        if (reviewerId) fetchData()
    }, [reviewerId, fetchData])

    // Stable callback to sync bid counts from BiddingTab (no API calls)
    const handleBidCountsChanged = useCallback((counts: Record<string, number>) => {
        setBidCounts(counts)
        const totalBids = Object.values(counts).reduce((sum, c) => sum + c, 0)
        setWorkflowStatus(prev => ({ ...prev, 'bidding-done': totalBids > 0 }))
    }, [])

    // Step access logic
    const allOrderedSteps = useMemo(() => {
        const steps: { key: string; completionKey: string }[] = []
        TAB_GROUPS.forEach(group => {
            if (group.title === 'Overview') return
            group.items.forEach(item => {
                if (item.completionKey) {
                    steps.push({ key: item.key, completionKey: item.completionKey })
                }
            })
        })
        return steps
    }, [])

    const stepAccessMap = useMemo(() => {
        const map: Record<string, 'locked' | 'active' | 'completed'> = {}
        for (let i = 0; i < allOrderedSteps.length; i++) {
            const step = allOrderedSteps[i]
            const isDone = !!workflowStatus[step.completionKey]
            const allPreviousDone = allOrderedSteps.slice(0, i).every(s => !!workflowStatus[s.completionKey])
            if (isDone) map[step.key] = 'completed'
            else if (allPreviousDone) map[step.key] = 'active'
            else map[step.key] = 'locked'
        }
        return map
    }, [allOrderedSteps, workflowStatus])

    const visibleReviews = useMemo(() => {
        if (settings.doNotShowWithdrawnPapers) {
            return reviews.filter(r => r.paper?.status !== 'WITHDRAWN')
        }
        return reviews
    }, [reviews, settings.doNotShowWithdrawnPapers])

    // Deadline helpers
    const getDeadlineInfo = (activityType: string) => {
        const activity = activities.find(a => a.activityType === activityType)
        if (!activity?.isEnabled || !activity?.deadline) return null
        const deadline = new Date(activity.deadline)
        const now = new Date()
        const diffMs = deadline.getTime() - now.getTime()
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        return { deadline, diffDays, isPast: diffMs <= 0, isUrgent: diffDays <= 3 && diffMs > 0 }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // ──────────────────────────── Render Content ────────────────────────────
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardTab
                    conference={conference}
                    bidCounts={bidCounts}
                    reviews={visibleReviews}
                    activities={activities}
                    workflowStatus={workflowStatus}
                    interestsCount={interestsCount}
                    getDeadlineInfo={getDeadlineInfo}
                    onNavigate={setActiveTab}
                />
            case 'profile':
                return <ProfileTab
                    conferenceId={conferenceId}
                    reviewerId={reviewerId!}
                    profile={profile}
                    userConflicts={userConflicts}
                    interestsCount={interestsCount}
                    onSaved={() => fetchData()}
                />
            case 'bidding':
                return <BiddingTab
                    conferenceId={conferenceId}
                    reviewerId={reviewerId!}
                    onDataChanged={(data) => {
                        if (!data?.bidsUpdated) fetchData()
                    }}
                    bidCounts={bidCounts}
                    onBidCountsChanged={handleBidCountsChanged}
                />
            case 'reviews':
                return <ReviewsTab
                    reviews={visibleReviews}
                    conferenceId={conferenceId}
                />
            case 'discussion':
                return <DiscussionTab
                    reviews={visibleReviews}
                    conferenceId={conferenceId}
                    currentUserId={reviewerId}
                    activities={activities}
                    settings={settings}
                />
            default:
                return null
        }
    }

    // ──────────────────────────── Sidebar ────────────────────────────
    const trackableItems = TAB_GROUPS.flatMap(g => g.items).filter(i => i.completionKey)
    const doneCount = trackableItems.filter(i => workflowStatus[i.completionKey]).length
    const totalCount = trackableItems.length
    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

    return (
        <div className="min-h-screen bg-transparent flex flex-col overflow-hidden">
            <div className="flex-1 w-full max-w-[1700px] mx-auto flex flex-col p-4 md:p-8 overflow-hidden">
                {/* Breadcrumb Navigation */}
                <Breadcrumb items={[
                    { label: 'Conferences', href: '/conference' },
                    { label: conference?.acronym || 'Conference', href: `/conference/${conferenceId}` },
                    { label: 'Reviewer Console' },
                ]} />

                {/* Deadline Banner — shows most relevant deadline */}
                {(() => {
                    const reviewDeadline = activities.find(a => a.activityType === 'REVIEW_SUBMISSION')
                    const biddingDeadline = activities.find(a => a.activityType === 'REVIEWER_BIDDING')
                    const relevantActivity = reviewDeadline?.isEnabled ? reviewDeadline : biddingDeadline?.isEnabled ? biddingDeadline : null
                    const deadlineLabel = relevantActivity?.activityType === 'REVIEW_SUBMISSION' ? 'Review Submission' : 'Reviewer Bidding'
                    return relevantActivity ? (
                        <DeadlineBanner deadline={relevantActivity.deadline} label={deadlineLabel} className="mb-4" />
                    ) : null
                })()}

                {/* Header Area — Vibrant hero banner */}
                <div className="mb-6 shrink-0">
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-6 md:px-8 md:py-7 shadow-lg">
                        {/* Decorative circles */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-xl" />

                        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                {/* Acronym + Status */}
                                <div className="flex items-center gap-2.5 mb-2">
                                    {conference?.acronym && (
                                        <span className="text-xs font-mono font-semibold tracking-wider text-white/70 bg-white/10 px-2.5 py-0.5 rounded-md">
                                            {conference.acronym}
                                        </span>
                                    )}
                                    <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                        conference?.status === 'ONGOING' ? 'bg-emerald-400/20 text-emerald-200' :
                                        conference?.status === 'SCHEDULED' ? 'bg-blue-400/20 text-blue-200' :
                                        conference?.status === 'COMPLETED' ? 'bg-gray-400/20 text-gray-300' :
                                        'bg-amber-400/20 text-amber-200'
                                    }`}>
                                        {conference?.status || 'UNKNOWN'}
                                    </span>
                                </div>

                                {/* Title */}
                                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                                    {conference?.name || 'Conference'}
                                </h1>

                                {/* Subtitle with Location / Dates mapping (optional but matches styling) */}
                                <p className="text-white/60 text-sm mt-1.5 flex items-center gap-2 flex-wrap">
                                    <Shield className="h-3.5 w-3.5 shrink-0" />
                                    Reviewer Console
                                </p>
                            </div>

                            {/* Right: Role badge */}
                            <div className="flex items-center gap-2.5 md:self-start">
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/95 shadow-lg">
                                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-indigo-100 text-indigo-600">
                                        <User2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider leading-none">Your Role</p>
                                        <p className="text-sm font-bold leading-tight mt-0.5 text-indigo-700">Reviewer</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card: Sidebar + Content */}
                <Card className="flex flex-col md:flex-row shadow-lg overflow-hidden flex-1 min-h-0 bg-background border border-border">
                    {/* Sidebar */}
                    <div className="md:w-64 shrink-0 bg-muted/5 border-r flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Progress bar removed — moved to main dashboard panel */}

                            {/* Nav groups */}
                            <nav>
                                {(() => {
                                    let stepNumber = 0
                                    return TAB_GROUPS.map((group) => {
                                        const isExpanded = expandedGroups.includes(group.title)
                                        const isOverview = group.title === 'Overview'
                                        if (!isOverview) stepNumber++
                                        const currentStep = stepNumber

                                        const trackable = group.items.filter(i => i.completionKey)
                                        const groupDone = trackable.length > 0 && trackable.every(i => workflowStatus[i.completionKey])

                                        return (
                                            <div key={group.title} className="mb-3">
                                                <button
                                                    onClick={() => setExpandedGroups(prev =>
                                                        isExpanded ? prev.filter(t => t !== group.title) : [...prev, group.title]
                                                    )}
                                                    className="w-full flex items-center justify-between px-2 py-2 text-sm font-bold text-foreground hover:text-primary transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {!isOverview && (
                                                            <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
                                                                groupDone
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-muted text-muted-foreground'
                                                            }`}>
                                                                {groupDone ? '✓' : currentStep}
                                                            </span>
                                                        )}
                                                        <span className={group.accentColor}>{group.icon}</span>
                                                        <span className="uppercase tracking-wider text-xs">{group.title}</span>
                                                    </div>
                                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </button>
                                                {isExpanded && (
                                                    <div className="flex flex-col space-y-0.5 mt-1 pl-2 border-l ml-3 border-border/50">
                                                        {group.items.map(item => {
                                                            const isActive = activeTab === item.key
                                                            const access = item.completionKey ? stepAccessMap[item.key] : 'active'
                                                            const isLocked = access === 'locked'
                                                            const isCompleted = access === 'completed'

                                                            return (
                                                                <button
                                                                    key={item.key}
                                                                    disabled={isLocked}
                                                                    onClick={() => !isLocked && setActiveTab(item.key)}
                                                                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all ${
                                                                        isLocked
                                                                            ? 'text-muted-foreground/40 cursor-not-allowed'
                                                                            : isActive
                                                                                ? 'bg-primary/10 text-primary font-semibold'
                                                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                                    }`}
                                                                >
                                                                    {isLocked ? (
                                                                        <Lock className="h-3.5 w-3.5" />
                                                                    ) : isCompleted ? (
                                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                                    ) : (
                                                                        <Circle className="h-3.5 w-3.5" />
                                                                    )}
                                                                    <span>{item.label}</span>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                })()}
                            </nav>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                        {renderContent()}
                    </div>
                </Card>
            </div>
        </div>
    )
}

// ══════════════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════════════

// ──────────────────────────── Phase Status Card ────────────────────────────
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; light: string; dot: string; btn: string }> = {
    indigo:  { bg: 'bg-indigo-600',  text: 'text-indigo-700',  border: 'border-indigo-300',  light: 'bg-indigo-50',  dot: 'bg-indigo-500',  btn: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
    sky:     { bg: 'bg-sky-500',     text: 'text-sky-700',     border: 'border-sky-300',     light: 'bg-sky-50',     dot: 'bg-sky-500',     btn: 'bg-sky-500 hover:bg-sky-600 text-white' },
    amber:   { bg: 'bg-amber-500',   text: 'text-amber-700',   border: 'border-amber-300',   light: 'bg-amber-50',   dot: 'bg-amber-500',   btn: 'bg-amber-500 hover:bg-amber-600 text-white' },
    orange:  { bg: 'bg-orange-500',  text: 'text-orange-700',  border: 'border-orange-300',  light: 'bg-orange-50',  dot: 'bg-orange-500',  btn: 'bg-orange-500 hover:bg-orange-600 text-white' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-300', light: 'bg-emerald-50', dot: 'bg-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
}

const REVIEWER_PHASES = [
    { id: 'onboarding', label: 'Setup Profile', icon: User2, color: 'indigo', nextPhaseTab: 'profile' },
    { id: 'bidding', label: 'Paper Bidding', icon: FileSearch, color: 'sky', nextPhaseTab: 'bidding' },
    { id: 'review', label: 'Paper Review', icon: ClipboardList, color: 'amber', nextPhaseTab: 'reviews' },
    { id: 'discussion', label: 'Discussion', icon: MessageSquare, color: 'orange', nextPhaseTab: 'reviews' },
    { id: 'done', label: 'Completed', icon: CheckCircle2, color: 'emerald', nextPhaseTab: '' },
]

function getReviewerChecklist(phaseId: string, workflowStatus: Record<string, boolean>, reviews: any[], activities: any[], profileDone: boolean, interestsDone: boolean): { label: string; met: boolean; tab: string; blocking: boolean }[] {
    const isActivityOpen = (type: string) => activities.some((a: any) => a.activityType === type && a.isEnabled)
    switch (phaseId) {
        case 'onboarding':
            return [
                { label: 'Fill out institution details', met: profileDone, tab: 'profile', blocking: true },
                { label: 'Select subject areas of interest', met: interestsDone, tab: 'profile', blocking: true }
            ]
        case 'bidding':
            return [
                { label: 'Bidding activity open', met: isActivityOpen('REVIEWER_BIDDING'), tab: 'dashboard', blocking: true },
                { label: 'Place bids on papers', met: workflowStatus['bidding-done'], tab: 'bidding', blocking: false },
                { label: 'Papers assigned to you', met: reviews.length > 0, tab: 'dashboard', blocking: true }
            ]
        case 'review':
            return [
                { label: 'Review Submission activity open', met: isActivityOpen('REVIEW_SUBMISSION'), tab: 'dashboard', blocking: true },
                { label: 'Complete all assigned reviews', met: workflowStatus['reviews-done'], tab: 'reviews', blocking: true }
            ]
        case 'discussion':
            return [
                { label: 'Discussion activity open', met: isActivityOpen('REVIEW_DISCUSSION'), tab: 'dashboard', blocking: true },
                { label: 'Participate in review discussions', met: false, tab: 'reviews', blocking: false }
            ]
        default:
            return []
    }
}

function ReviewerPhaseStatusCard({
    activities, reviews, workflowStatus, interestsCount, profileComplete, onNavigate, 
    biddingDeadline, reviewDeadline
}: {
    activities: ConferenceActivityDTO[]
    reviews: ReviewResponse[]
    workflowStatus: Record<string, boolean>
    interestsCount: number
    profileComplete: boolean
    onNavigate: (tab: any) => void
    biddingDeadline: any
    reviewDeadline: any
}) {
    const isProfileDone = profileComplete
    const hasAssignments = reviews.length > 0
    const isReviewsDone = workflowStatus['reviews-done']
    const isBiddingOpen = activities.some(a => a.activityType === 'REVIEWER_BIDDING' && a.isEnabled)
    const isReviewOpen = activities.some(a => a.activityType === 'REVIEW_SUBMISSION' && a.isEnabled)
    const isDiscussionOpen = activities.some(a => a.activityType === 'REVIEW_DISCUSSION' && a.isEnabled)

    let activePhaseIdx = 0
    if (!isProfileDone) activePhaseIdx = 0
    else if (!hasAssignments && !isReviewOpen) activePhaseIdx = 1 
    else if (hasAssignments && !isReviewsDone) activePhaseIdx = 2 
    else if (isDiscussionOpen) activePhaseIdx = 3
    else activePhaseIdx = 4

    const activePhase = REVIEWER_PHASES[activePhaseIdx]
    const c = COLOR_MAP[activePhase.color]
    const [checklistOpen, setChecklistOpen] = useState(true)

    const checklist = getReviewerChecklist(activePhase.id, workflowStatus, reviews, activities, profileComplete, interestsCount > 0)
    const blockingItems = checklist.filter(i => i.blocking)
    const allBlockingMet = blockingItems.length === 0 || blockingItems.every(i => i.met)
    const metCount = checklist.filter(i => i.met).length

    const isLastPhase = activePhaseIdx === REVIEWER_PHASES.length - 1
    const upcoming = reviewDeadline && !reviewDeadline.isPast && isReviewOpen ? reviewDeadline 
                   : biddingDeadline && !biddingDeadline.isPast && isBiddingOpen ? biddingDeadline 
                   : null
    const upcomingLabel = upcoming === reviewDeadline ? 'Review' : 'Bidding'

    return (
        <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-white px-6 pt-5 pb-0">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Reviewer Timeline</span>
                    </div>
                    {upcoming && (
                        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${upcoming.isUrgent ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                            <Clock className="w-3 h-3" />
                            {upcomingLabel}: {upcoming.diffDays} days left
                            {upcoming.isUrgent && ' ⚠'}
                        </div>
                    )}
                </div>

                <div className="flex items-stretch">
                    {REVIEWER_PHASES.map((phase, idx) => {
                        const Icon = phase.icon
                        const isCurrent = idx === activePhaseIdx
                        const isDone = idx < activePhaseIdx
                        const pc = COLOR_MAP[phase.color]
                        return (
                            <div key={phase.id} className="flex-1 flex flex-col items-center relative">
                                {idx > 0 && (
                                    <div className={`absolute top-5 right-1/2 left-0 h-0.5 ${isDone || isCurrent ? 'bg-indigo-400' : 'bg-gray-200'}`} />
                                )}
                                {idx < REVIEWER_PHASES.length - 1 && (
                                    <div className={`absolute top-5 left-1/2 right-0 h-0.5 ${isDone ? 'bg-indigo-400' : 'bg-gray-200'}`} />
                                )}
                                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isCurrent ? `${pc.bg} border-transparent shadow-lg ring-4 ring-offset-1 ring-${phase.color}-200` : ''} ${isDone ? 'bg-indigo-500 border-indigo-500' : ''} ${!isCurrent && !isDone ? 'bg-white border-gray-200' : ''}`}>
                                    {isDone ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-gray-400'}`} />}
                                </div>
                                <span className={`mt-2 text-xs font-semibold text-center leading-tight ${isCurrent ? pc.text : isDone ? 'text-indigo-500' : 'text-gray-400'}`}>
                                    {phase.label}
                                </span>
                                {isCurrent && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 ${pc.light} ${pc.text} font-bold`}>
                                        Active
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
                <div className="mt-5 border-t border-gray-100" />
            </div>

            <div className={`${c.light} px-6 py-4`}>
                <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${c.text}`}>Current Phase: {activePhase.label}</p>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                            {activePhaseIdx === 1 && !isBiddingOpen && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">Bidding is not open yet</span>}
                            {activePhaseIdx === 1 && isBiddingOpen && <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-medium">Bidding is actively open</span>}
                            {activePhaseIdx === 2 && !isReviewsDone && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⚠ You have pending reviews</span>}
                            {activePhaseIdx === 3 && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">✓ All caught up!</span>}
                        </div>
                    </div>
                </div>
            </div>

            {!isLastPhase && (
            <div className="border-t border-gray-100 bg-white">
                <button className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors" onClick={() => setChecklistOpen(v => !v)}>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Required Tasks</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${allBlockingMet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {metCount}/{checklist.length} done
                        </span>
                    </div>
                    {checklistOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {checklistOpen && (
                    <div className="px-6 pb-5 space-y-2">
                        {checklist.map((item, i) => (
                            <div key={i} onClick={() => item.tab !== 'dashboard' && onNavigate?.(item.tab)} className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-colors text-left group ${item.tab !== 'dashboard' ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                                {item.met ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : item.blocking ? <XCircle className="w-4 h-4 text-amber-400 shrink-0" /> : <XCircle className="w-4 h-4 text-gray-300 shrink-0" />}
                                <span className={`text-sm flex-1 ${item.met ? 'text-gray-700 line-through decoration-gray-300' : item.blocking ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{item.label}</span>
                                {item.blocking && !item.met && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 shrink-0">Required</Badge>}
                                {item.tab !== 'dashboard' && (
                                    <Button variant="outline" size="sm" className={`text-[11px] h-6 px-2.5 rounded-md shrink-0 font-semibold border ${item.met ? 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50' : `${c.border} ${c.text} bg-white hover:${c.light}`}`} onClick={(e) => { e.stopPropagation(); onNavigate?.(item.tab) }}>
                                        Configure
                                        <ArrowRight className="w-3 h-3 ml-0.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            )}
        </div>
    )
}

// ──────────────────────────── Dashboard Tab ────────────────────────────
function DashboardTab({
    conference, bidCounts, reviews, activities, workflowStatus, interestsCount, getDeadlineInfo, onNavigate
}: {
    conference: ConferenceResponse | null
    bidCounts: Record<string, number>
    reviews: ReviewResponse[]
    activities: ConferenceActivityDTO[]
    workflowStatus: Record<string, boolean>
    interestsCount: number
    getDeadlineInfo: (type: string) => { deadline: Date; diffDays: number; isPast: boolean; isUrgent: boolean } | null
    onNavigate: (tab: ReviewerTab) => void
}) {
    const biddingDeadline = getDeadlineInfo('REVIEWER_BIDDING')
    const reviewDeadline = getDeadlineInfo('REVIEW_SUBMISSION')
    const completedReviews = reviews.filter(r => r.status === 'COMPLETED').length

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold">Dashboard</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Overview of your review progress at {conference?.name}
                </p>
            </div>

            <ReviewerPhaseStatusCard
                activities={activities}
                reviews={reviews}
                workflowStatus={workflowStatus}
                interestsCount={interestsCount}
                profileComplete={!!workflowStatus['profile-complete']}
                onNavigate={onNavigate}
                biddingDeadline={biddingDeadline}
                reviewDeadline={reviewDeadline}
            />

            {/* Old Deadline Badges block removed in favor of PhaseStatusCard */}

            {/* Stats cards */}
            <div className="grid gap-4 sm:grid-cols-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('profile')}>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className={`rounded-full p-2.5 ${workflowStatus['profile-complete'] ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                            <User2 className={`h-5 w-5 ${workflowStatus['profile-complete'] ? 'text-emerald-600' : 'text-amber-600'}`} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Profile</p>
                            <p className="text-xs text-muted-foreground">
                                {workflowStatus['profile-complete'] ? '✓ Complete' : '⚠ Incomplete'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('profile')}>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className={`rounded-full p-2.5 ${interestsCount > 0 ? 'bg-emerald-100' : 'bg-purple-100'}`}>
                            <Target className={`h-5 w-5 ${interestsCount > 0 ? 'text-emerald-600' : 'text-purple-600'}`} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Subject Areas</p>
                            <p className="text-xs text-muted-foreground">{interestsCount} selected</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('bidding')}>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="rounded-full p-2.5 bg-indigo-100">
                            <FileSearch className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Bidding</p>
                            <p className="text-xs text-muted-foreground">
                                {(() => {
                                    const totalBids = Object.values(bidCounts).reduce((sum, c) => sum + c, 0)
                                    return totalBids > 0 ? `${totalBids} papers bid` : 'No bids yet'
                                })()}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('reviews')}>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="rounded-full p-2.5 bg-amber-100">
                            <ClipboardList className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Reviews</p>
                            <p className="text-xs text-muted-foreground">{completedReviews}/{reviews.length} completed</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {!workflowStatus['profile-complete'] && (
                <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-amber-900">Next Step: Complete Profile</p>
                            <p className="text-xs text-amber-700">Update your Institution and select Subject Areas to unlock Bidding.</p>
                        </div>
                        <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => onNavigate('profile')}>
                            Go to Profile
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Bidding summary */}
            {Object.values(bidCounts).reduce((sum, c) => sum + c, 0) > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Bidding Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(BID_ICONS).map(([key, { icon, color, label }]) => (
                                <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 ${color}`}>
                                    {icon}
                                    <span className="font-semibold">{bidCounts?.[key] || 0}</span>
                                    <span className="text-sm text-gray-600">{label}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent reviews */}
            {reviews.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Assigned Reviews ({reviews.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {reviews.slice(0, 5).map(r => (
                                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/20 transition-colors">
                                    <div className="min-w-0 flex-1 mr-3">
                                        <p className="text-sm font-medium truncate">{r.paper?.title || `Paper #${r.paper?.id}`}</p>
                                    </div>
                                    <Badge className={reviewStatusClass(r.status)}>
                                        {r.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

// ──────────────────────────── Profile Tab ────────────────────────────
function ProfileTab({
    conferenceId, reviewerId, profile, userConflicts, interestsCount, onSaved
}: {
    conferenceId: number
    reviewerId: number
    profile: UserProfile | null
    userConflicts: UserConflictResponse[]
    interestsCount: number
    onSaved: () => void
}) {
    const [form, setForm] = useState({
        institution: profile?.institution || '',
        institutionCountry: profile?.institutionCountry || '',
        department: profile?.department || '',
        jobTitle: profile?.jobTitle || '',
        phoneMobile: profile?.phoneMobile || '',
        websiteUrl: profile?.websiteUrl || '',
        biography: profile?.biography || '',
        orcid: profile?.orcid || '',
        googleScholarLink: profile?.googleScholarLink || '',
        dblpId: profile?.dblpId || '',
        semanticScholarId: profile?.semanticScholarId || '',
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const [activeSection, setActiveSection] = useState<'info' | 'subjects' | 'conflicts'>('info')

    // Domain Conflicts state
    const [conflicts, setConflicts] = useState<UserConflictResponse[]>(userConflicts)
    const [newConflict, setNewConflict] = useState({ conflictEmail: '', conflictName: '', reason: '' })
    const [conflictErrors, setConflictErrors] = useState<Record<string, string>>({})
    const [addingConflict, setAddingConflict] = useState(false)

    useEffect(() => { setConflicts(userConflicts) }, [userConflicts])

    useEffect(() => {
        if (profile) {
            setForm({
                institution: profile.institution || '',
                institutionCountry: profile.institutionCountry || '',
                department: profile.department || '',
                jobTitle: profile.jobTitle || '',
                phoneMobile: profile.phoneMobile || '',
                websiteUrl: profile.websiteUrl || '',
                biography: profile.biography || '',
                orcid: profile.orcid || '',
                googleScholarLink: profile.googleScholarLink || '',
                dblpId: profile.dblpId || '',
                semanticScholarId: profile.semanticScholarId || '',
            })
        }
    }, [profile])

    const handleSave = async () => {
        const newErrs: Record<string, string> = {}
        const instErr = V.required(form.institution) || V.maxLen(form.institution, 200)
        if (instErr) newErrs.institution = instErr
        
        const cErr = V.maxLen(form.institutionCountry, 200)
        if (cErr) newErrs.institutionCountry = cErr
        
        const depErr = V.maxLen(form.department, 200)
        if (depErr) newErrs.department = depErr
        
        const jobErr = V.maxLen(form.jobTitle, 200)
        if (jobErr) newErrs.jobTitle = jobErr
        
        const phoneErr = V.phone(form.phoneMobile) || V.maxLen(form.phoneMobile, 50)
        if (phoneErr) newErrs.phoneMobile = phoneErr
        
        const webErr = V.url(form.websiteUrl) || V.maxLen(form.websiteUrl, 500)
        if (webErr) newErrs.websiteUrl = webErr
        
        const bioErr = V.maxLen(form.biography, 2000)
        if (bioErr) newErrs.biography = bioErr
        
        const orcErr = V.maxLen(form.orcid, 100) || V.orcid(form.orcid)
        if (orcErr) newErrs.orcid = orcErr
        
        const scholarErr = V.url(form.googleScholarLink) || V.maxLen(form.googleScholarLink, 500)
        if (scholarErr) newErrs.googleScholarLink = scholarErr
        
        const dblpErr = V.maxLen(form.dblpId, 100)
        if (dblpErr) newErrs.dblpId = dblpErr
        
        const semErr = V.maxLen(form.semanticScholarId, 100)
        if (semErr) newErrs.semanticScholarId = semErr

        setErrors(newErrs)
        if (Object.keys(newErrs).length > 0) {
            toast.error("Please fix the highlighted errors.")
            return
        }

        setSaving(true)
        try {
            await createOrUpdateUserProfile(reviewerId, {
                ...(profile || {} as any),
                ...form,
                userType: profile?.userType || 'ACADEMIA',
                phoneOffice: profile?.phoneOffice || '',
                secondaryInstitution: profile?.secondaryInstitution || '',
                secondaryCountry: profile?.secondaryCountry || '',
                institutionUrl: profile?.institutionUrl || '',
                avatarUrl: profile?.avatarUrl || '',
            })
            toast.success('Profile updated successfully!')
            onSaved()
        } catch (err: any) {
            const detail = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to save profile. Please check your input and try again.'
            toast.error(detail)
        }
        finally { setSaving(false) }
    }

    const handleAddConflict = async () => {
        const cErrs: Record<string, string> = {}
        const emailErr = V.email(newConflict.conflictEmail) || V.maxLen(newConflict.conflictEmail, 200)
        if (emailErr) cErrs.conflictEmail = emailErr
        
        const nameErr = V.maxLen(newConflict.conflictName, 200)
        if (nameErr) cErrs.conflictName = nameErr
        
        const rErr = V.maxLen(newConflict.reason, 1000)
        if (rErr) cErrs.reason = rErr
        
        setConflictErrors(cErrs)
        if (Object.keys(cErrs).length > 0) return

        setAddingConflict(true)
        try {
            await addUserConflict(reviewerId, newConflict)
            setNewConflict({ conflictEmail: '', conflictName: '', reason: '' })
            toast.success('Conflict added')
            onSaved()
        } catch { toast.error('Failed to add conflict') }
        finally { setAddingConflict(false) }
    }

    const handleDeleteConflict = async (id: number) => {
        if (!confirm('Remove this conflict?')) return
        try {
            await deleteUserConflict(reviewerId, id)
            toast.success('Conflict removed')
            onSaved()
        } catch { toast.error('Failed to remove conflict') }
    }

    const inputClass = "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"

    const sections = [
        { key: 'info' as const, label: 'Personal Info', icon: <User2 className="h-4 w-4" />, badge: profile?.institution ? '✓' : '!' },
        { key: 'subjects' as const, label: 'Subject Areas', icon: <Target className="h-4 w-4" />, badge: interestsCount > 0 ? `${interestsCount}` : '!' },
        { key: 'conflicts' as const, label: 'Domain Conflicts', icon: <Shield className="h-4 w-4" />, badge: `${conflicts.length}` },
    ]

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-bold">Profile & Subject Areas</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Complete your profile, select subject areas, and declare any conflicts of interest.
                </p>
            </div>

            {/* Section tabs */}
            <div className="flex gap-2 border-b pb-0">
                {sections.map(s => (
                    <button
                        key={s.key}
                        onClick={() => setActiveSection(s.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-[1px] ${
                            activeSection === s.key
                                ? 'border-indigo-600 text-indigo-700'
                                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                        }`}
                    >
                        {s.icon}
                        {s.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            s.badge === '!' ? 'bg-amber-100 text-amber-700' :
                            s.badge === '✓' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                            {s.badge}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Personal Info Section ── */}
            {activeSection === 'info' && (
                <div className="space-y-5">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-indigo-500" /> Organization Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Institution <span className="text-red-500">*</span></label>
                                    <input className={inputClass} value={form.institution} onChange={e => { setForm(f => ({ ...f, institution: e.target.value })); setErrors(e => ({...e, institution: ''}))}} placeholder="e.g. MIT, Stanford University" />
                                    <FieldError>{errors.institution}</FieldError>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Country</label>
                                    <input className={inputClass} value={form.institutionCountry} onChange={e => { setForm(f => ({ ...f, institutionCountry: e.target.value })); setErrors(e => ({...e, institutionCountry: ''}))}} placeholder="e.g. Vietnam" />
                                    <FieldError>{errors.institutionCountry}</FieldError>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Department</label>
                                    <input className={inputClass} value={form.department} onChange={e => { setForm(f => ({ ...f, department: e.target.value })); setErrors(e => ({...e, department: ''}))}} placeholder="e.g. Computer Science" />
                                    <FieldError>{errors.department}</FieldError>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Job Title</label>
                                    <input className={inputClass} value={form.jobTitle} onChange={e => { setForm(f => ({ ...f, jobTitle: e.target.value })); setErrors(e => ({...e, jobTitle: ''}))}} placeholder="e.g. Associate Professor" />
                                    <FieldError>{errors.jobTitle}</FieldError>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Mail className="h-4 w-4 text-indigo-500" /> Contact
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Phone</label>
                                    <input className={inputClass} value={form.phoneMobile} onChange={e => { setForm(f => ({ ...f, phoneMobile: e.target.value })); setErrors(e => ({...e, phoneMobile: ''}))}} placeholder="+84..." />
                                    <FieldError>{errors.phoneMobile}</FieldError>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Website</label>
                                    <input className={inputClass} value={form.websiteUrl} onChange={e => { setForm(f => ({ ...f, websiteUrl: e.target.value })); setErrors(e => ({...e, websiteUrl: ''}))}} placeholder="https://..." />
                                    <FieldError>{errors.websiteUrl}</FieldError>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-indigo-500" /> Academic Links
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">ORCID ID</label>
                                    <input className={inputClass} value={form.orcid} onChange={e => { setForm(f => ({ ...f, orcid: e.target.value })); setErrors(e => ({...e, orcid: ''}))}} placeholder="0000-0001-2345-6789" />
                                    <FieldError>{errors.orcid}</FieldError>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Google Scholar</label>
                                    <input className={inputClass} value={form.googleScholarLink} onChange={e => { setForm(f => ({ ...f, googleScholarLink: e.target.value })); setErrors(e => ({...e, googleScholarLink: ''}))}} placeholder="https://scholar.google.com/..." />
                                    <FieldError>{errors.googleScholarLink}</FieldError>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">DBLP ID</label>
                                    <input className={inputClass} value={form.dblpId} onChange={e => { setForm(f => ({ ...f, dblpId: e.target.value })); setErrors(e => ({...e, dblpId: ''}))}} placeholder="pid/123/456" />
                                    <FieldError>{errors.dblpId}</FieldError>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Semantic Scholar ID</label>
                                    <input className={inputClass} value={form.semanticScholarId} onChange={e => { setForm(f => ({ ...f, semanticScholarId: e.target.value })); setErrors(e => ({...e, semanticScholarId: ''}))}} placeholder="ID" />
                                    <FieldError>{errors.semanticScholarId}</FieldError>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Biography</CardTitle></CardHeader>
                        <CardContent>
                            <textarea className={`${inputClass} min-h-[100px] resize-y`} value={form.biography} onChange={e => { setForm(f => ({ ...f, biography: e.target.value })); setErrors(e => ({...e, biography: ''}))}} placeholder="A brief introduction about yourself..." />
                            <FieldError>{errors.biography}</FieldError>
                        </CardContent>
                    </Card>
                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {saving ? 'Saving...' : 'Save Profile'}
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Subject Areas Section ── */}
            {activeSection === 'subjects' && (
                <SubjectAreasTab conferenceId={conferenceId} reviewerId={reviewerId} onSaved={onSaved} />
            )}

            {/* ── Domain Conflicts Section ── */}
            {activeSection === 'conflicts' && (
                <div className="space-y-5">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Declare people you have a conflict of interest with. This helps the Chair avoid assigning you papers that involve these individuals.
                        </p>
                    </div>

                    {/* Add conflict form */}
                    <Card className="border-indigo-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Shield className="h-4 w-4 text-indigo-500" /> Add Conflict
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Email <span className="text-red-500">*</span></label>
                                    <input className={inputClass} value={newConflict.conflictEmail} onChange={e => { setNewConflict(c => ({ ...c, conflictEmail: e.target.value })); setConflictErrors(e => ({...e, conflictEmail: ''}))}} placeholder="researcher@university.edu" />
                                    <FieldError>{conflictErrors.conflictEmail}</FieldError>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Name</label>
                                    <input className={inputClass} value={newConflict.conflictName} onChange={e => { setNewConflict(c => ({ ...c, conflictName: e.target.value })); setConflictErrors(e => ({...e, conflictName: ''}))}} placeholder="Dr. Jane Smith" />
                                    <FieldError>{conflictErrors.conflictName}</FieldError>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700 mb-1 block">Reason</label>
                                    <input className={inputClass} value={newConflict.reason} onChange={e => { setNewConflict(c => ({ ...c, reason: e.target.value })); setConflictErrors(e => ({...e, reason: ''}))}} placeholder="e.g. Colleague, Co-author" />
                                    <FieldError>{conflictErrors.reason}</FieldError>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button size="sm" onClick={handleAddConflict} disabled={addingConflict || !newConflict.conflictEmail.trim()} className="gap-1.5">
                                    {addingConflict ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                                    Add Conflict
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Conflicts list */}
                    {conflicts.length === 0 ? (
                        <Card>
                            <CardContent className="py-10 text-center text-muted-foreground">
                                <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No conflicts declared yet.</p>
                                <p className="text-xs mt-1">Add conflicts above if you have any.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {conflicts.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/20 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium">{c.conflictName || c.conflictEmail}</p>
                                            {!c.isActive && <Badge variant="outline" className="text-[10px] border-red-200 text-red-600">Inactive</Badge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{c.conflictEmail}</p>
                                        {c.reason && <p className="text-xs text-gray-500 mt-0.5">{c.reason}</p>}
                                    </div>
                                    <button onClick={() => handleDeleteConflict(c.id)} className="text-red-400 hover:text-red-600 transition-colors p-1.5">
                                        <AlertTriangle className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

