'use client'

import { useEffect, useState } from 'react'
import { getConferenceActivities } from '@/app/api/conference.api'
import type { ConferenceActivityDTO } from '@/types/conference'
import {
    Send, Search, MessageSquare, Award, FileText, Ticket,
    PartyPopper, CheckCircle2, Clock, Zap
} from 'lucide-react'

// ── Author-relevant phases ──
const AUTHOR_PHASES = [
    { id: 'submission',   label: 'Submission',   icon: Send,           color: 'sky',     activityKey: 'PAPER_SUBMISSION' },
    { id: 'review',       label: 'Under Review', icon: Search,         color: 'amber',   activityKey: 'REVIEW_SUBMISSION' },
    { id: 'discussion',   label: 'Discussion',   icon: MessageSquare,  color: 'orange',  activityKey: 'REVIEW_DISCUSSION' },
    { id: 'decision',     label: 'Decision',     icon: Award,          color: 'purple',  activityKey: 'AUTHOR_NOTIFICATION' },
    { id: 'camera-ready', label: 'Camera-Ready', icon: FileText,       color: 'cyan',    activityKey: 'CAMERA_READY_SUBMISSION' },
    { id: 'registration', label: 'Registration', icon: Ticket,         color: 'rose',    activityKey: 'REGISTRATION' },
    { id: 'event',        label: 'Event Day',    icon: PartyPopper,    color: 'emerald', activityKey: 'EVENT_DAY' },
]

const COLOR_MAP: Record<string, { bg: string; text: string; light: string }> = {
    sky:     { bg: 'bg-sky-500',     text: 'text-sky-700',     light: 'bg-sky-50' },
    amber:   { bg: 'bg-amber-500',   text: 'text-amber-700',   light: 'bg-amber-50' },
    orange:  { bg: 'bg-orange-500',  text: 'text-orange-700',  light: 'bg-orange-50' },
    purple:  { bg: 'bg-purple-600',  text: 'text-purple-700',  light: 'bg-purple-50' },
    cyan:    { bg: 'bg-cyan-500',    text: 'text-cyan-700',    light: 'bg-cyan-50' },
    rose:    { bg: 'bg-rose-500',    text: 'text-rose-700',    light: 'bg-rose-50' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', light: 'bg-emerald-50' },
}

const ACTIVITY_LABELS: Record<string, string> = {
    PAPER_SUBMISSION: 'Paper Submission',
    REVIEWER_BIDDING: 'Reviewer Bidding',
    REVIEW_SUBMISSION: 'Review Submission',
    REVIEW_DISCUSSION: 'Discussion',
    AUTHOR_NOTIFICATION: 'Author Notification',
    CAMERA_READY_SUBMISSION: 'Camera-Ready',
    REGISTRATION: 'Registration',
    EVENT_DAY: 'Event Day',
}

function detectActivePhaseIndex(activities: ConferenceActivityDTO[]): number {
    const enabled = new Set(activities.filter(a => a.isEnabled).map(a => a.activityType))
    // Scan from last phase backward
    for (let i = AUTHOR_PHASES.length - 1; i >= 0; i--) {
        if (enabled.has(AUTHOR_PHASES[i].activityKey)) return i
    }
    return 0
}

interface AuthorPhaseTrackerProps {
    conferenceId: number
}

export function AuthorPhaseTracker({ conferenceId }: AuthorPhaseTrackerProps) {
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getConferenceActivities(conferenceId)
            .then(setActivities)
            .catch(() => setActivities([]))
            .finally(() => setLoading(false))
    }, [conferenceId])

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 animate-pulse">
                <div className="h-10 bg-gray-100 rounded-lg" />
            </div>
        )
    }

    const now = new Date()
    const activePhaseIdx = detectActivePhaseIndex(activities)
    const activePhase = AUTHOR_PHASES[activePhaseIdx]
    const c = COLOR_MAP[activePhase.color]

    // Nearest upcoming deadline
    const upcoming = activities
        .filter(a => a.isEnabled && a.deadline)
        .map(a => ({ ...a, d: new Date(a.deadline!) }))
        .filter(a => a.d > now)
        .sort((a, b) => a.d.getTime() - b.d.getTime())[0]

    const daysLeft = upcoming ? Math.ceil((upcoming.d.getTime() - now.getTime()) / 86400000) : null
    const isUrgent = daysLeft !== null && daysLeft <= 5

    return (
        <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-white px-6 pt-5 pb-0">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Conference Progress</span>
                    </div>
                    {upcoming && (
                        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${isUrgent ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                            <Clock className="w-3 h-3" />
                            {ACTIVITY_LABELS[upcoming.activityType] || upcoming.activityType}: {daysLeft}d left
                            {isUrgent && ' ⚠'}
                        </div>
                    )}
                </div>

                {/* Stepper — pixel-perfect match with Chair dashboard */}
                <div className="flex items-stretch">
                    {AUTHOR_PHASES.map((phase, idx) => {
                        const Icon = phase.icon
                        const isCurrent = idx === activePhaseIdx
                        const isDone = idx < activePhaseIdx
                        const pc = COLOR_MAP[phase.color]
                        return (
                            <div key={phase.id} className="flex-1 flex flex-col items-center relative">
                                {idx > 0 && (
                                    <div className={`absolute top-5 right-1/2 left-0 h-0.5 ${isDone || isCurrent ? 'bg-indigo-400' : 'bg-gray-200'}`} />
                                )}
                                {idx < AUTHOR_PHASES.length - 1 && (
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

            {/* Current phase info */}
            <div className={`${c.light} px-6 py-3`}>
                <p className={`text-sm font-bold ${c.text}`}>
                    Current Phase: {activePhase.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                    {getPhaseDescription(activePhase.id)}
                </p>
            </div>
        </div>
    )
}

function getPhaseDescription(phaseId: string): string {
    switch (phaseId) {
        case 'submission':   return 'The conference is accepting paper submissions.'
        case 'review':       return 'Your papers are being reviewed by the program committee.'
        case 'discussion':   return 'Reviewers are discussing and deliberating on papers.'
        case 'decision':     return 'Accept/Reject decisions have been made. Check your notification emails.'
        case 'camera-ready': return 'Upload your final camera-ready manuscripts.'
        case 'registration': return 'Register for the conference and complete payment.'
        case 'event':        return 'The conference event is live. Check the program schedule.'
        default:             return ''
    }
}
