'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getConference, getConferenceActivities } from '@/app/api/conference.api'
import type { ConferenceResponse, ConferenceActivityDTO } from '@/types/conference'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Settings, FileText, Calendar, ClipboardList, Lock, ChevronRight, ChevronDown,
    ArrowLeft, Users, LayoutDashboard, Loader2, CheckCircle2, Circle,
    Eye, Ticket, Shield, GraduationCap, Clock
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { SubmissionFormManager } from '../submission-form/submission-form-manager'
import { getTracksByConference, getSubjectAreasByTrack, getTrackReviewSettings } from '@/app/api/track.api'
import { getConferenceMembers } from '@/app/api/user.api'
import { getConferenceUsersWithRoles } from "@/app/api/conference-user-track.api"
import { getPapersByConference } from '@/app/api/paper.api'
import { saveConferenceSubmissionForm, getConferenceSubmissionForm } from '@/app/api/submission-form.api'
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
import TicketTypesConfig from './ticket-types'
import AttendeesManagement from './attendees-management'
import ProgramBuilder from './program-builder'
import { CheckInInline } from './checkin-inline'
import { PaymentHistoryView } from './payment-history-view'
import { AnalyticsDashboard } from './analytics-dashboard'

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
    | 'analytics'
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
    | 'features-program-builder'
    | 'reg-ticket-types'
    | 'reg-attendees'
    | 'reg-checkin'
    | 'reg-payment-history'

// Workflow status type
type WorkflowStatus = Record<string, boolean>

// ── Role-based permissions ──────────────────────────────────────────────
type TabPermission = 'edit' | 'view' | 'hidden'
type ChairRole = 'CONFERENCE_CHAIR' | 'PROGRAM_CHAIR'

interface TabItemDef {
    key: string
    label: string
    completionKey: string
    lockWhenDone: boolean
    permissions: Record<ChairRole, TabPermission>
}

interface TabGroupDef {
    title: string
    icon: React.ReactNode
    accentColor: string
    items: TabItemDef[]
}

// Permission matrix following the use case document:
// Conference Chair = organizer/admin (infrastructure, members, tickets, attendees)
// Program Chair = academic workflow owner (review, papers, decisions, program)
const TAB_GROUPS: TabGroupDef[] = [
    {
        title: "Overview",
        icon: <LayoutDashboard className="h-4 w-4" />,
        accentColor: "text-primary",
        items: [
            { key: "dashboard", label: "Dashboard", completionKey: "", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'edit', PROGRAM_CHAIR: 'edit' } },
            { key: "analytics", label: "Analytics", completionKey: "", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'edit', PROGRAM_CHAIR: 'edit' } }
        ]
    },
    {
        title: "General Settings",
        icon: <Settings className="h-4 w-4" />,
        accentColor: "text-indigo-600",
        items: [
            { key: "general-detail", label: "Conference Details", completionKey: "edit-details", lockWhenDone: true, permissions: { CONFERENCE_CHAIR: 'edit', PROGRAM_CHAIR: 'hidden' } },
            { key: "features-tracks", label: "Tracks", completionKey: "manage-tracks", lockWhenDone: true, permissions: { CONFERENCE_CHAIR: 'edit', PROGRAM_CHAIR: 'hidden' } },
            { key: "features-subject-areas", label: "Subject Areas", completionKey: "add-subject-areas", lockWhenDone: true, permissions: { CONFERENCE_CHAIR: 'edit', PROGRAM_CHAIR: 'hidden' } },
            { key: "reg-ticket-types", label: "Tickets & Fees", completionKey: "", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'edit', PROGRAM_CHAIR: 'hidden' } },
        ]
    },
    {
        title: "User Management",
        icon: <Users className="h-4 w-4" />,
        accentColor: "text-sky-600",
        items: [
            { key: "features-members", label: "Members & Roles", completionKey: "add-members", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'edit', PROGRAM_CHAIR: 'hidden' } },
        ]
    },
    {
        title: "Forms & Templates",
        icon: <ClipboardList className="h-4 w-4" />,
        accentColor: "text-teal-600",
        items: [
            { key: "forms-submission", label: "Submission Form", completionKey: "config-submission-form", lockWhenDone: true, permissions: { CONFERENCE_CHAIR: 'edit', PROGRAM_CHAIR: 'hidden' } },
            { key: "forms-review", label: "Review Form", completionKey: "config-review-form", lockWhenDone: true, permissions: { CONFERENCE_CHAIR: 'view', PROGRAM_CHAIR: 'edit' } },
            { key: "forms-mail", label: "Email Templates", completionKey: "", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'edit', PROGRAM_CHAIR: 'edit' } },
            { key: "features-review-settings", label: "Review Settings", completionKey: "config-review-settings", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'view', PROGRAM_CHAIR: 'edit' } },
            { key: "features-conflict-settings", label: "Conflict Settings", completionKey: "config-conflict-settings", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'view', PROGRAM_CHAIR: 'edit' } },
        ]
    },
    {
        title: "Activity Timeline",
        icon: <Clock className="h-4 w-4" />,
        accentColor: "text-amber-600",
        items: [
            { key: "features-activity-timeline", label: "Timeline", completionKey: "set-timeline", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'edit', PROGRAM_CHAIR: 'view' } },
        ]
    },
    {
        title: "Paper & Review",
        icon: <FileText className="h-4 w-4" />,
        accentColor: "text-emerald-600",
        items: [
            { key: "features-paper-management", label: "Papers", completionKey: "", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'view', PROGRAM_CHAIR: 'edit' } },
            { key: "features-review-management", label: "Reviews", completionKey: "assign-reviewers", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'view', PROGRAM_CHAIR: 'edit' } },
            { key: "features-camera-ready", label: "Camera-Ready", completionKey: "camera-ready", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'view', PROGRAM_CHAIR: 'edit' } },
        ]
    },
    {
        title: "Registration",
        icon: <Ticket className="h-4 w-4" />,
        accentColor: "text-rose-600",
        items: [
            { key: "reg-attendees", label: "Attendees", completionKey: "", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'edit', PROGRAM_CHAIR: 'hidden' } },
            { key: "reg-payment-history", label: "Payments", completionKey: "", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'edit', PROGRAM_CHAIR: 'hidden' } },
        ]
    },
    {
        title: "Event",
        icon: <Calendar className="h-4 w-4" />,
        accentColor: "text-indigo-600",
        items: [
            { key: "features-program-builder", label: "Program", completionKey: "", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'hidden', PROGRAM_CHAIR: 'edit' } },
            { key: "reg-checkin", label: "Check-in", completionKey: "", lockWhenDone: false, permissions: { CONFERENCE_CHAIR: 'edit', PROGRAM_CHAIR: 'hidden' } },
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
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['Overview', 'General Settings', 'User Management', 'Forms & Templates', 'Activity Timeline', 'Paper & Review', 'Registration', 'Event'])
    const [isUpdatingGeneral, setIsUpdatingGeneral] = useState(false)

    // ── Role detection state ──────────────────────────────
    const [userRole, setUserRole] = useState<ChairRole | 'BOTH' | null>(null)

    // Submission Form Manager state
    const [savedFields, setSavedFields] = useState<DynamicField[]>([])
    const [isSavingForm, setIsSavingForm] = useState(false)
    const [trackRefreshKey, setTrackRefreshKey] = useState(0)
    const [workflowRefreshKey, setWorkflowRefreshKey] = useState(0)
    const refreshWorkflow = () => setWorkflowRefreshKey(k => k + 1)

    // Task 5: Track Chair filtered view — null means full access (chair), array means restricted
    const [chairTrackIds, setChairTrackIds] = useState<number[] | null>(null)

    useEffect(() => {
        const detectRole = async () => {
            try {
                const token = localStorage.getItem('accessToken')
                if (!token) return
                const payload = JSON.parse(atob(token.split('.')[1]))
                const userId: number = Number(payload.userId || payload.id)
                const data = await getConferenceUsersWithRoles(conferenceId, 0, 200)
                const members: any[] = (data as any)?.content || data || []
                const me = members.find((m: any) => Number(m.user?.id || m.userId || m.id) === userId)
                if (!me) {
                    // User not found in members list but has page access — assume full chair
                    console.warn(`[RoleDetector] User ID ${userId} not found in members array. Falling back to BOTH roles.`)
                    setUserRole('BOTH')
                    return
                }
                const roles: string[] = (me.roles || []).map((r: any) => r.assignedRole)

                const isCC = roles.includes('CONFERENCE_CHAIR')
                const isPC = roles.includes('PROGRAM_CHAIR')

                if (isCC && isPC) {
                    setUserRole('BOTH')
                } else if (isCC) {
                    setUserRole('CONFERENCE_CHAIR')
                } else if (isPC) {
                    setUserRole('PROGRAM_CHAIR')
                } else {
                    // Not a chair — check track chair, otherwise deny
                    const isTrackChair = roles.some(r => r === 'TRACK_CHAIR')
                    if (!isTrackChair) {
                        toast.error('Access Denied. Chair privileges required.')
                        router.push('/')
                        return
                    }
                    // Track chairs get limited PC view
                    setUserRole('PROGRAM_CHAIR')
                    const trackIds: number[] = (me.roles || [])
                        .filter((r: any) => r.assignedRole === 'REVIEWER')
                        .map((r: any) => r.conferenceTrackId)
                        .filter(Boolean)
                    setChairTrackIds(trackIds.length > 0 ? trackIds : null)
                }
            } catch {
                // API error — assume full access since user navigated here
                setUserRole('BOTH')
            }
        }
        detectRole()
    }, [conferenceId])

    // Workflow completion status
    const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({})

    // ── Role-based tab filtering ─────────────────────────────────────
    const getTabPermission = useCallback((item: TabItemDef): TabPermission => {
        if (!userRole || userRole === 'BOTH') return 'edit' // dual-role = full access
        return item.permissions[userRole]
    }, [userRole])

    const filteredTabGroups = useMemo(() => {
        return TAB_GROUPS.map(group => {
            const visibleItems = group.items.filter(item => getTabPermission(item) !== 'hidden')
            return { ...group, items: visibleItems }
        }).filter(group => group.items.length > 0)
    }, [getTabPermission])

    const isViewOnly = useCallback((tabKey: string): boolean => {
        for (const group of TAB_GROUPS) {
            for (const item of group.items) {
                if (item.key === tabKey) {
                    return getTabPermission(item) === 'view'
                }
            }
        }
        return false
    }, [getTabPermission])

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

            const hasSubmissionForm = !!formConfig;

            const hasMembers = (membersData as any).totalElements > 1
            const hasReviewerAssignments = papers.some((p: any) =>
                ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'PUBLISHED'].includes(p.status)
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
                const [conferenceData] = await Promise.all([
                    getConference(conferenceId)
                ])
                setConference(conferenceData)
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

    const handleUpdateConference = async (data: ConferenceData, pendingBannerFile?: File) => {
        setIsUpdatingGeneral(true)
        try {
            let bannerUrl = data.bannerImageUrl
            // Upload banner file if pending
            if (pendingBannerFile) {
                const { uploadBannerImage } = await import('@/app/api/conference.api')
                bannerUrl = await uploadBannerImage(conferenceId, pendingBannerFile)
            }
            const updated = await updateConference(conferenceId, {
                ...data,
                id: conferenceId,
                bannerImageUrl: bannerUrl.startsWith('[pending') ? '' : bannerUrl,
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
        const viewOnly = isViewOnly(activeTab)

        // View-only banner for tabs where user can see but not edit
        const ViewOnlyBanner = viewOnly ? (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 mb-6">
                <Eye className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                    <span className="font-medium">View Only</span> — You are viewing this section as {userRole === 'CONFERENCE_CHAIR' ? 'Conference Chair' : 'Program Chair'}. Only {userRole === 'CONFERENCE_CHAIR' ? 'Program Chairs' : 'Conference Chairs'} can make changes here.
                </p>
            </div>
        ) : null

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
                        {ViewOnlyBanner}
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
                return <ChairDashboard conferenceId={conferenceId} onNavigate={(tab) => setActiveTab(tab as any)} role={userRole === 'BOTH' ? undefined : userRole ?? undefined} />

            case 'analytics':
                return <AnalyticsDashboard conferenceId={conferenceId} />

            case 'features-tracks':
                return (
                    <div className="space-y-6">
                        {ViewOnlyBanner}
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-2">Config Tracks</h2>
                            <p className="text-sm text-muted-foreground">Manage tracks in this conference.</p>
                        </div>
                        {!viewOnly && <AddTrack conferenceId={conferenceId} onSubmit={handleSaveTrack} onImportSuccess={() => setTrackRefreshKey(k => k + 1)} />}
                        <TrackList conferenceId={conferenceId} refreshKey={trackRefreshKey} />
                    </div>
                )

            case 'features-subject-areas':
                return (
                    <div className="space-y-8">
                        {ViewOnlyBanner}
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-2">Config Subject Areas</h2>
                            <p className="text-sm text-muted-foreground">Manage primary and secondary subject areas for tracks.</p>
                        </div>
                        <SubjectAreaManager conferenceId={conferenceId} />
                    </div>
                )

            case 'features-members':
                return <>{ViewOnlyBanner}<ConfigMembers conferenceId={conferenceId} /></>

            case 'features-paper-management':
                return <>{ViewOnlyBanner}<PaperManagement conferenceId={conferenceId} trackIds={chairTrackIds ?? undefined} /></>


            case 'features-review-settings':
                return (
                    <div className="space-y-6">
                        {ViewOnlyBanner}
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-2">Review Settings</h2>
                            <p className="text-sm text-muted-foreground">Configure review type, reviewer quota, discussion settings and more.</p>
                        </div>
                        <ReviewSettingsComponent conferenceId={conferenceId} />
                    </div>
                )

            case 'features-conflict-settings':
                return <>{ViewOnlyBanner}<ConflictManagement conferenceId={conferenceId} /></>

            case 'features-review-management':
                return <>{ViewOnlyBanner}<ReviewManagement conferenceId={conferenceId} /></>

            case 'features-camera-ready':
                return <>{ViewOnlyBanner}<CameraReadyManagement conferenceId={conferenceId} /></>

            case 'features-program-builder':
                return <>{ViewOnlyBanner}<ProgramBuilder conferenceId={conferenceId} /></>

            case 'forms-mail':
                return <>{ViewOnlyBanner}<EmailManagementInline conferenceId={conferenceId} /></>

            case 'forms-submission':
                return (
                    <div className="space-y-8">
                        {ViewOnlyBanner}
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-2">Config Submission Form</h2>
                            <p className="text-sm text-muted-foreground">Design the fields authors must fill out when submitting papers.</p>
                        </div>
                        <SubmissionFormManager 
                            conferenceId={conferenceId} 
                            onConfigChanged={() => refreshWorkflow()} 
                        />
                    </div>
                )

            case 'forms-review':
                return (
                    <div className="space-y-8">
                        {ViewOnlyBanner}
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-2">Config Review Form</h2>
                            <p className="text-sm text-muted-foreground">Configure the questions reviewers must answer for each track.</p>
                        </div>
                        <ReviewQuestionsList conferenceId={conferenceId} isReadOnly={isViewOnly('forms-review')} />
                    </div>
                )

            case 'features-activity-timeline':
                return <>{ViewOnlyBanner}<ActivityTimeline conferenceId={conferenceId} onNavigate={(tab) => setActiveTab(tab as any)} /></>

            case 'reg-ticket-types':
                return <>{ViewOnlyBanner}<TicketTypesConfig conferenceId={conferenceId} /></>

            case 'reg-attendees':
                return (
                    <div className="space-y-6">
                        {ViewOnlyBanner}
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-2">Attendees</h2>
                            <p className="text-sm text-muted-foreground">View and manage all registered attendees.</p>
                        </div>
                        <AttendeesManagement conferenceId={conferenceId} />
                    </div>
                )

            case 'reg-checkin':
                return (
                    <div className="space-y-6">
                        {ViewOnlyBanner}
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-2">Check-In Scanner</h2>
                            <p className="text-sm text-muted-foreground">Scan QR codes or enter registration numbers to check in attendees on-site.</p>
                        </div>
                        <CheckInInline conferenceId={conferenceId} />
                    </div>
                )

            case 'reg-payment-history':
                return (
                    <div className="space-y-6">
                        {ViewOnlyBanner}
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-4 -mx-8 px-8 md:-mx-12 md:px-12 -mt-8 pt-8 md:-mt-12 md:pt-12">
                            <h2 className="text-xl font-bold mb-2">Payment History</h2>
                            <p className="text-sm text-muted-foreground">Full audit trail of all VNPay callbacks for this conference.</p>
                        </div>
                        <PaymentHistoryView conferenceId={conferenceId} />
                    </div>
                )

            default:
                return null
        }
    }

    // ── Role label helpers ────────────────────────────────────────
    const roleLabel = userRole === 'CONFERENCE_CHAIR' ? 'Conference Chair' : userRole === 'PROGRAM_CHAIR' ? 'Program Chair' : userRole === 'BOTH' ? 'Conference & Program Chair' : ''
    const roleBadgeColor = userRole === 'CONFERENCE_CHAIR' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : userRole === 'PROGRAM_CHAIR' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-violet-100 text-violet-800 border-violet-200'
    const roleIcon = userRole === 'CONFERENCE_CHAIR' ? <Shield className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />
    const backLink = userRole === 'PROGRAM_CHAIR' ? '/conference/program-conference' : '/conference/my-conference'
    const backLabel = userRole === 'PROGRAM_CHAIR' ? 'Back to Program Conferences' : 'Back to My Conferences'

    return (
        <div className="min-h-screen bg-transparent flex flex-col overflow-hidden">
            <div className="flex-1 w-full max-w-[1700px] mx-auto flex flex-col p-4 md:p-8 overflow-hidden">
                {/* Header Area — Vibrant hero banner */}
                <div className="mb-6 shrink-0">
                    <Link href={backLink}>
                        <Button variant="ghost" className="mb-3 -ml-2">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {backLabel}
                        </Button>
                    </Link>
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 p-6 md:px-8 md:py-7 shadow-lg">
                        {/* Decorative circles */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-xl" />

                        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                {/* Acronym + Status */}
                                <div className="flex items-center gap-2.5 mb-2">
                                    {conference.acronym && (
                                        <span className="text-xs font-mono font-semibold tracking-wider text-white/70 bg-white/10 px-2.5 py-0.5 rounded-md">
                                            {conference.acronym}
                                        </span>
                                    )}
                                    <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                        conference.status === 'ONGOING' ? 'bg-emerald-400/20 text-emerald-200' :
                                        conference.status === 'SCHEDULED' ? 'bg-blue-400/20 text-blue-200' :
                                        conference.status === 'COMPLETED' ? 'bg-gray-400/20 text-gray-300' :
                                        'bg-amber-400/20 text-amber-200'
                                    }`}>
                                        {conference.status}
                                    </span>
                                </div>

                                {/* Title */}
                                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                                    {conference.name}
                                </h1>

                                {/* Subtitle with dates */}
                                <p className="text-white/60 text-sm mt-1.5 flex items-center gap-2 flex-wrap">
                                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                                    {conference.startDate && conference.endDate
                                        ? `${new Date(conference.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(conference.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                        : 'Dates TBD'
                                    }
                                    {conference.location && (
                                        <>
                                            <span className="text-white/30">·</span>
                                            <span>{conference.location}</span>
                                        </>
                                    )}
                                </p>
                            </div>

                            {/* Right: Role badge */}
                            {userRole && (
                                <div className="flex items-center gap-2.5 md:self-start">
                                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/95 shadow-lg">
                                        <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${
                                            userRole === 'CONFERENCE_CHAIR'
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : userRole === 'PROGRAM_CHAIR'
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-violet-100 text-violet-600'
                                        }`}>
                                            {roleIcon}
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider leading-none">Your Role</p>
                                            <p className={`text-sm font-bold leading-tight mt-0.5 ${
                                                userRole === 'CONFERENCE_CHAIR'
                                                    ? 'text-emerald-700'
                                                    : userRole === 'PROGRAM_CHAIR'
                                                        ? 'text-blue-700'
                                                        : 'text-violet-700'
                                            }`}>{roleLabel}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dashboard Card with internal scrolling */}
                <Card className="flex flex-col md:flex-row shadow-lg overflow-hidden flex-1 min-h-0 bg-background border border-border">
                    {/* Sidebar Navigation */}
                    <div className="md:w-72 shrink-0 bg-muted/5 border-r flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <nav className="space-y-1">
                                {filteredTabGroups.map((group) => {
                                    const isExpanded = expandedGroups.includes(group.title)
                                    const isGroupActive = group.items.some(i => activeTab === i.key)
                                    return (
                                        <div key={group.title}>
                                            <button
                                                onClick={() => setExpandedGroups(prev =>
                                                    isExpanded ? prev.filter(t => t !== group.title) : [...prev, group.title]
                                                )}
                                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm font-bold transition-colors
                                                    ${isGroupActive ? 'text-primary' : 'text-foreground hover:text-primary'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={group.accentColor}>{group.icon}</span>
                                                    <span className="uppercase tracking-wider text-xs">{group.title}</span>
                                                </div>
                                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                                            </button>
                                            {isExpanded && (
                                                <div className="flex flex-col space-y-0.5 mt-0.5 pl-3 border-l ml-4 border-border/50">
                                                    {group.items.map(item => {
                                                        const isActive = activeTab === item.key
                                                        const itemIsViewOnly = isViewOnly(item.key)
                                                        return (
                                                            <button
                                                                key={item.key}
                                                                onClick={() => setActiveTab(item.key as SettingsTab)}
                                                                className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between
                                                                    ${isActive
                                                                        ? 'bg-primary/10 text-primary font-semibold'
                                                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                                    }`}
                                                            >
                                                                <span>{item.label}</span>
                                                                {itemIsViewOnly && (
                                                                    <Eye className="h-3 w-3 text-amber-500 shrink-0 ml-1" />
                                                                )}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </nav>
                        </div>
                    </div>


                    {/* Main Content Area - Scrollable */}
                    <div className="flex-1 min-w-0 bg-background overflow-hidden flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="max-w-8xl mx-auto p-8 md:p-12 pb-24">
                                {renderTabContent()}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}
