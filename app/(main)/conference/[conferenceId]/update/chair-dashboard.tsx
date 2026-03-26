'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Loader2, FileText, Users, BarChart3, CheckCircle2,
    Clock, AlertTriangle, Eye, UserCheck, ChevronRight,
    Settings, Send, Search, Award, Calendar, Zap, XCircle,
    ArrowRight, ChevronDown, ChevronUp, Gavel, MessageSquare, Ticket, PartyPopper
} from 'lucide-react'
import { getPapersByConference } from '@/app/api/paper.api'
import { getAggregatesByConference } from '@/app/api/review-aggregate.api'
import { getConferenceActivities } from '@/app/api/conference.api'
import { getTracksByConference, getSubjectAreasByTrack } from '@/app/api/track.api'
import { getConferenceSubmissionForm } from '@/app/api/submission-form.api'
import { getConferenceMembers } from '@/app/api/user.api'
import { getReviewQuestionsByTrack } from '@/app/api/review.api'
import { getTicketTypes } from '@/app/api/registration.api'
import type { ConferenceActivityDTO } from '@/types/conference'

interface PaperSummary {
    id: number
    title: string
    status: string
    reviewCount: number
    completedReviewCount: number
    averageTotalScore: number | null
}

interface ChairDashboardProps {
    conferenceId: number
    onNavigate?: (tab: string) => void
}

interface PhaseData {
    hasTracks: boolean
    hasSubjectAreas: boolean
    hasMembers: boolean
    hasTickets: boolean
    hasSubmissionForm: boolean
    hasReviewForm: boolean
    // Submission
    submissionEnabled: boolean
    submissionDeadlineSet: boolean
    submissionDeadlinePassed: boolean
    hasPapers: boolean
    // Bidding
    biddingEnabled: boolean
    biddingDeadlineSet: boolean
    reviewersAssigned: boolean
    // Review
    reviewEnabled: boolean
    reviewDeadlineSet: boolean
    allReviewsCompleted: boolean
    // Discussion
    discussionEnabled: boolean
    discussionDeadlineSet: boolean
    // Decision
    papersHaveDecisions: boolean
    authorNotificationEnabled: boolean
    cameraReadyEnabled: boolean
    cameraReadyDeadlineSet: boolean
    // Registration
    registrationEnabled: boolean
    registrationDeadlineSet: boolean
    hasCameraReadySubmissions: boolean
    hasAttendees: boolean
    // Event
    eventDayEnabled: boolean
    hasProgram: boolean
}

const ACTIVITY_LABELS: Record<string, string> = {
    PAPER_SUBMISSION: 'Paper Submission',
    REVIEWER_BIDDING: 'Reviewer Bidding',
    REVIEW_SUBMISSION: 'Review Submission',
    REVIEW_DISCUSSION: 'Review Discussion',
    AUTHOR_NOTIFICATION: 'Author Notification',
    CAMERA_READY_SUBMISSION: 'Camera-Ready Submission',
    REGISTRATION: 'Registration',
    EVENT_DAY: 'Event Day',
}

// ─── Phase definitions (9 phases) ─────────────────────────────────────────────
const PHASES = [
    {
        id: 'setup',
        label: 'Setup',
        icon: Settings,
        color: 'indigo',
        activityKeys: [] as string[],
        nextPhaseTab: 'features-activity-timeline',
        nextPhaseHint: 'Go to Activity Timeline and enable Paper Submission to start the Submission phase.',
    },
    {
        id: 'submission',
        label: 'Submission',
        icon: Send,
        color: 'sky',
        activityKeys: ['PAPER_SUBMISSION'],
        nextPhaseTab: 'features-activity-timeline',
        nextPhaseHint: 'Enable Reviewer Bidding to start the Bidding phase.',
    },
    {
        id: 'bidding',
        label: 'Bidding',
        icon: Gavel,
        color: 'teal',
        activityKeys: ['REVIEWER_BIDDING'],
        nextPhaseTab: 'features-activity-timeline',
        nextPhaseHint: 'Assign reviewers and enable Review Submission activity.',
    },
    {
        id: 'review',
        label: 'Review',
        icon: Search,
        color: 'amber',
        activityKeys: ['REVIEW_SUBMISSION'],
        nextPhaseTab: 'features-activity-timeline',
        nextPhaseHint: 'Enable Discussion activity for reviewers to deliberate.',
    },
    {
        id: 'discussion',
        label: 'Discussion',
        icon: MessageSquare,
        color: 'orange',
        activityKeys: ['REVIEW_DISCUSSION'],
        nextPhaseTab: 'features-activity-timeline',
        nextPhaseHint: 'Go to Activity Timeline and enable Author Notification to start the Decision phase.',
    },
    {
        id: 'decision',
        label: 'Decision',
        icon: Award,
        color: 'purple',
        activityKeys: ['AUTHOR_NOTIFICATION'],
        nextPhaseTab: 'features-activity-timeline',
        nextPhaseHint: 'Enable Camera-Ready Submission to collect final papers.',
    },
    {
        id: 'camera-ready',
        label: 'Camera-Ready',
        icon: FileText,
        color: 'cyan',
        activityKeys: ['CAMERA_READY_SUBMISSION'],
        nextPhaseTab: 'features-activity-timeline',
        nextPhaseHint: 'Enable Registration activity to open attendee registration.',
    },
    {
        id: 'registration',
        label: 'Registration',
        icon: Ticket,
        color: 'rose',
        activityKeys: ['REGISTRATION'],
        nextPhaseTab: 'features-activity-timeline',
        nextPhaseHint: 'Enable Event Day activity when you are ready for the live event.',
    },
    {
        id: 'event',
        label: 'Event Day',
        icon: PartyPopper,
        color: 'emerald',
        activityKeys: ['EVENT_DAY'],
        nextPhaseTab: '',
        nextPhaseHint: '',
    },
]

// ─── Checklist definitions per phase ─────────────────────────────────────────
function getPhaseChecklist(phaseId: string, pd: PhaseData): { label: string; met: boolean; tab: string; blocking: boolean }[] {
    switch (phaseId) {
        case 'setup':
            return [
                { label: 'At least 1 track created', met: pd.hasTracks, tab: 'features-tracks', blocking: true },
                { label: 'Subject areas defined', met: pd.hasSubjectAreas, tab: 'features-subject-areas', blocking: true },
                { label: 'Members & roles assigned', met: pd.hasMembers, tab: 'features-members', blocking: true },
                { label: 'Tickets & fees configured', met: pd.hasTickets, tab: 'reg-ticket-types', blocking: true },
                { label: 'Submission form configured', met: pd.hasSubmissionForm, tab: 'forms-submission', blocking: true },
                { label: 'Review form configured', met: pd.hasReviewForm, tab: 'forms-review', blocking: true },
            ]
        case 'submission':
            return [
                { label: 'Paper Submission activity enabled', met: pd.submissionEnabled, tab: 'features-activity-timeline', blocking: true },
                { label: 'Submission deadline set', met: pd.submissionDeadlineSet, tab: 'features-activity-timeline', blocking: true },
                { label: 'At least 1 paper submitted', met: pd.hasPapers, tab: 'features-paper-management', blocking: true },
                { label: 'Submission deadline has passed', met: pd.submissionDeadlinePassed, tab: 'features-activity-timeline', blocking: false },
            ]
        case 'bidding':
            return [
                { label: 'Reviewer Bidding activity enabled', met: pd.biddingEnabled, tab: 'features-activity-timeline', blocking: true },
                { label: 'Bidding deadline set', met: pd.biddingDeadlineSet, tab: 'features-activity-timeline', blocking: true },
                { label: 'Reviewers assigned to papers', met: pd.reviewersAssigned, tab: 'features-review-management', blocking: true },
            ]
        case 'review':
            return [
                { label: 'Review Submission activity enabled', met: pd.reviewEnabled, tab: 'features-activity-timeline', blocking: true },
                { label: 'Review deadline set', met: pd.reviewDeadlineSet, tab: 'features-activity-timeline', blocking: true },
                { label: 'All reviews completed', met: pd.allReviewsCompleted, tab: 'features-review-management', blocking: false },
            ]
        case 'discussion':
            return [
                { label: 'Discussion activity enabled', met: pd.discussionEnabled, tab: 'features-activity-timeline', blocking: true },
                { label: 'Discussion deadline set', met: pd.discussionDeadlineSet, tab: 'features-activity-timeline', blocking: false },
            ]
        case 'decision':
            return [
                { label: 'Decisions made on papers (Accept/Reject)', met: pd.papersHaveDecisions, tab: 'features-paper-management', blocking: true },
                { label: 'Author Notification activity enabled', met: pd.authorNotificationEnabled, tab: 'features-activity-timeline', blocking: true },
            ]
        case 'camera-ready':
            return [
                { label: 'Camera-Ready Submission enabled', met: pd.cameraReadyEnabled, tab: 'features-activity-timeline', blocking: true },
                { label: 'Camera-Ready deadline set', met: pd.cameraReadyDeadlineSet, tab: 'features-activity-timeline', blocking: true },
                { label: 'Camera-Ready submissions received', met: pd.hasCameraReadySubmissions, tab: 'features-camera-ready', blocking: false },
            ]
        case 'registration':
            return [
                { label: 'Registration activity enabled', met: pd.registrationEnabled, tab: 'features-activity-timeline', blocking: true },
                { label: 'Registration deadline set', met: pd.registrationDeadlineSet, tab: 'features-activity-timeline', blocking: false },
                { label: 'At least 1 attendee registered', met: pd.hasAttendees, tab: 'reg-attendees', blocking: false },
            ]
        case 'event':
            return [
                { label: 'Event Day activity enabled', met: pd.eventDayEnabled, tab: 'features-activity-timeline', blocking: false },
                { label: 'Program / sessions built', met: pd.hasProgram, tab: 'features-program-builder', blocking: false },
            ]
        default:
            return []
    }
}

// Human-readable action label for each sidebar tab key
const TAB_ACTION_LABELS: Record<string, string> = {
    'general-detail': 'Conference Details',
    'features-tracks': 'Manage Tracks',
    'features-subject-areas': 'Subject Areas',
    'features-members': 'Members & Roles',
    'forms-submission': 'Submission Form',
    'forms-review': 'Review Form',
    'features-activity-timeline': 'Timeline',
    'features-paper-management': 'Papers',
    'features-review-management': 'Review Mgmt',
    'features-camera-ready': 'Camera-Ready',
    'features-program-builder': 'Program',
    'forms-mail': 'Email Templates',
    'reg-ticket-types': 'Ticket Types',
    'reg-attendees': 'Attendees',
    'reg-checkin': 'Check-in',
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; light: string; dot: string; btn: string }> = {
    indigo:  { bg: 'bg-indigo-600',  text: 'text-indigo-700',  border: 'border-indigo-300',  light: 'bg-indigo-50',  dot: 'bg-indigo-500',  btn: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
    sky:     { bg: 'bg-sky-500',     text: 'text-sky-700',     border: 'border-sky-300',     light: 'bg-sky-50',     dot: 'bg-sky-500',     btn: 'bg-sky-500 hover:bg-sky-600 text-white' },
    teal:    { bg: 'bg-teal-500',    text: 'text-teal-700',    border: 'border-teal-300',    light: 'bg-teal-50',    dot: 'bg-teal-500',    btn: 'bg-teal-500 hover:bg-teal-600 text-white' },
    amber:   { bg: 'bg-amber-500',   text: 'text-amber-700',   border: 'border-amber-300',   light: 'bg-amber-50',   dot: 'bg-amber-500',   btn: 'bg-amber-500 hover:bg-amber-600 text-white' },
    orange:  { bg: 'bg-orange-500',  text: 'text-orange-700',  border: 'border-orange-300',  light: 'bg-orange-50',  dot: 'bg-orange-500',  btn: 'bg-orange-500 hover:bg-orange-600 text-white' },
    purple:  { bg: 'bg-purple-600',  text: 'text-purple-700',  border: 'border-purple-300',  light: 'bg-purple-50',  dot: 'bg-purple-500',  btn: 'bg-purple-600 hover:bg-purple-700 text-white' },
    cyan:    { bg: 'bg-cyan-500',    text: 'text-cyan-700',    border: 'border-cyan-300',    light: 'bg-cyan-50',    dot: 'bg-cyan-500',    btn: 'bg-cyan-500 hover:bg-cyan-600 text-white' },
    rose:    { bg: 'bg-rose-500',    text: 'text-rose-700',    border: 'border-rose-300',    light: 'bg-rose-50',    dot: 'bg-rose-500',    btn: 'bg-rose-500 hover:bg-rose-600 text-white' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-300', light: 'bg-emerald-50', dot: 'bg-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
}

// Detect active phase by scanning from the last phase backward
function detectActivePhaseIndex(activities: ConferenceActivityDTO[]): number {
    const enabled = new Set(activities.filter(a => a.isEnabled).map(a => a.activityType))
    // Scan from last phase backward
    if (enabled.has('EVENT_DAY'))              return 8  // Event Day
    if (enabled.has('REGISTRATION'))           return 7  // Registration
    if (enabled.has('CAMERA_READY_SUBMISSION'))return 6  // Camera-Ready
    if (enabled.has('AUTHOR_NOTIFICATION'))    return 5  // Decision
    if (enabled.has('REVIEW_DISCUSSION'))      return 4  // Discussion
    if (enabled.has('REVIEW_SUBMISSION'))      return 3  // Review
    if (enabled.has('REVIEWER_BIDDING'))       return 2  // Bidding
    if (enabled.has('PAPER_SUBMISSION'))       return 1  // Submission
    return 0 // Setup
}

// ─── Phase Status Card ────────────────────────────────────────────────────────
function PhaseStatusCard({
    activities, papers, phaseData, onNavigate
}: {
    activities: ConferenceActivityDTO[]
    papers: PaperSummary[]
    phaseData: PhaseData
    onNavigate?: (tab: string) => void
}) {
    const now = new Date()
    const activePhaseIdx = detectActivePhaseIndex(activities)
    const activePhase = PHASES[activePhaseIdx]
    const c = COLOR_MAP[activePhase.color]
    const [checklistOpen, setChecklistOpen] = useState(true)

    // Nearest upcoming deadline
    const upcoming = activities
        .filter(a => a.isEnabled && a.deadline)
        .map(a => ({ ...a, d: new Date(a.deadline!) }))
        .filter(a => a.d > now)
        .sort((a, b) => a.d.getTime() - b.d.getTime())[0]

    const daysLeft = upcoming ? Math.ceil((upcoming.d.getTime() - now.getTime()) / 86400000) : null
    const isUrgent = daysLeft !== null && daysLeft <= 5

    // Checklist for current phase
    const checklist = getPhaseChecklist(activePhase.id, phaseData)
    const blockingItems = checklist.filter(i => i.blocking)
    const allBlockingMet = blockingItems.every(i => i.met)
    const metCount = checklist.filter(i => i.met).length
    const unmetBlocking = blockingItems.filter(i => !i.met)

    // Issues
    const unassigned = papers.filter(p => p.status !== 'DRAFT' && p.reviewCount === 0).length
    const pendingDecision = papers.filter(p =>
        ['UNDER_REVIEW', 'SUBMITTED'].includes(p.status) &&
        p.completedReviewCount >= p.reviewCount && p.reviewCount > 0
    ).length

    const isLastPhase = activePhaseIdx === PHASES.length - 1

    return (
        <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Phase stepper */}
            <div className="bg-white px-6 pt-5 pb-0">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Conference Phase</span>
                    </div>
                    {upcoming && (
                        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${isUrgent ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                            <Clock className="w-3 h-3" />
                            {ACTIVITY_LABELS[upcoming.activityType] || upcoming.activityType}: {daysLeft}d left
                            {isUrgent && ' ⚠'}
                        </div>
                    )}
                </div>

                {/* Stepper */}
                <div className="flex items-stretch">
                    {PHASES.map((phase, idx) => {
                        const Icon = phase.icon
                        const isCurrent = idx === activePhaseIdx
                        const isDone = idx < activePhaseIdx
                        const pc = COLOR_MAP[phase.color]
                        return (
                            <div key={phase.id} className="flex-1 flex flex-col items-center relative">
                                {idx > 0 && (
                                    <div className={`absolute top-5 right-1/2 left-0 h-0.5 ${isDone || isCurrent ? 'bg-indigo-400' : 'bg-gray-200'}`} />
                                )}
                                {idx < PHASES.length - 1 && (
                                    <div className={`absolute top-5 left-1/2 right-0 h-0.5 ${isDone ? 'bg-indigo-400' : 'bg-gray-200'}`} />
                                )}
                                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                                    ${isCurrent ? `${pc.bg} border-transparent shadow-lg ring-4 ring-offset-1 ring-${phase.color}-200` : ''}
                                    ${isDone ? 'bg-indigo-500 border-indigo-500' : ''}
                                    ${!isCurrent && !isDone ? 'bg-white border-gray-200' : ''}
                                `}>
                                    {isDone
                                        ? <CheckCircle2 className="w-5 h-5 text-white" />
                                        : <Icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-gray-400'}`} />
                                    }
                                </div>
                                <span className={`mt-2 text-xs font-semibold text-center leading-tight
                                    ${isCurrent ? pc.text : isDone ? 'text-indigo-500' : 'text-gray-400'}
                                `}>
                                    {phase.label}
                                </span>
                                {isCurrent && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 ${pc.light} ${pc.text} font-bold`}>
                                        Active
                                    </span>
                                )}
                                {!isCurrent && !isDone && <span className="text-[10px] text-gray-300 mt-1">Upcoming</span>}
                                {isDone && <span className="text-[10px] text-indigo-400 mt-1">Done</span>}
                            </div>
                        )
                    })}
                </div>

                <div className="mt-5 border-t border-gray-100" />
            </div>

            {/* Current phase action panel */}
            <div className={`${c.light} px-6 py-4`}>
                <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${c.text}`}>
                            Current Phase: {activePhase.label}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                            {unassigned > 0 && activePhaseIdx >= 1 && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                    ⚠ {unassigned} paper(s) need reviewer assignment
                                </span>
                            )}
                            {pendingDecision > 0 && activePhaseIdx >= 2 && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                    ⚠ {pendingDecision} paper(s) awaiting decision
                                </span>
                            )}
                            {unassigned === 0 && pendingDecision === 0 && (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                    ✓ No immediate action required
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Phase Checklist */}
            <div className="border-t border-gray-100 bg-white">
                <button
                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                    onClick={() => setChecklistOpen(v => !v)}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                            Phase Checklist
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            allBlockingMet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {metCount}/{checklist.length} done
                        </span>
                    </div>
                    {checklistOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                </button>

                {checklistOpen && (
                    <div className="px-6 pb-5 space-y-2">
                        {checklist.map((item, i) => (
                            <div
                                key={i}
                                onClick={() => onNavigate?.(item.tab)}
                                className="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors text-left group cursor-pointer"
                            >
                                {item.met ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : item.blocking ? (
                                    <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-gray-300 shrink-0" />
                                )}
                                <span className={`text-sm flex-1 ${
                                    item.met
                                        ? 'text-gray-700 line-through decoration-gray-300'
                                        : item.blocking
                                            ? 'text-gray-800 font-medium'
                                            : 'text-gray-400'
                                }`}>
                                    {item.label}
                                </span>
                                {item.blocking && !item.met && (
                                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50 shrink-0">
                                        Required
                                    </Badge>
                                )}
                                {!item.blocking && !item.met && (
                                    <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-200 shrink-0">
                                        Optional
                                    </Badge>
                                )}
                                {/* Inline action button — always visible */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`text-[11px] h-6 px-2.5 rounded-md shrink-0 font-semibold border ${
                                        item.met
                                            ? 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                                            : `${c.border} ${c.text} bg-white hover:${c.light}`
                                    }`}
                                    onClick={(e) => { e.stopPropagation(); onNavigate?.(item.tab) }}
                                >
                                    {TAB_ACTION_LABELS[item.tab] || 'Configure'}
                                    <ChevronRight className="w-3 h-3 ml-0.5" />
                                </Button>
                            </div>
                        ))}

                        {/* Next Phase button */}
                        {!isLastPhase && (
                            <div className="pt-3 border-t border-gray-100 mt-3">
                                {allBlockingMet ? (
                                    <div className="space-y-2">
                                        <p className="text-xs text-emerald-600 font-medium">
                                            ✓ All required conditions met — ready for next phase
                                        </p>
                                        <p className="text-xs text-gray-400">{activePhase.nextPhaseHint}</p>
                                        <Button
                                            size="sm"
                                            className={`${c.btn} rounded-lg font-semibold text-xs gap-1.5`}
                                            onClick={() => onNavigate?.(activePhase.nextPhaseTab)}
                                        >
                                            Proceed to {PHASES[activePhaseIdx + 1].label}
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-xs text-amber-600 font-medium">
                                            ⚠ Complete all required items above to unlock next phase
                                        </p>
                                        <Button
                                            size="sm"
                                            disabled
                                            className="rounded-lg font-semibold text-xs gap-1.5 opacity-40 cursor-not-allowed"
                                        >
                                            Proceed to {PHASES[activePhaseIdx + 1].label}
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {isLastPhase && (
                            <div className="pt-3 border-t border-gray-100 mt-3">
                                <p className="text-xs text-emerald-600 font-medium">
                                    🎉 Final phase — manage your live event!
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export function ChairDashboard({ conferenceId, onNavigate }: ChairDashboardProps) {
    const [papers, setPapers] = useState<PaperSummary[]>([])
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])
    const [phaseData, setPhaseData] = useState<PhaseData>({
        hasTracks: false,
        hasSubjectAreas: false,
        hasMembers: false,
        hasTickets: false,
        hasSubmissionForm: false,
        hasReviewForm: false,
        submissionEnabled: false,
        submissionDeadlineSet: false,
        submissionDeadlinePassed: false,
        hasPapers: false,
        biddingEnabled: false,
        biddingDeadlineSet: false,
        reviewersAssigned: false,
        reviewEnabled: false,
        reviewDeadlineSet: false,
        allReviewsCompleted: false,
        discussionEnabled: false,
        discussionDeadlineSet: false,
        papersHaveDecisions: false,
        authorNotificationEnabled: false,
        cameraReadyEnabled: false,
        cameraReadyDeadlineSet: false,
        registrationEnabled: false,
        registrationDeadlineSet: false,
        hasCameraReadySubmissions: false,
        hasAttendees: false,
        eventDayEnabled: false,
        hasProgram: false,
    })
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const now = new Date()

            const [papersData, aggregatesData, activitiesData, tracksData, formConfig, membersData, ticketTypes] = await Promise.all([
                getPapersByConference(conferenceId).catch(() => []),
                getAggregatesByConference(conferenceId).catch(() => []),
                getConferenceActivities(conferenceId).catch(() => []),
                getTracksByConference(conferenceId).catch(() => []),
                getConferenceSubmissionForm(conferenceId).catch(() => null),
                getConferenceMembers(conferenceId, 0).catch(() => ({ totalElements: 0 })),
                getTicketTypes(conferenceId, false).catch(() => []),
            ])

            // Review questions & subject areas — check first track
            let hasReviewForm = false
            let hasSubjectAreas = false
            if (tracksData.length > 0) {
                const [questions, areas] = await Promise.all([
                    getReviewQuestionsByTrack(tracksData[0].id).catch(() => []),
                    getSubjectAreasByTrack(tracksData[0].id).catch(() => []),
                ])
                hasReviewForm = Array.isArray(questions) && questions.length > 0
                hasSubjectAreas = Array.isArray(areas) && areas.length > 0
            }

            // Submission form
            let hasSubmissionForm = false
            if (formConfig?.definitionJson) {
                try {
                    const parsed = JSON.parse(formConfig.definitionJson)
                    hasSubmissionForm = Array.isArray(parsed.fields) && parsed.fields.length > 0
                } catch { /**/ }
            }

            // Activity helpers
            const getActivity = (type: string) => activitiesData.find((a: ConferenceActivityDTO) => a.activityType === type)
            const isEnabled = (type: string) => getActivity(type)?.isEnabled === true
            const hasDeadline = (type: string) => !!getActivity(type)?.deadline
            const deadlinePassed = (type: string) => {
                const d = getActivity(type)?.deadline
                return d ? new Date(d) < now : false
            }

            // Paper helpers
            const aggregateMap = new Map(aggregatesData.map((a: any) => [a.paperId, a]))
            const merged: PaperSummary[] = papersData.map((p: any) => {
                const agg = aggregateMap.get(p.id) as any
                return {
                    id: p.id,
                    title: p.title,
                    status: p.status,
                    reviewCount: agg?.reviewCount || 0,
                    completedReviewCount: agg?.completedReviewCount || 0,
                    averageTotalScore: agg?.averageTotalScore || null,
                }
            })

            const hasPapers = papersData.filter((p: any) => p.status !== 'DRAFT').length > 0
            const reviewersAssigned = merged.some(p =>
                ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'REVISION', 'PUBLISHED'].includes(p.status)
            )
            const papersHaveDecisions = papersData.some((p: any) =>
                ['ACCEPTED', 'REJECTED', 'PUBLISHED'].includes(p.status)
            )

            // Camera-ready: papers with status PUBLISHED or specific camera-ready status
            const hasCameraReadySubmissions = papersData.some((p: any) =>
                p.status === 'PUBLISHED' || p.cameraReadyFileUrl
            )

            // Reviews completion check
            const totalAssigned = merged.reduce((s, p) => s + p.reviewCount, 0)
            const totalCompleted = merged.reduce((s, p) => s + p.completedReviewCount, 0)
            const allReviewsCompleted = totalAssigned > 0 && totalCompleted >= totalAssigned

            // Attendees check
            let hasAttendees = false
            try {
                const { getAttendees } = await import('@/app/api/registration.api')
                const attendees = await getAttendees(conferenceId)
                hasAttendees = Array.isArray(attendees) && attendees.length > 0
            } catch { hasAttendees = false }

            setPapers(merged)
            setActivities(activitiesData)
            setPhaseData({
                hasTracks: tracksData.length > 0,
                hasSubjectAreas,
                hasMembers: (membersData as any).totalElements > 1,
                hasTickets: Array.isArray(ticketTypes) && ticketTypes.length > 0,
                hasSubmissionForm,
                hasReviewForm,
                submissionEnabled: isEnabled('PAPER_SUBMISSION'),
                submissionDeadlineSet: hasDeadline('PAPER_SUBMISSION'),
                submissionDeadlinePassed: deadlinePassed('PAPER_SUBMISSION'),
                hasPapers,
                biddingEnabled: isEnabled('REVIEWER_BIDDING'),
                biddingDeadlineSet: hasDeadline('REVIEWER_BIDDING'),
                reviewersAssigned,
                reviewEnabled: isEnabled('REVIEW_SUBMISSION'),
                reviewDeadlineSet: hasDeadline('REVIEW_SUBMISSION'),
                allReviewsCompleted,
                discussionEnabled: isEnabled('REVIEW_DISCUSSION'),
                discussionDeadlineSet: hasDeadline('REVIEW_DISCUSSION'),
                papersHaveDecisions,
                authorNotificationEnabled: isEnabled('AUTHOR_NOTIFICATION'),
                cameraReadyEnabled: isEnabled('CAMERA_READY_SUBMISSION'),
                cameraReadyDeadlineSet: hasDeadline('CAMERA_READY_SUBMISSION'),
                registrationEnabled: isEnabled('REGISTRATION'),
                registrationDeadlineSet: hasDeadline('REGISTRATION'),
                hasCameraReadySubmissions,
                hasAttendees,
                eventDayEnabled: isEnabled('EVENT_DAY'),
                hasProgram: false, // TODO: fetch from program API when available
            })
        } catch (err) {
            console.error('Failed to load dashboard:', err)
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    useEffect(() => { fetchData() }, [fetchData])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Stats
    const totalPapers = papers.length
    const submitted = papers.filter(p => p.status !== 'DRAFT').length
    const underReview = papers.filter(p => p.status === 'UNDER_REVIEW').length
    const accepted = papers.filter(p => ['ACCEPTED', 'PUBLISHED'].includes(p.status)).length
    const rejected = papers.filter(p => p.status === 'REJECTED').length
    const hasDecision = accepted + rejected
    const pendingDecisionCount = submitted - hasDecision

    const papersWithReviewers = papers.filter(p => p.reviewCount > 0)
    const papersFullyReviewed = papers.filter(p => p.reviewCount > 0 && p.completedReviewCount >= p.reviewCount)
    const totalReviews = papers.reduce((s, p) => s + p.reviewCount, 0)
    const completedReviews = papers.reduce((s, p) => s + p.completedReviewCount, 0)
    const reviewProgress = totalReviews > 0 ? Math.round((completedReviews / totalReviews) * 100) : 0
    const assignmentProgress = submitted > 0 ? Math.round((papersWithReviewers.length / submitted) * 100) : 0

    const now = new Date()
    const sortedActivities = activities
        .filter(a => a.isEnabled)
        .sort((a, b) => {
            if (!a.deadline) return 1
            if (!b.deadline) return -1
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        })

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold">Dashboard</h2>
                <p className="text-sm text-muted-foreground mt-1">Conference progress overview at a glance</p>
            </div>

            {/* Phase Status Card with Checklist */}
            <PhaseStatusCard
                activities={activities}
                papers={papers}
                phaseData={phaseData}
                onNavigate={onNavigate}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-indigo-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{submitted}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Submitted Papers</p>
                            </div>
                            <FileText className="h-8 w-8 text-indigo-200" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{underReview}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Under Review</p>
                            </div>
                            <Eye className="h-8 w-8 text-amber-200" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{accepted}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Accepted</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-emerald-200" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-400">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{rejected}</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Rejected</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-200" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Progress Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-indigo-500" />
                            Assignment Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{papersWithReviewers.length} / {submitted} papers assigned</span>
                            <span className="font-semibold">{assignmentProgress}%</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${assignmentProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${assignmentProgress}%` }}
                            />
                        </div>
                        {submitted > 0 && papersWithReviewers.length < submitted && (
                            <p className="text-xs text-amber-600">
                                ⚠ {submitted - papersWithReviewers.length} paper(s) still need reviewer assignment
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-emerald-500" />
                            Review Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{completedReviews} / {totalReviews} reviews completed</span>
                            <span className="font-semibold">{reviewProgress}%</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${reviewProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${reviewProgress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{papersFullyReviewed.length} paper(s) fully reviewed</span>
                            {pendingDecisionCount > 0 && (
                                <span className="text-amber-600">{pendingDecisionCount} awaiting decision</span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Paper Status Breakdown */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Paper Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[
                            { label: 'Draft', count: papers.filter(p => p.status === 'DRAFT').length, color: 'bg-gray-400' },
                            { label: 'Submitted', count: papers.filter(p => p.status === 'SUBMITTED').length, color: 'bg-indigo-500' },
                            { label: 'Under Review', count: underReview, color: 'bg-amber-500' },
                            { label: 'Accepted', count: accepted, color: 'bg-emerald-500' },
                            { label: 'Rejected', count: rejected, color: 'bg-red-500' },
                            { label: 'Revision', count: papers.filter(p => p.status === 'REVISION').length, color: 'bg-orange-500' },
                            { label: 'Published', count: papers.filter(p => p.status === 'PUBLISHED').length, color: 'bg-teal-500' },
                        ].filter(s => s.count > 0).map(s => (
                            <div key={s.label} className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-24">{s.label}</span>
                                <div className="flex-1 h-5 rounded bg-gray-50 overflow-hidden relative">
                                    <div
                                        className={`h-full rounded ${s.color} transition-all`}
                                        style={{ width: `${totalPapers > 0 ? (s.count / totalPapers * 100) : 0}%` }}
                                    />
                                </div>
                                <span className="text-xs font-semibold w-8 text-right">{s.count}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Activity Timeline */}
            {sortedActivities.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-indigo-500" />
                            Activity Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {sortedActivities.map(a => {
                                const deadline = a.deadline ? new Date(a.deadline) : null
                                const isPast = deadline ? deadline.getTime() < now.getTime() : false
                                const diffDays = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
                                const isUrgent = diffDays !== null && diffDays <= 3 && !isPast

                                return (
                                    <div key={a.activityType} className="flex items-center justify-between py-2 border-b last:border-0">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isPast ? 'bg-gray-300' : isUrgent ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`} />
                                            <span className="text-sm font-medium">{ACTIVITY_LABELS[a.activityType] || a.name || a.activityType}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {deadline && (
                                                <span className="text-xs text-muted-foreground">
                                                    {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            )}
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] ${
                                                    isPast ? 'text-gray-500 border-gray-200' :
                                                    isUrgent ? 'text-red-700 border-red-200 bg-red-50' :
                                                    'text-indigo-700 border-indigo-200 bg-indigo-50'
                                                }`}
                                            >
                                                {isPast ? 'Closed' : diffDays !== null ? `${diffDays}d left` : 'No deadline'}
                                            </Badge>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
