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
import { FormBuilder } from '@/components/submission-form/form-builder'
import { saveConferenceSubmissionForm, getConferenceSubmissionForm } from '@/app/api/submission-form.api'
import { DynamicField, FormDefinition } from '@/types/submission-form'

type SettingsTab = 'submission-form' | 'template' | 'members' | 'general'

const TABS: { key: SettingsTab; label: string; icon: React.ReactNode; description: string; implemented: boolean }[] = [
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
    {
        key: 'general',
        label: 'General Settings',
        icon: <FileText className="h-5 w-5" />,
        description: 'Update conference info, dates, and location',
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
    const [activeTab, setActiveTab] = useState<SettingsTab>('submission-form')

    // Form Builder state
    const [savedFields, setSavedFields] = useState<DynamicField[]>([])
    const [isSavingForm, setIsSavingForm] = useState(false)

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
            case 'members':
            case 'general':
                return (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                {TABS.find(t => t.key === activeTab)?.icon}
                            </div>
                            <h3 className="text-lg font-semibold mb-2">
                                {TABS.find(t => t.key === activeTab)?.label}
                            </h3>
                            <p className="text-muted-foreground max-w-sm">
                                This feature is coming soon. Stay tuned for updates!
                            </p>
                        </CardContent>
                    </Card>
                )
            default:
                return null
        }
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
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
            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Navigation */}
                <nav className="md:w-64 shrink-0">
                    <div className="space-y-1">
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
                                        {!tab.implemented && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted-foreground/20 text-muted-foreground shrink-0">
                                                Soon
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    )
}
