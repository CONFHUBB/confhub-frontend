'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getConference } from '@/app/api/conference.api'
import type { ConferenceResponse } from '@/types/conference'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, FileText, Users, LayoutTemplate, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { FormBuilder } from '../submission-form/form-builder'
import { saveConferenceSubmissionForm, getConferenceSubmissionForm } from '@/app/api/submission-form.api'

import { AddTrack } from './add-track'
import { AddTopic } from './add-topic'
import { ReviewType } from './review-type'
import { AssignRole } from './assign-role'
import { ConferenceTemplate } from './conference-template'

import { createTrack } from '@/app/api/conference.api'
import { createTopic } from '@/app/api/topic.api'
import { assignRole } from '@/app/api/user.api'
import { createTemplate } from '@/app/api/template.api'
import { createReviewType } from '@/app/api/review-type.api'
import { updateConference } from '@/app/api/conference.api'
import { ConferenceForm } from '../../create/conference-form'
import type { ConferenceData } from '@/types/conference-form'

import type { DynamicField, FormDefinition } from '@/types/submission-form'
import type {
    TrackData,
    TopicData,
    RoleAssignmentData,
    TemplateData,
    ReviewTypeData,
} from "@/types/conference-form"

type SettingsTab = 'general' | 'tracks-topics' | 'submission-form' | 'template' | 'members'

const TABS: { key: SettingsTab; label: string; icon: React.ReactNode; description: string; implemented: boolean }[] = [
    {
        key: 'general',
        label: 'General Settings',
        icon: <FileText className="h-5 w-5" />,
        description: 'Update conference info, dates, and location',
        implemented: false,
    },
    {
        key: 'tracks-topics',
        label: 'Tracks & Topics',
        icon: <LayoutTemplate className="h-5 w-5" />,
        description: 'Configure tracks, topics, and review options',
        implemented: true,
    },
    {
        key: 'submission-form',
        label: 'Submission Form',
        icon: <ClipboardList className="h-5 w-5" />,
        description: 'Configure dynamic fields for paper submissions',
        implemented: true,
    },
    {
        key: 'template',
        label: 'Config Template',
        icon: <LayoutTemplate className="h-5 w-5" />,
        description: 'Set up conference templates and deadlines',
        implemented: false,
    },
    {
        key: 'members',
        label: 'Config Members',
        icon: <Users className="h-5 w-5" />,
        description: 'Manage organizers, reviewers, and roles',
        implemented: false,
    },
]

export default function ConferenceUpdatePage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<SettingsTab>('general')
    const [isUpdatingGeneral, setIsUpdatingGeneral] = useState(false)

    // Form Builder state
    const [savedFields, setSavedFields] = useState<DynamicField[]>([])
    const [isSavingForm, setIsSavingForm] = useState(false)
    const [isSavingReviewType, setIsSavingReviewType] = useState(false)

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
                submissionStart: new Date(data.submissionStart).toISOString(),
                submissionEnd: new Date(data.submissionEnd).toISOString(),
                registrationStart: new Date(data.registrationStart).toISOString(),
                registrationEnd: new Date(data.registrationEnd).toISOString(),
                cameraReadyStart: new Date(data.cameraReadyStart).toISOString(),
                cameraReadyEnd: new Date(data.cameraReadyEnd).toISOString(),
                biddingStart: new Date(data.biddingStart).toISOString(),
                biddingEnd: new Date(data.biddingEnd).toISOString(),
                reviewStart: new Date(data.reviewStart).toISOString(),
                reviewEnd: new Date(data.reviewEnd).toISOString(),
                maxSubmissions: Number(data.maxSubmissions),
            })
            toast.success("Track saved successfully!")
        } catch (err) {
            toast.error("Failed to save track")
        }
    }

    const handleSaveTopics = async (topics: TopicData[]) => {
        toast.success("Topics generated/saved successfully! (Backend integration pending track selection)")
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

    const handleSaveReviewType = async (data: ReviewTypeData) => {
        setIsSavingReviewType(true)
        try {
            await createReviewType({
                conferenceId,
                reviewOption: data.reviewOption,
                isRebuttal: data.isRebuttal,
            })
            toast.success("Review type saved!")
        } catch (err) {
            toast.error("Failed to save review type")
        } finally {
            setIsSavingReviewType(false)
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
                paperDeadline: data.paperDeadline ? new Date(data.paperDeadline).toISOString() : "",
                cameraReadyDeadline: data.cameraReadyDeadline ? new Date(data.cameraReadyDeadline).toISOString() : "",
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
                <Link href="/conference/my-conference">
                    <Button>Back to My Conferences</Button>
                </Link>
            </div>
        )
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'submission-form':
                return (
                    <FormBuilder
                        initialFields={savedFields}
                        onSave={handleSaveFormConfig}
                        isSaving={isSavingForm}
                    />
                )
            case 'template':
                return (
                    <ConferenceTemplate
                        initialTemplates={[]}
                        onSubmit={handleSaveTemplates}
                    />
                )
            case 'members':
                return (
                    <AssignRole
                        initialAssignments={[]}
                        onSubmit={handleSaveRoles}
                    />
                )
            case 'general':
                if (!conference) return null
                const safeDefaults = {
                    name: conference.name || "",
                    acronym: conference.acronym || "",
                    description: conference.description || "",
                    location: conference.location || "",
                    // Input type="date" expects "YYYY-MM-DD"
                    startDate: conference.startDate ? conference.startDate.split("T")[0] : "",
                    endDate: conference.endDate ? conference.endDate.split("T")[0] : "",
                    websiteUrl: conference.websiteUrl || "",
                    area: (conference as any).area || "",
                    // @ts-ignore
                    societySponsor: (conference as any).societySponsor 
                        ? (conference as any).societySponsor.split(",").map((s: string) => s.trim()) 
                        : [],
                    conferenceIdNumber: (conference as any).conferenceIdNumber || "",
                    country: (conference as any).country || "",
                    province: (conference as any).province || "",
                    bannerImageUrl: (conference as any).bannerImageUrl || "",
                    contactInformation: (conference as any).contactInformation || "",
                    // Input type="datetime-local" expects "YYYY-MM-DDThh:mm"
                    paperDeadline: (conference as any).paperDeadline ? (conference as any).paperDeadline.substring(0, 16) : "",
                    cameraReadyDeadline: (conference as any).cameraReadyDeadline ? (conference as any).cameraReadyDeadline.split("T")[0] : "",
                    chairEmails: (conference as any).chairEmails || "",
                }
                return (
                    <ConferenceForm 
                        initialData={safeDefaults} 
                        onSubmit={handleUpdateConference} 
                        isSubmitting={isUpdatingGeneral}
                    />
                )
            case 'tracks-topics':
                return (
                    <div className="space-y-8">
                        <AddTrack defaultDates={null} onSubmit={handleSaveTrack} />
                        <AddTopic initialTopics={[]} onSubmit={handleSaveTopics} />
                        <ReviewType
                            initialData={null}
                            onSubmit={handleSaveReviewType}
                            isSubmitting={isSavingReviewType}
                        />
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-8xl">
            {/* Header */}
            <div className="mb-8">
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

            {/* Layout: Sidebar + Content */}
            <Card className="flex flex-col md:flex-row shadow-sm overflow-hidden">
                {/* Sidebar Navigation */}
                <div className="md:w-64 shrink-0 bg-muted/10 border-r md:min-h-[600px]">
                    <nav className="p-4 space-y-1">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors
                                    ${activeTab === tab.key
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {tab.icon}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span>{tab.label}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0 p-6 md:p-8">
                    {renderTabContent()}
                </div>
            </Card>
        </div>
    )
}
