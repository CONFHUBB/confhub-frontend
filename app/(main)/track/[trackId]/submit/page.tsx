'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { getTrack, getSubjectAreasByTrack } from '@/app/api/track.api'
import type { TrackResponse } from '@/types/track'
import type { SubjectAreaResponse } from '@/types/subject-area'
import type { User } from '@/types/user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select as AntdSelect } from 'antd'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ArrowLeft, Check, FileText, Users, Upload, Search, Trash2, Send, FileUp, Layers } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createPaper, assignAuthorToPaper, getAuthorsByPaper, uploadPaperFile } from '@/app/api/paper.api'
import type { PaperAuthorItem } from '@/app/api/paper.api'
import { getConferenceSubmissionForm } from '@/app/api/submission-form.api'
import { getConferenceActivities } from '@/app/api/conference.api'
import type { ConferenceActivityDTO } from '@/types/conference'
import { isActivityOpen } from '@/lib/activity'
import { getUserByEmail } from '@/app/api/user.api'
import { FormRenderer } from '@/app/(main)/conference/[conferenceId]/submission-form/form-renderer'

const getCurrentUserEmail = (): string | null => {
    if (typeof window === 'undefined') return null
    const token = localStorage.getItem('accessToken')
    if (!token) return null
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.sub || null
    } catch (error) {
        console.error('Error decoding token:', error)
        return null
    }
}

function Stepper({ currentStep }: { currentStep: number }) {
    const steps = [
        { label: 'Register Paper', icon: FileText },
        { label: 'Add Authors', icon: Users },
        { label: 'Upload Manuscript', icon: Upload },
    ]

    return (
        <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => {
                const stepNumber = index + 1
                const isActive = stepNumber === currentStep
                const isCompleted = stepNumber < currentStep
                const Icon = step.icon

                return (
                    <div key={step.label} className="flex items-center flex-1 last:flex-initial">
                        <div className="flex flex-col items-center gap-2">
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                                    ${isCompleted
                                        ? 'bg-primary border-primary text-primary-foreground'
                                        : isActive
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                                    }`}
                            >
                                {isCompleted ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    <Icon className="h-5 w-5" />
                                )}
                            </div>
                            <span className={`text-xs font-medium whitespace-nowrap ${isActive ? 'text-primary' : isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
                                {step.label}
                            </span>
                        </div>

                        {index < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-3 mt-[-1.5rem] transition-colors duration-300 ${isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ─── Step 2: Add Authors ────────────────────────────────────────────────
function StepAddAuthors({
    paperId,
    paperTitle,
    onNext,
}: {
    paperId: number
    paperTitle: string
    onNext: () => void
}) {
    const [authors, setAuthors] = useState<PaperAuthorItem[]>([])
    const [loadingAuthors, setLoadingAuthors] = useState(true)
    const [searchEmail, setSearchEmail] = useState('')
    const [addingAuthor, setAddingAuthor] = useState(false)

    const fetchAuthors = useCallback(async () => {
        try {
            setLoadingAuthors(true)
            const data = await getAuthorsByPaper(paperId)
            setAuthors(data)
        } catch (err) {
            console.error('Error fetching authors:', err)
        } finally {
            setLoadingAuthors(false)
        }
    }, [paperId])

    useEffect(() => {
        fetchAuthors()
    }, [fetchAuthors])

    const handleAddAuthor = async () => {
        if (!searchEmail.trim()) {
            toast.error('Please enter an email address')
            return
        }
        try {
            setAddingAuthor(true)
            const user = await getUserByEmail(searchEmail.trim())
            if (!user || !user.id) {
                toast.error('User not found with that email')
                return
            }
            // Check if already added
            if (authors.some((a) => a.user.id === user.id)) {
                toast.error('This author is already added')
                return
            }
            await assignAuthorToPaper(paperId, user.id)
            toast.success('Author added successfully!')
            setSearchEmail('')
            fetchAuthors()
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to add author')
            console.error('Error adding author:', err)
        } finally {
            setAddingAuthor(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Success banner */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-300">
                    Paper <strong>"{paperTitle}"</strong> has been registered successfully.
                </p>
            </div>

            <p className="text-sm text-muted-foreground">
                All authors must be added to the paper record. You can add co-authors by their email address below.
            </p>

            {/* Authors Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Authors</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingAuthors ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Author Name</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {authors.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                                                No authors added yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        authors.map((item, idx) => (
                                            <tr key={item.paperAuthorId} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3">{idx + 1}</td>
                                                <td className="px-4 py-3 font-medium">{item.user.fullName}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{item.user.email}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Add Author */}
                    <div className="mt-4 flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-10"
                                placeholder="Enter author email address..."
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddAuthor()}
                            />
                        </div>
                        <Button onClick={handleAddAuthor} disabled={addingAuthor} className="gap-2 shrink-0">
                            {addingAuthor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                            Add Author
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-end pt-2">
                <Button size="lg" onClick={onNext} className="gap-2">
                    Continue to Upload Manuscript
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                </Button>
            </div>
        </div>
    )
}

// ─── Step 3: Upload Manuscript ──────────────────────────────────────────
function StepUploadManuscript({
    paperId,
    paperTitle,
    conferenceId,
}: {
    paperId: number
    paperTitle: string
    conferenceId: number
}) {
    const router = useRouter()
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Please select a PDF file')
            return
        }
        try {
            setUploading(true)
            await uploadPaperFile(conferenceId, paperId, selectedFile)
            toast.success('Manuscript uploaded successfully!')
            router.push(`/track?conferenceId=${conferenceId}`)
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to upload manuscript')
            console.error('Error uploading:', err)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Info banner */}
            <div className="p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 space-y-2">
                <p>
                    To convert other file formats, such as Microsoft Word, to PDF, you can use online services.
                    Examples include Adobe, PDFonline or FreePDFConvert.
                </p>
            </div>

            <div className="space-y-2">
                <p className="text-sm">
                    You can now upload your <strong>Manuscript</strong> for <em>{paperTitle}</em>.
                </p>
                <p className="text-sm text-muted-foreground">
                    You can upload PDF files, formatted as US letter size (8.5 by 11 inches), US letter size landscape (11 by 8.5 inches), A4 size (210 x 297 mm) or A4 size landscape (297 x 210 mm).
                </p>
                <p className="text-sm text-muted-foreground">
                    Files larger than 1 GB need to be uploaded via Google Drive or Dropbox links.
                </p>
            </div>

            {/* Upload Card */}
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <Label>File Name</Label>
                    <div className="flex gap-3 items-center">
                        <div className="flex-1">
                            <label
                                htmlFor="file-upload"
                                className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                            >
                                <FileUp className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    {selectedFile ? selectedFile.name : 'Choose file or drag and drop here'}
                                </span>
                            </label>
                            <input
                                id="file-upload"
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                        if (file.type !== 'application/pdf') {
                                            toast.error('Please select a PDF file')
                                            return
                                        }
                                        setSelectedFile(file)
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {selectedFile && (
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="font-medium">{selectedFile.name}</span>
                                <span className="text-muted-foreground">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button onClick={handleUpload} disabled={uploading || !selectedFile} className="gap-2">
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {uploading ? 'Uploading...' : 'Upload PDF'}
                        </Button>
                        <Button variant="outline" onClick={() => router.push(`/track?conferenceId=${conferenceId}`)}>
                            Skip for now
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// ─── Main Page ──────────────────────────────────────────────────────────
export default function SubmitPaperPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const trackId = Number(params.trackId)
    const conferenceId = Number(searchParams.get('conferenceId'))

    // Step management from URL
    const stepParam = Number(searchParams.get('step') || '1')
    const paperIdParam = Number(searchParams.get('paperId') || '0')
    const paperTitleParam = searchParams.get('paperTitle') || ''

    const [currentStep, setCurrentStep] = useState(stepParam)
    const [createdPaperId, setCreatedPaperId] = useState(paperIdParam)
    const [createdPaperTitle, setCreatedPaperTitle] = useState(paperTitleParam)

    const [track, setTrack] = useState<TrackResponse | null>(null)
    const [subjectAreas, setSubjectAreas] = useState<SubjectAreaResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [definitionJson, setDefinitionJson] = useState<string>("")
    const [submissionFormId, setSubmissionFormId] = useState<number | null>(null)
    const [primarySubjectAreaId, setPrimarySubjectAreaId] = useState<string>("")
    const [secondarySubjectAreaIds, setSecondarySubjectAreaIds] = useState<number[]>([])
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const [trackData, areasData] = await Promise.all([
                    getTrack(trackId),
                    getSubjectAreasByTrack(trackId)
                ])
                setTrack(trackData)
                setSubjectAreas(areasData)

                if (conferenceId) {
                    const [formConfig, activitiesData] = await Promise.all([
                        getConferenceSubmissionForm(conferenceId),
                        getConferenceActivities(conferenceId).catch(() => [] as ConferenceActivityDTO[])
                    ])

                    if (formConfig) {
                        setDefinitionJson(formConfig.definitionJson)
                        if (formConfig.id) {
                            setSubmissionFormId(formConfig.id)
                        }
                    }

                    setActivities(activitiesData)
                }
            } catch (err: any) {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    setError('You must be logged in to submit a paper.')
                    setTimeout(() => { router.push('/auth/login') }, 2000)
                } else {
                    setError('Failed to load submission form. Please try again later.')
                }
                console.error('Error fetching data:', err)
            } finally {
                setLoading(false)
            }
        }

        if (trackId) {
            fetchData()
        }
    }, [trackId, router])

    const navigateToStep = (step: number, paperId?: number, paperTitle?: string) => {
        const pid = paperId || createdPaperId
        const ptitle = paperTitle || createdPaperTitle
        setCurrentStep(step)
        setCreatedPaperId(pid)
        setCreatedPaperTitle(ptitle)

        const url = `/track/${trackId}/submit?conferenceId=${conferenceId}&step=${step}&paperId=${pid}&paperTitle=${encodeURIComponent(ptitle)}`
        router.replace(url)
    }

    const paperSubmissionActivity = activities.find(a => a.activityType === 'PAPER_SUBMISSION')
    const isPaperSubmissionOpen = isActivityOpen(paperSubmissionActivity)

    const handleFormSubmit = async (fixedData: any, extraAnswersJson: string) => {
        if (!isPaperSubmissionOpen) {
            toast.error('Paper submission is currently closed for this conference.')
            return
        }

        if (!primarySubjectAreaId) {
            toast.error('Please select a primary subject area.')
            return
        }

        try {
            setSubmitting(true)
            const payload: any = {
                conferenceTrackId: trackId,
                primarySubjectAreaId: Number(primarySubjectAreaId),
                secondarySubjectAreaIds,
                submissionFormId: submissionFormId || null,
                title: fixedData.title,
                abstractField: fixedData.abstractField,
                keywords: fixedData.keywords || [],
                extraAnswersJson,
                submissionTime: new Date().toISOString(),
                status: 'SUBMITTED'
            }

            const createdPaper = await createPaper(payload)

            // Auto-assign current user as author
            if (createdPaper.id) {
                const userEmail = getCurrentUserEmail()
                if (userEmail) {
                    try {
                        const user = await getUserByEmail(userEmail)
                        if (user && user.id) {
                            await assignAuthorToPaper(createdPaper.id, user.id)
                        }
                    } catch (authorErr) {
                        console.error('Error assigning author:', authorErr)
                    }
                }
            }

            toast.success('Paper registered successfully!')
            navigateToStep(2, createdPaper.id, fixedData.title)
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to register paper. Please try again.')
            console.error('Error submitting paper:', err)
        } finally {
            setSubmitting(false)
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
                {error.includes('logged in') ? (
                    <Link href="/auth/login"><Button>Go to Login</Button></Link>
                ) : (
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                )}
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            {/* Back button */}
            <Link href={`/track?conferenceId=${conferenceId}`}>
                <Button variant="ghost" className="mb-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Tracks
                </Button>
            </Link>

            {/* Page header */}
            <Card className="mb-6">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl">
                        Register a paper for {track?.name}
                    </CardTitle>
                    {track?.description && (
                        <p className="text-sm text-muted-foreground mt-1">{track.description}</p>
                    )}
                </CardHeader>
                <CardContent className="pt-0">
                    <Stepper currentStep={currentStep} />
                </CardContent>
            </Card>

            {/* Step Content */}
            {currentStep === 1 && (
                <Card>
                    <CardContent className="pt-6">
                        {/* Subject Area Selection */}
                        <div className="mb-0 space-y-6">
                            {/* Primary Subject Area */}
                            <div className="space-y-3">
                                <Label htmlFor="primary-subject-area" className="text-base">Primary Subject Area <span className="text-destructive">*</span></Label>
                                <p className="text-sm text-muted-foreground">Choose the primary area that best fits your submission.</p>

                                {subjectAreas && subjectAreas.length > 0 ? (
                                    <Select
                                        value={primarySubjectAreaId || undefined}
                                        onValueChange={(value) => setPrimarySubjectAreaId(value)}
                                    >
                                        <SelectTrigger id="primary-subject-area" className="bg-background">
                                            <SelectValue placeholder="Select primary subject area" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjectAreas.map((sa) => (
                                                <SelectItem key={sa.id} value={sa.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        {sa.parentId !== null && <Layers className="h-3 w-3 text-muted-foreground ml-2" />}
                                                        <span>{sa.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 font-medium">
                                        No subject areas are available for this track. Please ask the organizer to create subject areas first.
                                    </div>
                                )}
                            </div>

                            {/* Secondary Subject Areas */}
                            {subjectAreas && subjectAreas.length > 0 && (
                                <div className="space-y-3">
                                    <Label htmlFor="secondary-subject-areas" className="text-base">Secondary Subject Areas</Label>
                                    <p className="text-sm text-muted-foreground">Optionally, choose other relevant areas.</p>
                                    <AntdSelect
                                        mode="multiple"
                                        className="w-full text-base"
                                        placeholder="Select secondary subject areas"
                                        value={secondarySubjectAreaIds}
                                        onChange={(val) => setSecondarySubjectAreaIds(val)}
                                        options={subjectAreas
                                            // Optional: Don't show primary area in secondary list
                                            .filter(sa => sa.id.toString() !== primarySubjectAreaId)
                                            .map((sa) => ({ 
                                                label: sa.name, 
                                                value: sa.id 
                                            }))}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        {primarySubjectAreaId && <div className="border-t my-8" />}

                        {/* Form */}
                        {primarySubjectAreaId ? (
                            <FormRenderer
                                definitionJson={definitionJson}
                                onSubmit={handleFormSubmit}
                                isSubmitting={submitting}
                            />
                        ) : (
                            subjectAreas && subjectAreas.length > 0 && (
                                <div className="text-center py-12 mt-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                    Please select a Primary Subject Area above to start filling out your submission.
                                </div>
                            )
                        )}
                    </CardContent>
                </Card>
            )}

            {currentStep === 2 && createdPaperId > 0 && (
                <StepAddAuthors
                    paperId={createdPaperId}
                    paperTitle={createdPaperTitle}
                    onNext={() => navigateToStep(3)}
                />
            )}

            {currentStep === 3 && createdPaperId > 0 && (
                <StepUploadManuscript
                    paperId={createdPaperId}
                    paperTitle={createdPaperTitle}
                    conferenceId={conferenceId}
                />
            )}
        </div>
    )
}
