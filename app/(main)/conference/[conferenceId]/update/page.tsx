'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getConference } from '@/app/api/conference.api'
import type { ConferenceResponse } from '@/types/conference'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Settings, FileText, Calendar, ClipboardList, Lock, ChevronRight, ChevronDown,
    ArrowLeft, Shield, Users, LayoutDashboard, Loader2
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { FormBuilder } from '../submission-form/form-builder'
import { saveConferenceSubmissionForm, getConferenceSubmissionForm } from '@/app/api/submission-form.api'

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
    | 'features-review-management'
    | 'features-camera-ready'
    | 'forms-mail'
    | 'forms-submission'
    | 'forms-review'
    | 'features-activity-timeline'

const TAB_GROUPS = [
    {
        title: "Overview",
        icon: <LayoutDashboard className="h-4 w-4" />,
        items: [
            { key: "dashboard", label: "Dashboard", implemented: true }
        ]
    },
    {
        title: "Conference Setup",
        icon: <Settings className="h-4 w-4" />,
        items: [
            { key: "general-detail", label: "Conference Detail", implemented: true },
            { key: "features-tracks", label: "Tracks", implemented: true },
            { key: "features-subject-areas", label: "Subject Areas", implemented: true },
            { key: "features-members", label: "Members", implemented: true },
            { key: "features-activity-timeline", label: "Activity Timeline", implemented: true }
        ]
    },
    {
        title: "Paper & Review",
        icon: <FileText className="h-4 w-4" />,
        items: [
            { key: "features-paper-management", label: "Paper Management", implemented: true },
            { key: "features-review-management", label: "Review Management", implemented: true },
            { key: "features-camera-ready", label: "Camera-Ready", implemented: true }
        ]
    },
    {
        title: "Forms & Templates",
        icon: <ClipboardList className="h-4 w-4" />,
        items: [
            { key: "forms-mail", label: "Email Templates", implemented: true },
            { key: "forms-submission", label: "Submission Form", implemented: true },
            { key: "forms-review", label: "Review Form", implemented: true }
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
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['Overview', 'Conference Setup', 'Paper & Review', 'Forms & Templates'])
    const [isUpdatingGeneral, setIsUpdatingGeneral] = useState(false)

    // Form Builder state
    const [savedFields, setSavedFields] = useState<DynamicField[]>([])
    const [isSavingForm, setIsSavingForm] = useState(false)
    const [trackRefreshKey, setTrackRefreshKey] = useState(0)

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
                        <div>
                            <h2 className="text-xl font-bold mb-2">Config Tracks</h2>
                            <p className="text-sm text-muted-foreground">Manage tracks in this conference.</p>
                        </div>
                        <TrackList conferenceId={conferenceId} refreshKey={trackRefreshKey} />
                        <AddTrack conferenceId={conferenceId} onSubmit={handleSaveTrack} onImportSuccess={() => setTrackRefreshKey(k => k + 1)} />
                    </div>
                )

            case 'features-subject-areas':
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-xl font-bold mb-4">Config Subject Areas</h2>
                            <p className="text-sm text-muted-foreground mb-6">Manage primary and secondary subject areas for tracks.</p>
                        </div>
                        <SubjectAreaManager conferenceId={conferenceId} />
                    </div>
                )

            case 'features-members':
                return <ConfigMembers conferenceId={conferenceId} />

            case 'features-paper-management':
                return <PaperManagement conferenceId={conferenceId} />

            case 'features-review-management':
                return <ReviewManagement conferenceId={conferenceId} />

            case 'features-camera-ready':
                return <CameraReadyManagement conferenceId={conferenceId} />
            case 'forms-mail':
                return <EmailManagementInline conferenceId={conferenceId} />

            case 'forms-submission':
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-xl font-bold mb-4">Config Submission Form</h2>
                            <p className="text-sm text-muted-foreground mb-6">Design the fields authors must fill out when submitting papers.</p>
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
                        <div>
                            <h2 className="text-xl font-bold mb-4">Config Review Form</h2>
                            <p className="text-sm text-muted-foreground mb-6">Configure the questions reviewers must answer for each track.</p>
                        </div>
                        <ReviewQuestionsList conferenceId={conferenceId} />
                    </div>
                )

            case 'features-activity-timeline':
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-xl font-bold mb-4">Activity Timeline</h2>
                            <p className="text-sm text-muted-foreground mb-6">Manage timelines and toggle module availability for this conference.</p>
                        </div>
                        <ActivityTimeline conferenceId={conferenceId} />
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
                    <Link href={`/conference/${conferenceId}`}>
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
                            <nav className="space-y-6">
                                {TAB_GROUPS.map((group) => {
                                    const isExpanded = expandedGroups.includes(group.title)
                                    return (
                                        <div key={group.title} className="space-y-1">
                                            <button
                                                onClick={() => setExpandedGroups(prev =>
                                                    isExpanded ? prev.filter(t => t !== group.title) : [...prev, group.title]
                                                )}
                                                className="w-full flex items-center justify-between px-2 py-2 text-sm font-bold text-foreground hover:text-primary transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {group.icon}
                                                    <span className="uppercase tracking-wider text-xs">{group.title}</span>
                                                </div>
                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </button>

                                            {isExpanded && (
                                                <div className="flex flex-col space-y-1 mt-1 pl-4 border-l ml-3 border-border/50">
                                                    {group.items.map(item => (
                                                        <button
                                                            key={item.key}
                                                            onClick={() => {
                                                                if ((item as any).isLink) {
                                                                    if (item.key === 'features-camera-ready') {
                                                                        router.push(`/conference/${conferenceId}/author/camera-ready`)
                                                                    }
                                                                } else {
                                                                    setActiveTab(item.key as SettingsTab)
                                                                }
                                                            }}
                                                            className={`w-full flex items-center px-3 py-2 rounded-md text-left text-sm transition-colors
                                                                ${activeTab === item.key
                                                                    ? 'bg-primary/10 text-primary font-semibold'
                                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                                }`}
                                                        >
                                                            <span className="relative">
                                                                {item.label}
                                                                {!item.implemented && (
                                                                    <span className="ml-2 text-[10px] uppercase font-bold text-muted-foreground/50">Soon</span>
                                                                )}
                                                            </span>
                                                        </button>
                                                    ))}
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
