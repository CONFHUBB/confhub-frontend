'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getConference, getConferenceActivities } from '@/app/api/conference.api'
import { getBidsSummary } from '@/app/api/bidding.api'
import { getReviewsByReviewerAndConference } from '@/app/api/review.api'
import { getUserProfile, createOrUpdateUserProfile } from '@/app/api/user.api'
import { getInterestsByReviewer } from '@/app/api/reviewer-interest.api'
import type { ConferenceResponse, ConferenceActivityDTO } from '@/types/conference'
import type { BidsSummary } from '@/types/bidding'
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
    Building2, Mail, Globe, GraduationCap, Phone
} from 'lucide-react'
import toast from 'react-hot-toast'
import { SubjectAreasTab } from './subject-areas-tab'
import { BiddingTab } from './bidding-tab'
import { FieldError } from '@/components/ui/field'
import { V } from '@/lib/validation'

// ──────────────────────────── Types ────────────────────────────
type ReviewerTab =
    | 'dashboard'
    | 'profile'
    | 'bidding'
    | 'reviews'

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
        ]
    }
]

const STATUS_COLORS: Record<string, string> = {
    ASSIGNED: 'bg-indigo-100 text-indigo-800',
    IN_PROGRESS: 'bg-amber-100 text-amber-800',
    COMPLETED: 'bg-green-100 text-green-800',
    DECLINED: 'bg-red-100 text-red-800',
}

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

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<ReviewerTab>('dashboard')
    const [expandedGroups, setExpandedGroups] = useState<string[]>(
        TAB_GROUPS.map(g => g.title)
    )
    const [reviewerId, setReviewerId] = useState<number | null>(null)

    // Data states
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [bidsSummary, setBidsSummary] = useState<BidsSummary | null>(null)
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])
    const [interestsCount, setInterestsCount] = useState(0)
    const [userConflicts, setUserConflicts] = useState<UserConflictResponse[]>([])

    // Workflow status
    const [workflowStatus, setWorkflowStatus] = useState<Record<string, boolean>>({})

    // Get userId from JWT
    useEffect(() => {
        try {
            const token = localStorage.getItem('accessToken')
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]))
                setReviewerId(payload.userId || payload.id)
            }
        } catch { /* ignore */ }
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

            const [profileData, summary, reviewsData, interests] = await Promise.all([
                getUserProfile(reviewerId).catch(() => null),
                getBidsSummary(reviewerId, conferenceId).catch(() => null),
                getReviewsByReviewerAndConference(reviewerId, conferenceId).catch(() => []),
                getInterestsByReviewer(reviewerId).catch(() => []),
            ])

            setProfile(profileData)
            if (summary) setBidsSummary(summary)
            const reviewList = Array.isArray(reviewsData) ? reviewsData : (reviewsData as any)?.content || []
            setReviews(reviewList)
            setInterestsCount(Array.isArray(interests) ? interests.length : 0)

            // Fetch user conflicts
            const conflicts = await getUserConflicts(reviewerId).catch(() => [])
            setUserConflicts(conflicts)

            // Compute workflow status
            const profileComplete = !!(profileData && profileData.institution) && (Array.isArray(interests) && interests.length > 0)
            const biddingDone = summary ? summary.totalBids > 0 : false
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
                    bidsSummary={bidsSummary}
                    reviews={reviews}
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
                return <BiddingTab conferenceId={conferenceId} reviewerId={reviewerId!} onDataChanged={() => fetchData()} />
            case 'reviews':
                return <ReviewsTab
                    reviews={reviews}
                    conferenceId={conferenceId}
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
                {/* Header */}
                <div className="mb-6 shrink-0">
                    <Button variant="ghost" className="mb-3 -ml-2 gap-2" onClick={() => router.push('/conference/reviewer-select')}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to Conferences
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{conference?.name || 'Conference'}</h1>
                        <p className="text-muted-foreground text-sm mt-1">Reviewer Console — {conference?.acronym}</p>
                    </div>
                </div>

                {/* Card: Sidebar + Content */}
                <Card className="flex flex-col md:flex-row shadow-lg overflow-hidden flex-1 min-h-0 bg-background border border-border">
                    {/* Sidebar */}
                    <div className="md:w-64 shrink-0 bg-muted/5 border-r flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Progress bar */}
                            <div className="mb-5 px-1">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Progress</span>
                                    <span className={`text-[10px] font-bold ${pct === 100 ? 'text-emerald-600' : 'text-muted-foreground'}`}>{doneCount}/{totalCount}</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>

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

// ──────────────────────────── Dashboard Tab ────────────────────────────
function DashboardTab({
    conference, bidsSummary, reviews, activities, workflowStatus, interestsCount, getDeadlineInfo, onNavigate
}: {
    conference: ConferenceResponse | null
    bidsSummary: BidsSummary | null
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

            {/* Deadline badges */}
            {(biddingDeadline || reviewDeadline) && (
                <div className="flex flex-wrap gap-2">
                    {biddingDeadline && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                            biddingDeadline.isPast ? 'bg-gray-100 text-gray-500 border-gray-200' :
                            biddingDeadline.isUrgent ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' :
                            'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                            <Clock className="h-3 w-3" />
                            Bidding: {biddingDeadline.isPast ? 'Closed' : `${biddingDeadline.diffDays} days remaining`}
                        </span>
                    )}
                    {reviewDeadline && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                            reviewDeadline.isPast ? 'bg-gray-100 text-gray-500 border-gray-200' :
                            reviewDeadline.isUrgent ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' :
                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                            <Clock className="h-3 w-3" />
                            Review: {reviewDeadline.isPast ? 'Closed' : `${reviewDeadline.diffDays} days remaining`}
                        </span>
                    )}
                </div>
            )}

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
                                {bidsSummary ? `${bidsSummary.totalBids}/${bidsSummary.totalPapers} papers` : 'No bids yet'}
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
            {bidsSummary && bidsSummary.totalBids > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Bidding Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(BID_ICONS).map(([key, { icon, color, label }]) => (
                                <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 ${color}`}>
                                    {icon}
                                    <span className="font-semibold">{bidsSummary.bidCounts?.[key] || 0}</span>
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
                                    <Badge className={STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-800'}>
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
        orcidId: profile?.orcidId || '',
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
                orcidId: profile.orcidId || '',
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
        
        const orcErr = V.maxLen(form.orcidId, 100) || V.orcid(form.orcidId)
        if (orcErr) newErrs.orcidId = orcErr
        
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
                userType: profile?.userType || 'REVIEWER',
                phoneOffice: profile?.phoneOffice || '',
                secondaryInstitution: profile?.secondaryInstitution || '',
                secondaryCountry: profile?.secondaryCountry || '',
                institutionUrl: profile?.institutionUrl || '',
                avatarUrl: profile?.avatarUrl || '',
            })
            toast.success('Profile updated successfully!')
            onSaved()
        } catch { toast.error('Failed to save profile') }
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
                                    <input className={inputClass} value={form.orcidId} onChange={e => { setForm(f => ({ ...f, orcidId: e.target.value })); setErrors(e => ({...e, orcidId: ''}))}} placeholder="0000-0001-2345-6789" />
                                    <FieldError>{errors.orcidId}</FieldError>
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

// ──────────────────────────── Reviews Tab ────────────────────────────
function ReviewsTab({ reviews, conferenceId }: { reviews: ReviewResponse[]; conferenceId: number }) {
    const [expandedReview, setExpandedReview] = useState<number | null>(null)

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-bold">Assigned Reviews</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {reviews.length} paper(s) assigned to you.
                </p>
            </div>

            {reviews.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p>No papers assigned yet.</p>
                        <p className="text-sm mt-1">The Chair will assign papers after bidding is complete.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="overflow-auto rounded-xl border bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/30">
                                <th className="px-5 py-3.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">#</th>
                                <th className="px-5 py-3.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Paper Title</th>
                                <th className="px-5 py-3.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                                <th className="px-5 py-3.5 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Score</th>
                                <th className="px-5 py-3.5 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {reviews.map((review, i) => (
                                <React.Fragment key={review.id}>
                                    <tr className="hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}>
                                        <td className="px-5 py-4 text-xs text-muted-foreground font-medium">{i + 1}</td>
                                        <td className="px-5 py-4 font-medium max-w-md">
                                            <span className="truncate block">{review.paper?.title || `Paper #${review.paper?.id}`}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Badge className={STATUS_COLORS[review.status] || 'bg-gray-100 text-gray-800'}>
                                                {review.status}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-4 font-mono">
                                            {review.totalScore != null ? review.totalScore : '—'}
                                        </td>
                                        <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                                            {review.status !== 'DECLINED' && (
                                                <Link href={`/conference/${conferenceId}/reviewer/review/${review.id}`}>
                                                    <Button size="sm" variant={review.status === 'COMPLETED' ? 'outline' : 'default'}>
                                                        {review.status === 'COMPLETED' ? 'View' : review.status === 'ASSIGNED' ? 'Start' : 'Continue'}
                                                    </Button>
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedReview === review.id && review.paper?.abstractField && (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-4 bg-indigo-50/50">
                                                <div className="text-sm text-gray-600 max-w-3xl">
                                                    <p className="font-medium text-gray-700 text-xs uppercase tracking-wider mb-1">Abstract</p>
                                                    <p className="leading-relaxed line-clamp-4">{review.paper.abstractField}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
