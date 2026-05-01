"use client"

import { useState, useEffect } from "react"
import { Loader2, Eye, Edit, Lock, CheckCircle2, Upload, FileText, X, FileUp, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'

import { FormBuilder } from "./form-builder"
import { FormRenderer } from "./form-renderer"
import { getConferenceSubmissionForm, saveConferenceSubmissionForm } from "@/app/api/submission-form.api"
import { getConference, uploadPaperTemplateFile } from "@/app/api/conference.api"
import { FormDefinition } from "@/types/submission-form"

interface SubmissionFormManagerProps {
    conferenceId: number
    onConfigChanged?: () => void
}

export function SubmissionFormManager({ conferenceId, onConfigChanged }: SubmissionFormManagerProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [paperTemplateUrl, setPaperTemplateUrl] = useState<string | null>(null)
    const [pendingTemplateFile, setPendingTemplateFile] = useState<File | null>(null)
    const [templateUploading, setTemplateUploading] = useState(false)
    const [showTemplatePreview, setShowTemplatePreview] = useState(false)
    const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null>(null)

    // Store the raw JSON to pass to FormRenderer (Preview)
    const [definitionJson, setDefinitionJson] = useState<string | null>(null)

    // Store the parsed definition for FormBuilder
    const [formDefinition, setFormDefinition] = useState<FormDefinition | undefined>(undefined)

    // 1. Re-fetch State
    const fetchFormConfig = async () => {
        setIsLoading(true)
        try {
            const config = await getConferenceSubmissionForm(conferenceId)
            if (config && config.definitionJson) {
                setDefinitionJson(config.definitionJson)
                try {
                    const parsed = JSON.parse(config.definitionJson) as FormDefinition
                    setFormDefinition(parsed)
                    // 2. Lock Form Creation & 3. Preview Mode
                    // If data exists, default to preview mode explicitly
                    setIsEditMode(false)
                } catch (e) {
                    console.error("Failed to parse form definition", e)
                    setIsEditMode(true) // Fallback to edit if corrupt
                }
            } else {
                // No form exists yet -> default to Edit mode
                setDefinitionJson(null)
                setFormDefinition(undefined)
                setIsEditMode(true)
            }
        } catch (err) {
            console.error("Error fetching form config:", err)
            toast.error("Failed to load form configuration.")
            setIsEditMode(true) // Fallback so they can try to save
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchFormConfig()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conferenceId])

    const fetchConferenceTemplate = async () => {
        try {
            const conference = await getConference(conferenceId)
            setPaperTemplateUrl(conference.paperTemplateUrl || null)
        } catch (err) {
            console.error("Error fetching conference details:", err)
        }
    }

    useEffect(() => {
        fetchConferenceTemplate()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conferenceId])

    useEffect(() => {
        return () => {
            if (templatePreviewUrl) {
                URL.revokeObjectURL(templatePreviewUrl)
            }
        }
    }, [templatePreviewUrl])

    const handleTemplateSelect = (file: File) => {
        const validTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        const validExt = ['.pdf', '.docx']
        const lowerName = file.name.toLowerCase()
        const hasValidExt = validExt.some(ext => lowerName.endsWith(ext))
        if (!validTypes.includes(file.type) && !hasValidExt) {
            toast.error('Please select a PDF or DOCX file.')
            return
        }
        if (file.size > 20 * 1024 * 1024) {
            toast.error('File must be less than 20MB.')
            return
        }
        if (templatePreviewUrl) {
            URL.revokeObjectURL(templatePreviewUrl)
        }
        setPendingTemplateFile(file)
        if (file.type === 'application/pdf') {
            const url = URL.createObjectURL(file)
            setTemplatePreviewUrl(url)
            setShowTemplatePreview(true)
        } else {
            setTemplatePreviewUrl(null)
            setShowTemplatePreview(false)
        }
    }

    const handleClearTemplateFile = () => {
        if (templatePreviewUrl) {
            URL.revokeObjectURL(templatePreviewUrl)
        }
        setPendingTemplateFile(null)
        setShowTemplatePreview(false)
        setTemplatePreviewUrl(null)
    }

    const handleUploadTemplate = async () => {
        if (!pendingTemplateFile) {
            toast.error('Please choose a file to upload.')
            return
        }
        try {
            setTemplateUploading(true)
            await uploadPaperTemplateFile(conferenceId, pendingTemplateFile)
            handleClearTemplateFile()
            await fetchConferenceTemplate()
            toast.success('Sample manuscript uploaded successfully.')
        } catch (err) {
            console.error("Failed to upload sample manuscript:", err)
            toast.error('Failed to upload sample manuscript. Please try again.')
        } finally {
            setTemplateUploading(false)
        }
    }

    const templateFileName = paperTemplateUrl
        ? decodeURIComponent(paperTemplateUrl.split('/').pop() || 'paper-template')
        : ''

    const templateSection = (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Upload Sample Manuscript</CardTitle>
                <CardDescription>Optional template for authors to download during submission.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {paperTemplateUrl && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="font-medium truncate">{templateFileName}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(paperTemplateUrl, '_blank')}
                        >
                            Download
                        </Button>
                    </div>
                )}

                <div className="space-y-2">
                    <Label>File Name</Label>
                    <div className="flex gap-3 items-center">
                        <div className="flex-1">
                            <label
                                htmlFor="sample-manuscript-upload"
                                className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                            >
                                <FileUp className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    {pendingTemplateFile ? pendingTemplateFile.name : 'Choose file or drag and drop here'}
                                </span>
                            </label>
                            <input
                                id="sample-manuscript-upload"
                                type="file"
                                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                className="hidden"
                                onChange={e => {
                                    const file = e.target.files?.[0]
                                    if (file) handleTemplateSelect(file)
                                }}
                            />
                        </div>
                    </div>

                    {pendingTemplateFile && (
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="font-medium">{pendingTemplateFile.name}</span>
                                <span className="text-muted-foreground">({(pendingTemplateFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {templatePreviewUrl && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowTemplatePreview(!showTemplatePreview)}
                                        className="text-xs gap-1.5"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        {showTemplatePreview ? 'Hide Preview' : 'Preview'}
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={handleClearTemplateFile}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {showTemplatePreview && templatePreviewUrl && (
                        <div className="rounded-lg border overflow-hidden bg-gray-100 dark:bg-gray-900">
                            <iframe
                                src={templatePreviewUrl}
                                className="w-full border-0"
                                style={{ height: '600px' }}
                                title="Sample Manuscript PDF Preview"
                            />
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">PDF or DOCX. Max 20MB. Uploading a new file will replace the current template.</p>
                </div>

                <div className="flex justify-end">
                    <Button
                        type="button"
                        onClick={handleUploadTemplate}
                        disabled={templateUploading || !pendingTemplateFile}
                        className="gap-2"
                    >
                        {templateUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {templateUploading ? 'Uploading...' : 'Upload Sample Manuscript'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )

    const handleSave = async (newDefinitionJson: string) => {
        setIsSaving(true)
        try {
            await saveConferenceSubmissionForm({
                conferenceId,
                definitionJson: newDefinitionJson
            })
            toast.success("Submission form configuration saved successfully!")
            // Trigger workflow refresh in parent if provided
            if (onConfigChanged) onConfigChanged()

            // 1. Re-fetch State sau khi Save xong
            await fetchFormConfig()
        } catch (err) {
            console.error("Failed to save form config:", err)
            toast.error("Failed to save form configuration. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                <p>Loading form configuration...</p>
            </div>
        )
    }

    // ─── Edit Mode ────────────────────────────────────────────────────────────
    if (isEditMode) {
        return (
            <div className="space-y-6">
                {templateSection}
                {/* Header context for edit mode */}
                {definitionJson && (
                    <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-full text-primary">
                                <Edit className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">Edit Mode Active</h3>
                                <p className="text-xs text-muted-foreground">You are modifying the live form configuration.</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsEditMode(false)}>
                            Cancel Editing
                        </Button>
                    </div>
                )}

                <FormBuilder
                    initialDefinition={formDefinition}
                    onSave={handleSave}
                    isSaving={isSaving}
                />
            </div>
        )
    }

    // ─── Preview Mode (Locked / View-only) ────────────────────────────────────
    return (
        <div className="space-y-6">
            {templateSection}
            {/* Lock / Status Banner */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                                Form Configuration Active
                                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none shrink-0">
                                    <Lock className="h-3 w-3 mr-1" /> Locked
                                </Badge>
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                This form is locked. Below is the preview of what authors will see.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setIsEditMode(true)}
                        variant="secondary"
                        className="shrink-0 gap-2 shadow-sm bg-white hover:bg-white/80 border text-primary"
                    >
                        <Edit className="h-4 w-4" /> Edit Configuration
                    </Button>
                </CardContent>
            </Card>

            {/* Preview Wrapper */}
            <div className="relative">
                {/* Absolute label indicating preview */}
                <div className="absolute -top-3 left-4 bg-background px-2 z-10 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Eye className="h-3.5 w-3.5" /> Author Preview Mode
                </div>

                <Card className="border-dashed shadow-sm">
                    <CardContent className="p-6 md:p-8 pt-10 opacity-90 pointer-events-none select-none filter">
                        {/* We use FormRenderer in dummy mode (pointer-events-none) just to show exactly what it looks like */}
                        {definitionJson && (
                            <FormRenderer
                                definitionJson={definitionJson}
                                onSubmit={() => { }}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Overlay to catch clicks and prevent interaction better alongside pointer-events-none */}
                <div className="absolute inset-0 bg-transparent z-20 cursor-not-allowed" title="Preview mode is read-only"></div>
            </div>
        </div>
    )
}

function Badge({ children, className, ...props }: React.ComponentProps<"div"> & { variant?: string }) {
    return (
        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`} {...props}>
            {children}
        </div>
    )
}
