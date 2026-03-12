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
    FieldLegend,
    FieldSet,
} from "@/components/ui/field"

interface AddTrackProps {
    initialData?: TrackData
    onSubmit: (data: TrackData) => void
}

export function AddTrack({ initialData, onSubmit }: AddTrackProps) {
    const [errors, setErrors] = useState<Record<string, string>>({})

    const [formData, setFormData] = useState<TrackData>(
        initialData ?? {
            name: "",
            description: "",
            maxSubmissions: "",
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
        if (!formData.maxSubmissions || Number(formData.maxSubmissions) <= 0)
            newErrors.maxSubmissions = "Max submissions must be a positive number."
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit}>
            <FieldSet>
                <FieldLegend className="text-lg">Track Information</FieldLegend>

                <FieldGroup>
                    {/* Name + Max Submissions – 2 columns */}
                    <div className="grid gap-6 sm:grid-cols-2">
                        <Field data-invalid={!!errors.name || undefined}>
                            <FieldLabel htmlFor="name" className="text-base font-semibold">
                                Track Name
                            </FieldLabel>
                            <Input
                                id="name"
                                className="h-12 text-base"
                                placeholder="e.g. Main Research Track"
                                value={formData.name}
                                onChange={handleChange}
                                aria-invalid={!!errors.name}
                            />
                            {errors.name && <FieldError>{errors.name}</FieldError>}
                        </Field>

                        <Field data-invalid={!!errors.maxSubmissions || undefined}>
                            <FieldLabel htmlFor="maxSubmissions" className="text-base font-semibold">
                                Max Submissions
                            </FieldLabel>
                            <Input
                                id="maxSubmissions"
                                type="number"
                                className="h-12 text-base"
                                placeholder="e.g. 100"
                                value={formData.maxSubmissions}
                                onChange={handleChange}
                                aria-invalid={!!errors.maxSubmissions}
                            />
                            {errors.maxSubmissions && (
                                <FieldError>{errors.maxSubmissions}</FieldError>
                            )}
                        </Field>
                    </div>

                    {/* Description – full width */}
                    <Field>
                        <FieldLabel htmlFor="description" className="text-base font-semibold">
                            Description
                        </FieldLabel>
                        <Textarea
                            id="description"
                            className="min-h-[100px] text-base"
                            placeholder="Describe the track topics and scope..."
                            rows={3}
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </Field>
                </FieldGroup>
            </FieldSet>

            <div className="mt-10 flex items-center justify-end gap-4">
                <Button type="submit" size="lg" className="text-base px-8">
                    Save Track
                </Button>
            </div>
        </form>
    )
}
