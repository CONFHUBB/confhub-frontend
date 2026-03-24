"use client"

import { useState } from "react"
import type { TrackData } from "@/types/conference-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldSet,
} from "@/components/ui/field"
import { ExcelImport } from "@/components/excel-import"
import { downloadTrackTemplate, previewTrackImport, importTracks } from "@/app/api/conference.api"
import { Plus, FileSpreadsheet, UserPlus } from "lucide-react"

interface AddTrackProps {
    initialData?: TrackData
    conferenceId: number
    onSubmit: (data: TrackData) => void
    onImportSuccess?: () => void
}

type AddTab = 'manual' | 'import'

export function AddTrack({ initialData, conferenceId, onSubmit, onImportSuccess }: AddTrackProps) {
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [activeTab, setActiveTab] = useState<AddTab>('manual')

    const [formData, setFormData] = useState<TrackData>(
        initialData ?? {
            name: "",
            description: "",
        }
    )

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { id, value } = e.target
        setFormData((prev) => ({ ...prev, [id]: value }))
        if (errors[id]) {
            setErrors((prev) => {
                const next = { ...prev }
                delete next[id]
                return next
            })
        }
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}
        if (!formData.name.trim()) newErrors.name = "Track name is required."
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        onSubmit(formData)
        setFormData({ name: "", description: "" })
    }

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            {/* Section heading */}
            <div className="px-6 pt-5 pb-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Add Tracks
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Add tracks manually or bulk import from an Excel file.
                </p>
            </div>

            {/* Tab buttons */}
            <div className="flex gap-1 border-b pb-0 px-6">
                <button
                    onClick={() => setActiveTab('manual')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        activeTab === 'manual'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                    }`}
                >
                    <UserPlus className="h-4 w-4" />
                    Add Manually
                </button>
                <button
                    onClick={() => setActiveTab('import')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        activeTab === 'import'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                    }`}
                >
                    <FileSpreadsheet className="h-4 w-4" />
                    Import Excel
                </button>
            </div>

            {/* Tab content */}
            <div className="p-6">
                {activeTab === 'manual' && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Fill in the details below to create a new track.
                        </p>
                        <form onSubmit={handleSubmit}>
                            <FieldSet>
                                <FieldGroup>
                                    <div className="grid gap-6 sm:grid-cols-2">
                                        <Field data-invalid={!!errors.name || undefined}>
                                            <FieldLabel htmlFor="name" className="text-sm font-medium">
                                                Track Name <span className="text-red-500">*</span>
                                            </FieldLabel>
                                            <Input
                                                id="name"
                                                className="h-10"
                                                placeholder="e.g. Main Research Track"
                                                value={formData.name}
                                                onChange={handleChange}
                                            />
                                            {errors.name && <FieldError>{errors.name}</FieldError>}
                                        </Field>
                                    </div>

                                    <Field>
                                        <FieldLabel htmlFor="description" className="text-sm font-medium">
                                            Description
                                        </FieldLabel>
                                        <Textarea
                                            id="description"
                                            className="min-h-[80px]"
                                            placeholder="Describe the track topics and scope..."
                                            rows={3}
                                            value={formData.description}
                                            onChange={handleChange}
                                        />
                                    </Field>
                                </FieldGroup>
                            </FieldSet>

                            <div className="mt-4 flex justify-end">
                                <Button type="submit" size="sm" className="px-6">
                                    Save Track
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'import' && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Upload an Excel file to batch-create multiple tracks at once.
                        </p>
                        <ExcelImport
                            entityName="Track"
                            previewHeaders={["name", "description"]}
                            onDownloadTemplate={() => downloadTrackTemplate(conferenceId)}
                            onPreview={(file) => previewTrackImport(conferenceId, file)}
                            onImport={(file) => importTracks(conferenceId, file)}
                            onImportSuccess={() => onImportSuccess?.()}
                            templateFilename="track_template.xlsx"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
