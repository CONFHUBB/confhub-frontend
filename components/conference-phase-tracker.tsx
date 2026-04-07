'use client'

import { useEffect, useState, useCallback } from 'react'
import { getConferenceActivities } from '@/app/api/conference.api'
import type { ConferenceActivityDTO } from '@/types/conference'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Loader2, FileText, Search, Bell, Camera, Send, Users, MessageSquare, Ticket, CalendarDays } from 'lucide-react'
import Box from '@mui/material/Box'
import MUIStepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import { fmtDate } from '@/lib/utils'

interface PhaseStep {
    key: string
    label: string
    activityType: string
    done: boolean
    isActive: boolean
    deadline: string | null
}

interface ConferencePhaseTrackerProps {
    conferenceId: number
}

const ICONS_MAP: Record<string, React.ReactElement> = {
    'submission': <Send className="h-4 w-4" />,
    'bidding': <Users className="h-4 w-4" />,
    'review': <Search className="h-4 w-4" />,
    'discussion': <MessageSquare className="h-4 w-4" />,
    'notification': <Bell className="h-4 w-4" />,
    'camera-ready': <Camera className="h-4 w-4" />,
    'registration': <Ticket className="h-4 w-4" />,
    'event': <CalendarDays className="h-4 w-4" />,
}

function CustomPhaseIcon(props: any) {
    const { active, completed, className, icon } = props;
    // icon is passed as string from steps mapping
    const iconObj = ICONS_MAP[String(icon)];

    return (
        <div className={`
            flex items-center justify-center h-10 w-10 rounded-full border-2 transition-all duration-300
            ${completed
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : active
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-white border-muted-foreground/25 text-muted-foreground/40'
            } ${className || ''}
        `}>
            {completed
                ? <CheckCircle2 className="h-5 w-5" />
                : active
                    ? <div className="relative">{iconObj}<span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-white animate-pulse" /></div>
                    : <Circle className="h-5 w-5" />
            }
        </div>
    );
}

export function ConferencePhaseTracker({ conferenceId }: ConferencePhaseTrackerProps) {
    const [steps, setSteps] = useState<PhaseStep[]>([])
    const [loading, setLoading] = useState(true)
    const [collapsed, setCollapsed] = useState(false)

    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true)
            const activities = await getConferenceActivities(conferenceId).catch(() => [] as ConferenceActivityDTO[])

            const getActivity = (type: string) => activities.find(a => a.activityType === type)
            const isEnabled = (type: string) => getActivity(type)?.isEnabled === true
            const isOpenNow = (type: string) => {
                const a = getActivity(type)
                if (!a?.isEnabled) return false
                if (!a.deadline) return true
                return new Date(a.deadline) > new Date()
            }
            const getDeadline = (type: string) => getActivity(type)?.deadline || null
            const isPastDeadline = (type: string) => {
                const a = getActivity(type)
                return a?.deadline ? new Date(a.deadline) < new Date() : false
            }

            const PHASE_DEFS: { key: string, label: string, activityType: string }[] = [
                { key: 'submission',    label: 'Paper Submission',    activityType: 'PAPER_SUBMISSION' },
                { key: 'bidding',       label: 'Reviewer Bidding',    activityType: 'REVIEWER_BIDDING' },
                { key: 'review',        label: 'Review Submission',   activityType: 'REVIEW_SUBMISSION' },
                { key: 'discussion',    label: 'Review Discussion',   activityType: 'REVIEW_DISCUSSION' },
                { key: 'notification',  label: 'Author Notification', activityType: 'AUTHOR_NOTIFICATION' },
                { key: 'camera-ready',  label: 'Camera Ready',        activityType: 'CAMERA_READY_SUBMISSION' },
                { key: 'registration',  label: 'Registration',        activityType: 'REGISTRATION' },
                { key: 'event',         label: 'Conference Event',    activityType: 'EVENT_DAY' },
            ]

            const phases: PhaseStep[] = PHASE_DEFS.map(def => ({
                ...def,
                done: isEnabled(def.activityType) && isPastDeadline(def.activityType),
                isActive: isOpenNow(def.activityType),
                deadline: getDeadline(def.activityType),
            }))

            setSteps(phases)
        } catch {
            console.error('Failed to load conference phases')
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    useEffect(() => {
        if (conferenceId) fetchStatus()
    }, [conferenceId, fetchStatus])

    const completedSteps = steps.filter(s => s.done || s.isActive)
    const totalSteps = steps.length

    // Current active phase index
    let currentIdx = steps.findIndex(s => s.isActive)
    if (currentIdx === -1) currentIdx = steps.findIndex(s => !s.done)

    // ICONS_MAP used above.

    if (loading) {
        return (
            <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                    <span className="text-sm text-muted-foreground">Loading conference phases...</span>
                </div>
            </div>
        )
    }

    if (steps.length === 0) return null

    // Progress: done phases + active phase counts as partial
    const doneCount = steps.filter(s => s.done).length
    const activeCount = steps.filter(s => s.isActive && !s.done).length
    const progressPercent = totalSteps > 0
        ? Math.round(((doneCount + activeCount * 0.5) / totalSteps) * 100)
        : 0

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold tracking-tight">Conference Progress</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {steps.find(s => s.isActive)
                                ? `Currently: ${steps.find(s => s.isActive)!.label}`
                                : doneCount === totalSteps
                                    ? 'All phases completed'
                                    : 'Waiting for next phase'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className={`text-xs font-bold ${progressPercent === 100 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {progressPercent}%
                        </span>
                    </div>
                    {collapsed
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
                </div>
            </button>

            {/* Expanded timeline */}
            {!collapsed && (
                <div className="border-t px-4 pb-5 pt-4">
                    {/* Horizontal stepper for larger screens */}
                    <Box sx={{ width: '100%', display: { xs: 'none', sm: 'block' }, pt: 2, pb: 2 }}>
                        <MUIStepper activeStep={currentIdx} alternativeLabel>
                            {steps.map((step, idx) => {
                                const isPast = step.done
                                const isActive = step.isActive

                                return (
                                    <Step key={step.key} completed={isPast}>
                                        <StepLabel 
                                            StepIconComponent={CustomPhaseIcon}
                                            StepIconProps={{ icon: step.key } as any}
                                        >
                                            <div className="flex flex-col items-center">
                                                <p className={`text-xs font-semibold leading-tight ${isPast ? 'text-emerald-700' : isActive ? 'text-primary' : 'text-muted-foreground/50'}`}>
                                                    {step.label}
                                                </p>
                                                
                                                {/* Status badge */}
                                                {isActive && (
                                                    <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary animate-pulse">
                                                        In Progress
                                                    </span>
                                                )}
                                                {isPast && (
                                                    <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                        Completed
                                                    </span>
                                                )}

                                                {/* Deadline */}
                                                {step.deadline && (
                                                    <p className={`text-[10px] mt-1 ${isPast ? 'text-emerald-600/60' : isActive ? 'text-primary' : 'text-muted-foreground/40'}`}>
                                                        {fmtDate(step.deadline)}
                                                    </p>
                                                )}
                                            </div>
                                        </StepLabel>
                                    </Step>
                                )
                            })}
                        </MUIStepper>
                    </Box>

                    {/* Vertical layout for mobile */}
                    <div className="sm:hidden space-y-1">
                        <div className="relative ml-2">
                            <div className="absolute left-[9px] top-3 bottom-3 w-px bg-border" />
                            {steps.map((step, idx) => {
                                const isPast = step.done
                                return (
                                    <div key={step.key} className="flex items-start gap-3 py-2 relative">
                                        <div className="relative z-10 mt-0.5 shrink-0">
                                            {isPast ? (
                                                <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />
                                            ) : step.isActive ? (
                                                <div className="h-[18px] w-[18px] rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                </div>
                                            ) : (
                                                <Circle className="h-[18px] w-[18px] text-muted-foreground/40" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-sm leading-tight ${isPast ? 'font-semibold text-emerald-700' : step.isActive ? 'font-semibold text-primary' : 'text-muted-foreground/50'}`}>
                                                {step.label}
                                            </p>
                                            {step.deadline && (
                                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                                    Deadline: {fmtDate(step.deadline)}
                                                </p>
                                            )}
                                        </div>
                                        {step.isActive && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">Active</span>}
                                        {isPast && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">Done</span>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
