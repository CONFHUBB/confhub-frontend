'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Loader2, FileText, Users, BarChart3, CheckCircle2,
    Clock, AlertTriangle, Eye, UserCheck, ChevronRight,
    Settings, Send, Search, Award, Calendar, Zap, XCircle,
    ArrowRight, ChevronDown, ChevronUp
} from 'lucide-react'
import { getPapersByConference } from '@/app/api/paper.api'
import { getAggregatesByConference } from '@/app/api/review-aggregate.api'
import { getConferenceActivities } from '@/app/api/conference.api'
import { getTracksByConference, getSubjectAreasByTrack } from '@/app/api/track.api'
import { getConferenceSubmissionForm } from '@/app/api/submission-form.api'
import { getConferenceMembers } from '@/app/api/user.api'
import { getReviewQuestionsByTrack } from '@/app/api/review.api'
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
    hasSubmissionForm: boolean
    hasReviewForm: boolean
    submissionEnabled: boolean
    submissionDeadlineSet: boolean
    submissionDeadlinePassed: boolean
    hasPapers: boolean
    reviewersAssigned: boolean
    reviewEnabled: boolean
    reviewDeadlineSet: boolean
    papersHaveDecisions: boolean
    authorNotificationEnabled: boolean
    cameraReadyEnabled: boolean
    cameraReadyDeadlineSet: boolean
    hasCameraReadySubmissions: boolean
    hasProgram: boolean
}

const ACTIVITY_LABELS: Record<string, string> = {
    PAPER_SUBMISSION: 'Paper Submission',
    REVIEWER_BIDDING: 'Reviewer Bidding',
    REVIEW_SUBMISSION: 'Review Submission',
    REVIEW_DISCUSSION: 'Review Discussion',
    AUTHOR_NOTIFICATION: 'Author Notification',
    CAMERA_READY_SUBMISSION: 'Camera-Ready Submission',
}

// ─── Phase definitions ────────────────────────────────────────────────────────
const PHASES = [
    {
        id: 'setup',
        label: 'Setup',
        icon: Settings,
        color: 'indigo',
        activityKeys: [] as string[],
        actions: [
            { label: 'Conference Details', tab: 'general-detail' },
            { label: 'Manage Tracks', tab: 'features-tracks' },
            { label: 'Members & Roles', tab: 'features-members' },
            { label: 'Ticket Types', tab: 'reg-ticket-types' },
        ],
        nextPhaseTab: 'features-activity-timeline',
        nextPhaseHint: 'Go to Activity Timeline and enable Paper Submission to start the Submission phase.',
    },
    {
        id: 'submission',
        label: 'Submission',
        icon: Send,
        color: 'sky',
        activityKeys: ['PAPER_SUBMISSION', 'REVIEWER_BIDDING'],
        actions: [
            { label: 'Activity Timeline', tab: 'features-activity-timeline' },
            { label: 'Paper Management', tab: 'features-paper-management' },
        ],
        nextPhaseTab: 'features-activity-timeline',
        nextPhaseHint: 'Enable Review Submission activity to begin the Review phase.',
    },
    {
        id: 'review',
        label: 'Review',
        icon: Search,
        color: 'amber',
        activityKeys: ['REVIEW_SUBMISSION', 'REVIEW_DISCUSSION'],
        actions: [
            { label: 'Review Management', tab: 'features-review-management' },
            { label: 'Activity Timeline', tab: 'features-activity-timeline' },
        ],
        nextPhaseTab: 'features-paper-management',
        nextPhaseHint: 'Make accept/reject decisions on papers and enable Author Notification.',
    },
    {
        id: 'decision',
        label: 'Decision',
        icon: Award,
        color: 'purple',
        activityKeys: ['AUTHOR_NOTIFICATION'],
        actions: [
            { label: 'Paper Management', tab: 'features-paper-management' },
            { label: 'Send Notifications', tab: 'forms-mail' },
            { label: 'Camera-Ready', tab: 'features-camera-ready' },
        ],
        nextPhaseTab: 'features-program-builder',
        nextPhaseHint: 'Enable Camera-Ready submissions and build the event program.',
    },
    {
        id: 'execution',
        label: 'Execution',
        icon: Calendar,
        color: 'emerald',
        activityKeys: ['CAMERA_READY_SUBMISSION'],
        actions: [
            { label: 'Program Builder', tab: 'features-program-builder' },
            { label: 'Attendees', tab: 'reg-attendees' },
            { label: 'Check-in', tab: 'reg-checkin' },
        ],
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
        case 'review':
            return [
                { label: 'Reviewers assigned to papers', met: pd.reviewersAssigned, tab: 'features-review-management', blocking: true },
                { label: 'Review Submission activity enabled', met: pd.reviewEnabled, tab: 'features-activity-timeline', blocking: true },
                { label: 'Review deadline set', met: pd.reviewDeadlineSet, tab: 'features-activity-timeline', blocking: true },
            ]
        case 'decision':
            return [
                { label: 'Decisions made on papers (Accept/Reject)', met: pd.papersHaveDecisions, tab: 'features-paper-management', blocking: true },
                { label: 'Author Notification activity enabled', met: pd.authorNotificationEnabled, tab: 'features-activity-timeline', blocking: true },
                { label: 'Camera-Ready Submission enabled', met: pd.cameraReadyEnabled, tab: 'features-camera-ready', blocking: true },
                { label: 'Camera-Ready deadline set', met: pd.cameraReadyDeadlineSet, tab: 'features-activity-timeline', blocking: false },
            ]
        case 'execution':
            return [
                { label: 'Camera-Ready submissions received', met: pd.hasCameraReadySubmissions, tab: 'features-camera-ready', blocking: false },
                { label: 'Program / sessions built', met: pd.hasProgram, tab: 'features-program-builder', blocking: false },
            ]
        default:
            return []
    }
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; light: string; dot: string; btn: string }> = {
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-700', border: 'border-indigo-300', light: 'bg-indigo-50', dot: 'bg-indigo-500', btn: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
    sky:    { bg: 'bg-sky-500',    text: 'text-sky-700',    border: 'border-sky-300',    light: 'bg-sky-50',    dot: 'bg-sky-500',    btn: 'bg-sky-500 hover:bg-sky-600 text-white' },
    amber:  { bg: 'bg-amber-500',  text: 'text-amber-700',  border: 'border-amber-300',  light: 'bg-amber-50',  dot: 'bg-amber-500',  btn: 'bg-amber-500 hover:bg-amber-600 text-white' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-700', border: 'border-purple-300', light: 'bg-purple-50', dot: 'bg-purple-500', btn: 'bg-purple-600 hover:bg-purple-700 text-white' },
    emerald:{ bg: 'bg-emerald-600',text: 'text-emerald-700',border: 'border-emerald-300',light: 'bg-emerald-50',dot: 'bg-emerald-500',btn: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
}

function detectActivePhaseIndex(activities: ConferenceActivityDTO[]): number {
    const enabled = new Set(activities.filter(a => a.isEnabled).map(a => a.activityType))
    for (let i = PHASES.length - 1; i >= 1; i--) {
        if (PHASES[i].activityKeys.some(k => enabled.has(k))) return i
    }
    return 0
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
                    <div className="flex flex-wrap gap-2 shrink-0">
                        {activePhase.actions.map(action => (
                            <Button key={action.tab} variant="outline" size="sm"
                                className={`text-xs rounded-lg border ${c.border} ${c.text} bg-white font-semibold`}
                                onClick={() => onNavigate?.(action.tab)}>
                                {action.label}
                                <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                        ))}
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
                            <button
                                key={i}
                                onClick={() => onNavigate?.(item.tab)}
                                className="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
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
                                <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-gray-500 shrink-0" />
                            </button>
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
                                            ⚠ Complete required items to unlock next phase:
                                        </p>
                                        <ul className="text-xs text-gray-500 space-y-1 pl-2">
                                            {unmetBlocking.map((item, i) => (
                                                <li key={i} className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                                    {item.label}
                                                </li>
                                            ))}
                                        </ul>
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
        hasSubmissionForm: false,
        hasReviewForm: false,
        submissionEnabled: false,
        submissionDeadlineSet: false,
        submissionDeadlinePassed: false,
        hasPapers: false,
        reviewersAssigned: false,
        reviewEnabled: false,
        reviewDeadlineSet: false,
        papersHaveDecisions: false,
        authorNotificationEnabled: false,
        cameraReadyEnabled: false,
        cameraReadyDeadlineSet: false,
        hasCameraReadySubmissions: false,
        hasProgram: false,
    })
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const now = new Date()

            const [papersData, aggregatesData, activitiesData, tracksData, formConfig, membersData] = await Promise.all([
                getPapersByConference(conferenceId).catch(() => []),
                getAggregatesByConference(conferenceId).catch(() => []),
                getConferenceActivities(conferenceId).catch(() => []),
                getTracksByConference(conferenceId).catch(() => []),
                getConferenceSubmissionForm(conferenceId).catch(() => null),
                getConferenceMembers(conferenceId, 0).catch(() => ({ totalElements: 0 })),
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

            setPapers(merged)
            setActivities(activitiesData)
            setPhaseData({
                hasTracks: tracksData.length > 0,
                hasSubjectAreas,
                hasMembers: (membersData as any).totalElements > 1,
                hasSubmissionForm,
                hasReviewForm,
                submissionEnabled: isEnabled('PAPER_SUBMISSION'),
                submissionDeadlineSet: hasDeadline('PAPER_SUBMISSION'),
                submissionDeadlinePassed: deadlinePassed('PAPER_SUBMISSION'),
                hasPapers,
                reviewersAssigned,
                reviewEnabled: isEnabled('REVIEW_SUBMISSION'),
                reviewDeadlineSet: hasDeadline('REVIEW_SUBMISSION'),
                papersHaveDecisions,
                authorNotificationEnabled: isEnabled('AUTHOR_NOTIFICATION'),
                cameraReadyEnabled: isEnabled('CAMERA_READY_SUBMISSION'),
                cameraReadyDeadlineSet: hasDeadline('CAMERA_READY_SUBMISSION'),
                hasCameraReadySubmissions,
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
