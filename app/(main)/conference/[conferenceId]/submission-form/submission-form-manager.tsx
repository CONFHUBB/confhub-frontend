"use client"

import { useState, useEffect } from "react"
import { Loader2, Eye, Edit, Lock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import toast from "react-hot-toast"

import { FormBuilder } from "./form-builder"
import { FormRenderer } from "./form-renderer"
import { getConferenceSubmissionForm, saveConferenceSubmissionForm } from "@/app/api/submission-form.api"
import { FormDefinition } from "@/types/submission-form"

interface SubmissionFormManagerProps {
    conferenceId: number
    onConfigChanged?: () => void
}

export function SubmissionFormManager({ conferenceId, onConfigChanged }: SubmissionFormManagerProps) {
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    
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
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                                onSubmit={() => {}} 
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
