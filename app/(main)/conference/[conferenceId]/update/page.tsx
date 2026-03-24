'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getConference, getConferenceActivities } from '@/app/api/conference.api'
import type { ConferenceResponse, ConferenceActivityDTO } from '@/types/conference'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Settings, FileText, Calendar, ClipboardList, Lock, ChevronRight, ChevronDown,
    ArrowLeft, Shield, Users, LayoutDashboard, Loader2, CheckCircle2, Circle,
    Search, Award, Eye
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { FormBuilder } from '../submission-form/form-builder'
import { saveConferenceSubmissionForm, getConferenceSubmissionForm } from '@/app/api/submission-form.api'
import { getTracksByConference, getSubjectAreasByTrack, getTrackReviewSettings } from '@/app/api/track.api'
import { getConferenceMembers } from '@/app/api/user.api'
import { getPapersByConference } from '@/app/api/paper.api'
import { getReviewQuestionsByTrack } from '@/app/api/review.api'

import { AddTrack } from './add-track'
import { SubjectAreaManager } from './subject-area-manager'
import { AssignRole } from './assign-role'
import { ConferenceTemplate } from './conference-template'
import { ReviewSettings } from './review-settings'
import { ConfigMembers } from './config-members'
import { TrackList } from './track-list'
import { ReviewQuestionsList } from './review-questions-list'
import { ActivityTimeline } from './activity-timeline'
import { EmailManagementInline } from './email-management'
import { PaperManagement } from './paper-management'
import { ReviewManagement } from './review-management'
import { ReviewSettings as ReviewSettingsComponent } from './review-settings'
import { ConflictManagement } from './conflict-management'
import { CameraReadyManagement } from './camera-ready-management'
import { ChairDashboard } from './chair-dashboard'

import { AuthorNotificationWizard } from './author-notification-wizard'

import { createTrack } from '@/app/api/conference.api'
import { assignRole } from '@/app/api/user.api'
import { createTemplate } from '@/app/api/template.api'
import { updateConference } from '@/app/api/conference.api'
import { ConferenceForm } from '../../create/conference-form'
import type { ConferenceData } from '@/types/conference-form'

import type { DynamicField, FormDefinition } from '@/types/submission-form'
import type {
    TrackData,
    SubjectAreaData,
    RoleAssignmentData,
    TemplateData,
} from "@/types/conference-form"

type SettingsTab =
    | 'dashboard'
    | 'general-detail'
    | 'features-tracks'
    | 'features-subject-areas'
    | 'features-members'
    | 'features-paper-management'
    | 'features-review-settings'
    | 'features-conflict-settings'
    | 'features-review-management'
    | 'features-camera-ready'
    | 'forms-mail'
    | 'forms-submission'
    | 'forms-review'
    | 'features-activity-timeline'

// Workflow status type
type WorkflowStatus = Record<string, boolean>

const TAB_GROUPS = [
    {
        title: "Overview",
        icon: <LayoutDashboard className="h-4 w-4" />,
        accentColor: "text-primary",
        items: [
            { key: "dashboard", label: "Dashboard", completionKey: "", lockWhenDone: false }
        ]
    },
    {
        title: "Conference Setup",
        icon: <Settings className="h-4 w-4" />,
        accentColor: "text-indigo-600",
        items: [
            { key: "general-detail", label: "Conference Detail", completionKey: "edit-details", lockWhenDone: true },
            { key: "features-tracks", label: "Tracks", completionKey: "manage-tracks", lockWhenDone: true },
            { key: "features-subject-areas", label: "Subject Areas", completionKey: "add-subject-areas", lockWhenDone: true },
        ]
    },
    {
        title: "Administer Users",
        icon: <Users className="h-4 w-4" />,
        accentColor: "text-sky-600",
        items: [
            { key: "features-members", label: "Members & Roles", completionKey: "add-members", lockWhenDone: false },
        ]
    },
    {
        title: "Review Settings",
        icon: <Shield className="h-4 w-4" />,
        accentColor: "text-orange-600",
        items: [
            { key: "features-review-settings", label: "Review Config", completionKey: "config-review-settings", lockWhenDone: false },
            { key: "features-conflict-settings", label: "Conflict Config", completionKey: "config-conflict-settings", lockWhenDone: false },
        ]
    },
    {
        title: "Configure Forms",
        icon: <ClipboardList className="h-4 w-4" />,
        accentColor: "text-teal-600",
        items: [
            { key: "forms-submission", label: "Submission Form", completionKey: "config-submission-form", lockWhenDone: true },
            { key: "forms-review", label: "Review Form", completionKey: "config-review-form", lockWhenDone: true },
            { key: "forms-mail", label: "Email Templates", completionKey: "", lockWhenDone: false },
        ]
    },
    {
        title: "Enable Submission",
        icon: <FileText className="h-4 w-4" />,
        accentColor: "text-emerald-600",
        items: [
            { key: "features-activity-timeline", label: "Activity Timeline", completionKey: "set-timeline", lockWhenDone: false },
            { key: "features-paper-management", label: "Paper Management", completionKey: "", lockWhenDone: false },
        ]
    },
    {
        title: "Review Process",
        icon: <Search className="h-4 w-4" />,
        accentColor: "text-amber-600",
        items: [
            { key: "features-review-management", label: "Review Management", completionKey: "assign-reviewers", lockWhenDone: false },
        ]
    },
    {
        title: "Final Phase",
        icon: <Award className="h-4 w-4" />,
        accentColor: "text-purple-600",
        items: [
            { key: "features-camera-ready", label: "Camera-Ready", completionKey: "camera-ready", lockWhenDone: false },
        ]
    }
]

export default function ConferenceUpdatePage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<SettingsTab>('dashboard')
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['Overview', 'Conference Setup', 'Administer Users', 'Review Settings', 'Configure Forms', 'Enable Submission', 'Review Process', 'Final Phase'])
    const [isUpdatingGeneral, setIsUpdatingGeneral] = useState(false)

    // Form Builder state
    const [savedFields, setSavedFields] = useState<DynamicField[]>([])
    const [isSavingForm, setIsSavingForm] = useState(false)
    const [trackRefreshKey, setTrackRefreshKey] = useState(0)
    const [workflowRefreshKey, setWorkflowRefreshKey] = useState(0)
    const refreshWorkflow = () => setWorkflowRefreshKey(k => k + 1)

    // Workflow completion status
    const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({})

    // Build a flat ordered list of all step keys (excluding Overview/Dashboard)
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

    // Determine which steps are unlocked (all previous steps must be complete)
    const stepAccessMap = useMemo(() => {
        const map: Record<string, 'locked' | 'active' | 'completed'> = {}
        for (let i = 0; i < allOrderedSteps.length; i++) {
            const step = allOrderedSteps[i]
            const isDone = !!workflowStatus[step.completionKey]
            // Check if all previous steps are complete
            const allPreviousDone = allOrderedSteps.slice(0, i).every(s => !!workflowStatus[s.completionKey])
            if (isDone) {
                map[step.key] = 'completed'
            } else if (allPreviousDone) {
                map[step.key] = 'active' // unlocked, ready to configure
            } else {
                map[step.key] = 'locked'
            }
        }
        return map
    }, [allOrderedSteps, workflowStatus])

    const fetchWorkflowStatus = useCallback(async () => {
        try {
            const [tracks, activities, formConfig, membersData, papers] = await Promise.all([
                getTracksByConference(conferenceId).catch(() => []),
                getConferenceActivities(conferenceId).catch(() => [] as ConferenceActivityDTO[]),
                getConferenceSubmissionForm(conferenceId).catch(() => null),
                getConferenceMembers(conferenceId, 0).catch(() => ({ totalElements: 0 })),
                getPapersByConference(conferenceId).catch(() => []),
            ])

            let hasReviewQuestions = false
            let hasSubjectAreas = false
            let hasReviewSettings = false
            let hasConflictSettings = false
            if (tracks.length > 0) {
                const [questions, areas, reviewSettings] = await Promise.all([
                    getReviewQuestionsByTrack(tracks[0].id).catch(() => []),
                    getSubjectAreasByTrack(tracks[0].id).catch(() => []),
                    getTrackReviewSettings(tracks[0].id).catch(() => null),
                ])
                hasReviewQuestions = Array.isArray(questions) && questions.length > 0
                hasSubjectAreas = Array.isArray(areas) && areas.length > 0
                if (reviewSettings) {
                    const s = reviewSettings as any
                    // Review settings: consider configured if user changed any review-related value from default
                    hasReviewSettings = !!(
                        s.isDoubleBlind ||
                        s.allowReviewerQuota ||
                        s.allowOthersReviewAccessAfterSubmit ||
                        s.allowReviewUpdateDuringDiscussion ||
                        s.showReviewerIdentityToOtherReviewer ||
                        s.showAggregateColumns ||
                        s.allowReviewerSeeStatusBeforeNotification ||
                        s.enableAllPapersForDiscussion ||
                        s.allowDiscussNonAssignedPapers ||
                        s.allowAuthorDiscuss ||
                        s.doNotShowWithdrawnPapers ||
                        (s.reviewerInstructions && s.reviewerInstructions.trim() !== '') ||
                        (s.reviewerInviteExpirationDays !== null && s.reviewerInviteExpirationDays !== 7)
                    )
                    // Conflict settings: backend defaults are enableDomainConflict=true, allowAuthorConfigureConflict=false
                    // Only mark as configured if user changed from defaults
                    hasConflictSettings = (
                        s.enableDomainConflict === false ||
                        s.allowAuthorConfigureConflict === true
                    )
                }
            }

            const getActivity = (type: string) => activities.find((a: ConferenceActivityDTO) => a.activityType === type)
            const isEnabled = (type: string) => getActivity(type)?.isEnabled === true
            const hasDeadline = (type: string) => !!getActivity(type)?.deadline

            let hasSubmissionForm = false
            if (formConfig && formConfig.definitionJson) {
                try {
                    const parsed = JSON.parse(formConfig.definitionJson)
                    hasSubmissionForm = parsed.fields && parsed.fields.length > 0
                } catch { hasSubmissionForm = false }
            }

            const hasMembers = (membersData as any).totalElements > 1
            const hasReviewerAssignments = papers.some((p: any) =>
                ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'REVISION', 'PUBLISHED'].includes(p.status)
            )

            setWorkflowStatus({
                'edit-details': true,
                'manage-tracks': tracks.length > 0,
                'add-subject-areas': hasSubjectAreas,
                'add-members': hasMembers,
                'config-review-settings': hasReviewSettings,
                'config-conflict-settings': hasConflictSettings,
                'config-review-form': hasReviewQuestions,
                'config-submission-form': hasSubmissionForm,
                'set-timeline': hasDeadline('PAPER_SUBMISSION'),
                'enable-submission': isEnabled('PAPER_SUBMISSION'),
                'assign-reviewers': hasReviewerAssignments,
                'enable-review': isEnabled('REVIEW_SUBMISSION'),
                'decisions': isEnabled('AUTHOR_NOTIFICATION'),
                'camera-ready': isEnabled('CAMERA_READY_SUBMISSION'),
            })
        } catch (err) {
            console.error('Failed to fetch workflow status:', err)
        }
    }, [conferenceId])

    useEffect(() => {
        fetchWorkflowStatus()
    }, [fetchWorkflowStatus, workflowRefreshKey])

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const [conferenceData, formConfig] = await Promise.all([
                    getConference(conferenceId),
                    getConferenceSubmissionForm(conferenceId).catch(() => null)
                ])
                setConference(conferenceData)

                if (formConfig && formConfig.definitionJson) {
                    try {
                        const parsed = JSON.parse(formConfig.definitionJson) as FormDefinition
                        if (parsed.fields) {
                            setSavedFields(parsed.fields)
                        }
                    } catch (e) {
                        console.error("Failed to parse form definition", e)
                    }
                }
            } catch (err: any) {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    setError('You must be logged in to manage this conference.')
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
    }, [conferenceId, router])

    const handleSaveFormConfig = async (definitionJson: string) => {
        try {
            setIsSavingForm(true)
            await saveConferenceSubmissionForm({
                conferenceId,
                definitionJson
            })
            toast.success("Submission form configuration saved successfully!")
            refreshWorkflow()
        } catch (err) {
            console.error("Failed to save form config:", err)
            toast.error("Failed to save form configuration. Please try again.")
        } finally {
            setIsSavingForm(false)
        }
    }

    const handleSaveTrack = async (data: TrackData) => {
        try {
            await createTrack({
                name: data.name,
                description: data.description,
                conferenceId,
            })
            toast.success("Track saved successfully!")
            setTrackRefreshKey((k) => k + 1)
            refreshWorkflow()
        } catch (err) {
            toast.error("Failed to save track")
        }
    }

    const handleSaveRoles = async (assignments: RoleAssignmentData[]) => {
        try {
            const internalRoles = assignments.filter((a) => !a.isExternal && a.userId && a.role)
            if (internalRoles.length > 0) {
                await Promise.all(
                    internalRoles.map((a) =>
                        assignRole({
                            userId: Number(a.userId),
                            conferenceId,
                            trackId: 0, // Should be selected from UI in future
                            assignedRole: a.role,
                        }).catch(() => null)
                    )
                )
                toast.success("Roles assigned!")
            } else {
                toast.success("External roles invites prepared!")
            }
        } catch (err) {
            toast.error("Failed to assign roles")
        }
    }

    const handleSaveTemplates = async (templateData: TemplateData[]) => {
        try {
            const validTemplates = templateData.filter((t) => t.templateType && t.subject && t.body)
            if (validTemplates.length > 0) {
                await Promise.all(
                    validTemplates.map((t) =>
                        createTemplate({
                            conferenceId,
                            templateType: t.templateType,
                            subject: t.subject,
                            body: t.body,
                            isDefault: t.isDefault,
                        })
                    )
                )
                toast.success("Templates saved!")
            }
        } catch (err) {
            toast.error("Failed to save templates")
        }
    }

    const handleUpdateConference = async (data: ConferenceData) => {
        setIsUpdatingGeneral(true)
        try {
            const updated = await updateConference(conferenceId, {
                ...data,
                id: conferenceId,
                startDate: data.startDate ? new Date(data.startDate).toISOString() : "",
                endDate: data.endDate ? new Date(data.endDate).toISOString() : "",
                societySponsor: data.societySponsor.join(", "),
            })
            setConference(updated)
            toast.success("Conference details updated successfully!")
            refreshWorkflow()
        } catch (err) {
            console.error("Failed to update conference:", err)
            toast.error("Failed to update conference details. Please try again.")
        } finally {
            setIsUpdatingGeneral(false)
        }
    }

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
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        )
    }

    if (!conference) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-muted-foreground text-lg">Conference not found</p>
                <Link href={`/conference/${conferenceId}`}>
                    <Button>Back to Conference</Button>
                </Link>
            </div>
        )
    }

    const renderTabContent = () => {
        if (!conference) return null

        switch (activeTab) {
            case 'general-detail':
                const safeDefaults = {
                    name: conference.name || "",
                    acronym: conference.acronym || "",
                    description: conference.description || "",
                    location: conference.location || "",
                    startDate: conference.startDate ? conference.startDate.split("T")[0] : "",
                    endDate: conference.endDate ? conference.endDate.split("T")[0] : "",
                    websiteUrl: conference.websiteUrl || "",
                    area: (conference as any).area || "",
                    societySponsor: (conference as any).societySponsor
                        ? (conference as any).societySponsor.split(",").map((s: string) => s.trim())
                        : [],

                    country: (conference as any).country || "",
                    province: (conference as any).province || "",
                    bannerImageUrl: (conference as any).bannerImageUrl || "",
                    contactInformation: (conference as any).contactInformation || "",
                    chairEmails: (conference as any).chairEmails || "",
                }
                return (
                    <div>
                        <h2 className="text-xl font-bold mb-6">Config Conference Detail</h2>
                        <ConferenceForm
                            initialData={safeDefaults}
                            onSubmit={handleUpdateConference}
                            isSubmitting={isUpdatingGeneral}
                            conferenceId={conferenceId}
                        />
                    </div>
                )

            case 'dashboard':
                return <ChairDashboard conferenceId={conferenceId} />

            case 'features-tracks':
                return (
                    <div className="space-y-6">
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-2">Config Tracks</h2>
                            <p className="text-sm text-muted-foreground">Manage tracks in this conference.</p>
                        </div>
                        <AddTrack conferenceId={conferenceId} onSubmit={handleSaveTrack} onImportSuccess={() => setTrackRefreshKey(k => k + 1)} />
                        <TrackList conferenceId={conferenceId} refreshKey={trackRefreshKey} />
                    </div>
                )

            case 'features-subject-areas':
                return (
                    <div className="space-y-8">
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-4">Config Subject Areas</h2>
                            <p className="text-sm text-muted-foreground">Manage primary and secondary subject areas for tracks.</p>
                        </div>
                        <SubjectAreaManager conferenceId={conferenceId} />
                    </div>
                )

            case 'features-members':
                return <ConfigMembers conferenceId={conferenceId} />

            case 'features-paper-management':
                return <PaperManagement conferenceId={conferenceId} />

            case 'features-review-settings':
                return (
                    <div className="space-y-6">
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-2">Review Settings</h2>
                            <p className="text-sm text-muted-foreground">Configure review type, reviewer quota, discussion settings and more.</p>
                        </div>
                        <ReviewSettingsComponent conferenceId={conferenceId} />
                    </div>
                )

            case 'features-conflict-settings':
                return (
                    <div className="space-y-6">
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-2">Conflict Settings</h2>
                            <p className="text-sm text-muted-foreground">Configure domain conflicts, manual conflicts, and author self-configuration.</p>
                        </div>
                        <ConflictManagement conferenceId={conferenceId} />
                    </div>
                )

            case 'features-review-management':
                return <ReviewManagement conferenceId={conferenceId} />

            case 'features-camera-ready':
                return <CameraReadyManagement conferenceId={conferenceId} />
            case 'forms-mail':
                return <EmailManagementInline conferenceId={conferenceId} />

            case 'forms-submission':
                return (
                    <div className="space-y-8">
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-4">Config Submission Form</h2>
                            <p className="text-sm text-muted-foreground">Design the fields authors must fill out when submitting papers.</p>
                        </div>
                        <FormBuilder
                            initialFields={savedFields}
                            onSave={handleSaveFormConfig}
                            isSaving={isSavingForm}
                        />
                    </div>
                )

            case 'forms-review':
                return (
                    <div className="space-y-8">
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-4">Config Review Form</h2>
                            <p className="text-sm text-muted-foreground">Configure the questions reviewers must answer for each track.</p>
                        </div>
                        <ReviewQuestionsList conferenceId={conferenceId} />
                    </div>
                )

            case 'features-activity-timeline':
                return (
                    <div className="space-y-8">
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-4">Activity Timeline</h2>
                            <p className="text-sm text-muted-foreground">Manage timelines and toggle module availability for this conference.</p>
                        </div>
                        <ActivityTimeline conferenceId={conferenceId} onNavigate={(tab) => setActiveTab(tab as any)} />
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <div className="min-h-screen bg-transparent flex flex-col overflow-hidden">
            <div className="flex-1 w-full max-w-[1700px] mx-auto flex flex-col p-4 md:p-8 overflow-hidden">
                {/* Header Area */}
                <div className="mb-8 shrink-0">
                    <Link href="/conference/my-conference">
                        <Button variant="ghost" className="mb-4 -ml-2">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to My Conferences
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{conference.name}</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage and configure your conference settings
                        </p>
                    </div>
                </div>

                {/* Dashboard Card with internal scrolling */}
                <Card className="flex flex-col md:flex-row shadow-lg overflow-hidden flex-1 min-h-0 bg-background border border-border">
                    {/* Sidebar Navigation */}
                    <div className="md:w-72 shrink-0 bg-muted/5 border-r flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {/* Workflow Progress */}
                            {(() => {
                                const trackableItems = TAB_GROUPS.flatMap(g => g.items).filter(i => i.completionKey)
                                const doneCount = trackableItems.filter(i => workflowStatus[i.completionKey]).length
                                const totalCount = trackableItems.length
                                const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
                                return (
                                    <div className="mb-5 px-1">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Workflow</span>
                                            <span className={`text-[10px] font-bold ${pct === 100 ? 'text-emerald-600' : 'text-muted-foreground'}`}>{doneCount}/{totalCount}</span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })()}

                            <nav>
                                {(() => {
                                    // Compute step completion: find the last consecutively completed step
                                    const steppedGroups = TAB_GROUPS.filter(g => g.title !== 'Overview')
                                    const groupCompletionMap = steppedGroups.map(group => {
                                        const trackable = group.items.filter(i => i.completionKey)
                                        return trackable.length > 0 ? trackable.every(i => workflowStatus[i.completionKey]) : false
                                    })
                                    // Find last consecutive completed step index
                                    let lastCompletedStep = -1
                                    for (let i = 0; i < groupCompletionMap.length; i++) {
                                        if (groupCompletionMap[i]) lastCompletedStep = i
                                        else break
                                    }

                                    let stepNumber = 0

                                    return TAB_GROUPS.map((group, groupIdx) => {
                                        const isExpanded = expandedGroups.includes(group.title)
                                        const trackable = group.items.filter(i => i.completionKey)
                                        const groupDone = trackable.length > 0 && trackable.every(i => workflowStatus[i.completionKey])
                                        const isOverview = group.title === 'Overview'

                                        // Step number (skip Overview)
                                        if (!isOverview) stepNumber++
                                        const currentStep = stepNumber
                                        const isLastGroup = groupIdx === TAB_GROUPS.length - 1

                                        // Is any item in this group currently active?
                                        const isGroupActive = group.items.some(i => activeTab === i.key)

                                        // Progress line color: green if this step is completed
                                        const lineCompleted = !isOverview && currentStep <= lastCompletedStep + 1

                                        if (isOverview) {
                                            // Overview: render without step number, keep original style
                                            return (
                                                <div key={group.title} className="mb-4">
                                                    <button
                                                        onClick={() => setExpandedGroups(prev =>
                                                            isExpanded ? prev.filter(t => t !== group.title) : [...prev, group.title]
                                                        )}
                                                        className="w-full flex items-center justify-between px-2 py-2 text-sm font-bold text-foreground hover:text-primary transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className={group.accentColor}>{group.icon}</span>
                                                            <span className="uppercase tracking-wider text-xs">{group.title}</span>
                                                        </div>
                                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    </button>
                                                    {isExpanded && (
                                                        <div className="flex flex-col space-y-0.5 mt-1 pl-2 border-l ml-3 border-border/50">
                                                            {group.items.map(item => {
                                                                const isActive = activeTab === item.key
                                                                return (
                                                                    <button
                                                                        key={item.key}
                                                                        onClick={() => setActiveTab(item.key as SettingsTab)}
                                                                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-sm transition-colors
                                                                            ${isActive
                                                                                ? 'bg-primary/10 text-primary font-semibold'
                                                                                : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground'
                                                                            }`}
                                                                    >
                                                                        <span className="truncate">{item.label}</span>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        }

                                        // Stepped groups
                                        const isGroupLocked = group.items.every(i => i.completionKey ? stepAccessMap[i.key] === 'locked' : false)
                                        return (
                                            <div key={group.title} className="relative flex">
                                                {/* Left: Step number circle + vertical line */}
                                                <div className="flex flex-col items-center mr-3 shrink-0" style={{ width: '28px' }}>
                                                    {/* Step circle */}
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-all duration-300 ${
                                                        groupDone
                                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                                            : isGroupLocked
                                                                ? 'bg-muted border-muted-foreground/15 text-muted-foreground/30'
                                                                : isGroupActive
                                                                    ? 'bg-primary border-primary text-white'
                                                                    : 'bg-background border-muted-foreground/30 text-muted-foreground'
                                                    }`}>
                                                        {groupDone ? (
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        ) : isGroupLocked ? (
                                                            <Lock className="h-3 w-3" />
                                                        ) : (
                                                            currentStep
                                                        )}
                                                    </div>
                                                    {/* Vertical line */}
                                                    {!isLastGroup && (
                                                        <div className={`w-0.5 flex-1 mt-1 rounded-full transition-all duration-500 ${
                                                            lineCompleted ? 'bg-emerald-400' : 'bg-muted-foreground/15'
                                                        }`} />
                                                    )}
                                                </div>

                                                {/* Right: Group content */}
                                                <div className="flex-1 pb-5 min-w-0">
                                                    <button
                                                        onClick={() => setExpandedGroups(prev =>
                                                            isExpanded ? prev.filter(t => t !== group.title) : [...prev, group.title]
                                                        )}
                                                        className="w-full flex items-center justify-between py-1 text-sm font-bold text-foreground hover:text-primary transition-colors"
                                                    >
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="uppercase tracking-wider text-xs truncate">{group.title}</span>
                                                            {trackable.length > 0 && (
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                                                    groupDone
                                                                        ? 'bg-emerald-100 text-emerald-700'
                                                                        : 'bg-muted text-muted-foreground'
                                                                }`}>{trackable.filter(i => workflowStatus[i.completionKey]).length}/{trackable.length}</span>
                                                            )}
                                                        </div>
                                                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="flex flex-col space-y-0.5 mt-1">
                                                            {group.items.map(item => {
                                                                const isDone = item.completionKey ? workflowStatus[item.completionKey] : false
                                                                const isActive = activeTab === item.key
                                                                const access = item.completionKey ? stepAccessMap[item.key] : 'active'
                                                                const isLocked = access === 'locked'
                                                                return (
                                                                    <button
                                                                        key={item.key}
                                                                        onClick={() => !isLocked && setActiveTab(item.key as SettingsTab)}
                                                                        disabled={isLocked}
                                                                        title={isLocked ? 'Complete previous steps first' : isDone ? 'Completed (view only)' : undefined}
                                                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-sm transition-colors
                                                                            ${isLocked
                                                                                ? 'text-muted-foreground/30 cursor-not-allowed'
                                                                                : isActive
                                                                                    ? 'bg-primary/10 text-primary font-semibold'
                                                                                    : isDone
                                                                                        ? 'text-foreground hover:bg-muted'
                                                                                        : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground'
                                                                            }`}
                                                                    >
                                                                        {isLocked ? (
                                                                            <Lock className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                                                                        ) : item.completionKey ? (
                                                                            isDone ? (
                                                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                                            ) : (
                                                                                <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                                                                            )
                                                                        ) : null}
                                                                        <span className={`truncate ${isLocked ? '' : isDone ? 'font-medium' : ''}`}>
                                                                            {item.label}
                                                                        </span>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                })()}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content Area - Scrollable */}
                    <div className="flex-1 min-w-0 bg-background overflow-hidden flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="max-w-8xl mx-auto p-8 md:p-12 pb-24">
                                {/* Read-only banner for completed config steps only */}
                                {(() => {
                                    const currentItem = TAB_GROUPS.flatMap(g => g.items).find(i => i.key === activeTab)
                                    const isCompletedConfig = currentItem?.lockWhenDone && stepAccessMap[activeTab] === 'completed'
                                    return (
                                        <>
                                            {isCompletedConfig && (
                                                <div className="mb-6 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                                                    <Eye className="h-5 w-5 text-emerald-600 shrink-0" />
                                                    <div>
                                                        <p className="text-sm font-medium text-emerald-800">View Only</p>
                                                        <p className="text-xs text-emerald-600">This step has been completed. Configuration is locked to maintain workflow integrity.</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className={isCompletedConfig ? 'pointer-events-none opacity-60 select-none' : ''}>
                                                {renderTabContent()}
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}
