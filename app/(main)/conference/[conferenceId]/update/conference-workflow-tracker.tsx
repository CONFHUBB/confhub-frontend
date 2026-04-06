"use client"

import { useEffect, useState, useCallback } from "react"
import { getTracksByConference } from "@/app/api/track.api"
import { getConferenceActivities } from "@/app/api/conference.api"
import { getConferenceSubmissionForm } from "@/app/api/submission-form.api"
import { getConferenceMembers } from "@/app/api/user.api"
import { getPapersByConference } from "@/app/api/paper.api"
import { getReviewQuestionsByTrack } from "@/app/api/review.api"
import type { ConferenceActivityDTO } from "@/types/conference"
import {
    CheckCircle2, Circle, ChevronDown, ChevronUp, Loader2,
    Settings, Users, FileText, Search, Award
} from "lucide-react"

// ── Types ──────────────────────────────────────────────
interface WorkflowStep {
    key: string
    label: string
    description: string
    tabKey: string
    done: boolean
}

interface WorkflowGroup {
    title: string
    icon: React.ReactNode
    accentColor: string
    steps: WorkflowStep[]
}

interface ConferenceWorkflowTrackerProps {
    conferenceId: number
    onNavigate: (tabKey: string) => void
    refreshKey?: number
}

// ── Component ──────────────────────────────────────────
export function ConferenceWorkflowTracker({
    conferenceId,
    onNavigate,
    refreshKey = 0,
}: ConferenceWorkflowTrackerProps) {
    const [groups, setGroups] = useState<WorkflowGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [collapsed, setCollapsed] = useState(false)

    const fetchWorkflowStatus = useCallback(async () => {
        try {
            setLoading(true)

            // Fetch all data in parallel
            const [
                tracks,
                activities,
                formConfig,
                membersData,
                papers,
            ] = await Promise.all([
                getTracksByConference(conferenceId).catch(() => []),
                getConferenceActivities(conferenceId).catch(() => [] as ConferenceActivityDTO[]),
                getConferenceSubmissionForm(conferenceId).catch(() => null),
                getConferenceMembers(conferenceId, 0).catch(() => ({ content: [], totalElements: 0 })),
                getPapersByConference(conferenceId).catch(() => []),
            ])

            // Check review questions - fetch for first track if exists
            let hasReviewQuestions = false
            if (tracks.length > 0) {
                try {
                    const questions = await getReviewQuestionsByTrack(tracks[0].id)
                    hasReviewQuestions = Array.isArray(questions) && questions.length > 0
                } catch { hasReviewQuestions = false }
            }

            // Check subject areas - we can infer from tracks having subject areas
            // Since getSubjectAreasByTrack requires a trackId, check via first track
            let hasSubjectAreas = false
            if (tracks.length > 0) {
                try {
                    const { getSubjectAreasByTrack } = await import("@/app/api/track.api")
                    const areas = await getSubjectAreasByTrack(tracks[0].id)
                    hasSubjectAreas = Array.isArray(areas) && areas.length > 0
                } catch { hasSubjectAreas = false }
            }

            // Activity status helpers
            const getActivity = (type: string) => activities.find((a: ConferenceActivityDTO) => a.activityType === type)
            const isEnabled = (type: string) => getActivity(type)?.isEnabled === true
            const hasDeadline = (type: string) => {
                const a = getActivity(type)
                return a?.deadline ? true : false
            }

            // Check form config
            const hasSubmissionForm = !!(formConfig && formConfig.definitionJson)

            // Check members (more than just the chair)
            const hasMembers = (membersData as { totalElements: number }).totalElements > 1

            // Check reviewer assignments
            const papersWithReviewers = papers.filter((p: any) => {
                // Papers that have reviewCount > 0 or status beyond SUBMITTED
                return p.status === 'UNDER_REVIEW' || p.status === 'ACCEPTED' || 
                       p.status === 'REJECTED' || p.status === 'PUBLISHED'
            })
            const hasReviewerAssignments = papersWithReviewers.length > 0

            // Build workflow groups
            const workflowGroups: WorkflowGroup[] = [
                {
                    title: "Conference Setup",
                    icon: <Settings className="h-4 w-4" />,
                    accentColor: "text-indigo-600",
                    steps: [
                        {
                            key: "edit-details",
                            label: "Edit Conference Details",
                            description: "Set name, dates, location, and description",
                            tabKey: "general-detail",
                            done: true, // Always done since conference exists
                        },
                        {
                            key: "manage-tracks",
                            label: "Manage Tracks",
                            description: "Add at least one track for paper submissions",
                            tabKey: "features-tracks",
                            done: tracks.length > 0,
                        },
                        {
                            key: "add-subject-areas",
                            label: "Add Subject Areas",
                            description: "Define topics for paper classification and reviewer matching",
                            tabKey: "features-subject-areas",
                            done: hasSubjectAreas,
                        },
                    ],
                },
                {
                    title: "Administer Users & Settings",
                    icon: <Users className="h-4 w-4" />,
                    accentColor: "text-sky-600",
                    steps: [
                        {
                            key: "add-members",
                            label: "Add Members & Roles",
                            description: "Add reviewers, co-chairs, and other members",
                            tabKey: "features-members",
                            done: hasMembers,
                        },
                        {
                            key: "config-review-form",
                            label: "Configure Review Form",
                            description: "Set up review questions and scoring criteria",
                            tabKey: "forms-review",
                            done: hasReviewQuestions,
                        },
                        {
                            key: "config-submission-form",
                            label: "Configure Submission Form",
                            description: "Customize fields for paper submission",
                            tabKey: "forms-submission",
                            done: hasSubmissionForm,
                        },
                    ],
                },
                {
                    title: "Enable Submission",
                    icon: <FileText className="h-4 w-4" />,
                    accentColor: "text-emerald-600",
                    steps: [
                        {
                            key: "set-timeline",
                            label: "Set Activity Timeline",
                            description: "Set deadline for Paper Submission activity",
                            tabKey: "features-activity-timeline",
                            done: hasDeadline("PAPER_SUBMISSION"),
                        },
                        {
                            key: "enable-submission",
                            label: "Enable Paper Submission",
                            description: "Open submissions so authors can submit papers",
                            tabKey: "features-activity-timeline",
                            done: isEnabled("PAPER_SUBMISSION"),
                        },
                    ],
                },
                {
                    title: "Review Process",
                    icon: <Search className="h-4 w-4" />,
                    accentColor: "text-amber-600",
                    steps: [
                        {
                            key: "assign-reviewers",
                            label: "Manage Reviewer Assignment",
                            description: "Assign reviewers to submitted papers",
                            tabKey: "features-review-management",
                            done: hasReviewerAssignments,
                        },
                        {
                            key: "enable-review",
                            label: "Enable Review",
                            description: "Open review activity so reviewers can submit reviews",
                            tabKey: "features-activity-timeline",
                            done: isEnabled("REVIEW_SUBMISSION"),
                        },
                    ],
                },
                {
                    title: "Final Phase",
                    icon: <Award className="h-4 w-4" />,
                    accentColor: "text-purple-600",
                    steps: [
                        {
                            key: "decisions",
                            label: "Make Decisions & Notify Authors",
                            description: "Send acceptance/rejection decisions to authors",
                            tabKey: "features-paper-management",
                            done: isEnabled("AUTHOR_NOTIFICATION"),
                        },
                        {
                            key: "camera-ready",
                            label: "Camera-Ready Submission",
                            description: "Accept final camera-ready paper versions",
                            tabKey: "features-camera-ready",
                            done: isEnabled("CAMERA_READY_SUBMISSION"),
                        },
                    ],
                },
            ]

            setGroups(workflowGroups)
        } catch (err) {
            console.error("Failed to load workflow status:", err)
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    useEffect(() => {
        fetchWorkflowStatus()
    }, [fetchWorkflowStatus, refreshKey])

    // Calculate progress
    const allSteps = groups.flatMap(g => g.steps)
    const completedSteps = allSteps.filter(s => s.done)
    const totalSteps = allSteps.length
    const progressPercent = totalSteps > 0 ? Math.round((completedSteps.length / totalSteps) * 100) : 0

    // Find current step (first not-done step)
    let currentStepKey: string | null = null
    for (const group of groups) {
        for (const step of group.steps) {
            if (!step.done) {
                currentStepKey = step.key
                break
            }
        }
        if (currentStepKey) break
    }

    if (loading) {
        return (
            <div className="rounded-xl border bg-card p-6 mb-6">
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                    <span className="text-sm text-muted-foreground">Loading workflow status...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-xl border bg-card mb-6 overflow-hidden">
            {/* Header with progress */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-muted/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold tracking-tight">
                            Conference Workflow
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {completedSteps.length}/{totalSteps} steps completed
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Mini progress badge */}
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${
                                    progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'
                                }`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className={`text-xs font-bold ${
                            progressPercent === 100 ? 'text-emerald-600' : 'text-muted-foreground'
                        }`}>
                            {progressPercent}%
                        </span>
                    </div>
                    {collapsed
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    }
                </div>
            </button>

            {/* Expanded content */}
            {!collapsed && (
                <div className="border-t px-4 sm:px-5 pb-5 pt-3">
                    {/* Progress bar (full width) */}
                    <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden mb-5">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                                progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    {/* Workflow groups */}
                    <div className="space-y-5">
                        {groups.map((group, groupIdx) => {
                            const groupDone = group.steps.every(s => s.done)
                            const groupStepsDone = group.steps.filter(s => s.done).length

                            return (
                                <div key={group.title}>
                                    {/* Group header */}
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <span className={group.accentColor}>{group.icon}</span>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            {group.title}
                                        </h4>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                            groupDone 
                                                ? 'bg-emerald-100 text-emerald-700' 
                                                : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {groupStepsDone}/{group.steps.length}
                                        </span>
                                    </div>

                                    {/* Steps */}
                                    <div className="relative ml-2">
                                        {/* Vertical connecting line */}
                                        <div className="absolute left-[9px] top-3 bottom-3 w-px bg-border" />

                                        <div className="space-y-0.5">
                                            {group.steps.map((step, stepIdx) => {
                                                const isCurrent = step.key === currentStepKey

                                                return (
                                                    <button
                                                        key={step.key}
                                                        onClick={() => onNavigate(step.tabKey)}
                                                        className={`
                                                            w-full flex items-start gap-3 pl-0 pr-3 py-2 rounded-lg text-left
                                                            transition-all duration-200 group
                                                            ${isCurrent 
                                                                ? 'bg-primary/5 hover:bg-primary/10' 
                                                                : 'hover:bg-muted/50'
                                                            }
                                                        `}
                                                    >
                                                        {/* Icon */}
                                                        <div className="relative z-10 mt-0.5 shrink-0">
                                                            {step.done ? (
                                                                <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />
                                                            ) : isCurrent ? (
                                                                <div className="h-[18px] w-[18px] rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center">
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                                </div>
                                                            ) : (
                                                                <Circle className="h-[18px] w-[18px] text-muted-foreground/40" />
                                                            )}
                                                        </div>

                                                        {/* Content */}
                                                        <div className="min-w-0 flex-1">
                                                            <p className={`text-sm leading-tight ${
                                                                step.done 
                                                                    ? 'font-semibold text-foreground' 
                                                                    : isCurrent
                                                                        ? 'font-semibold text-primary'
                                                                        : 'font-medium text-muted-foreground/60'
                                                            }`}>
                                                                {step.label}
                                                            </p>
                                                            <p className={`text-xs mt-0.5 leading-snug ${
                                                                step.done || isCurrent
                                                                    ? 'text-muted-foreground'
                                                                    : 'text-muted-foreground/40'
                                                            }`}>
                                                                {step.description}
                                                            </p>
                                                        </div>

                                                        {/* Done badge */}
                                                        {step.done && (
                                                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 shrink-0">
                                                                Done
                                                            </span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Separator between groups */}
                                    {groupIdx < groups.length - 1 && (
                                        <div className="border-b mt-4" />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
