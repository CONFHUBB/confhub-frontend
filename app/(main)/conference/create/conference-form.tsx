"use client"

import { useState } from "react"
import type { ConferenceData } from "@/types/conference-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from "@/components/ui/field"

interface ConferenceFormProps {
    initialData: ConferenceData | null
    onSubmit: (data: ConferenceData) => void
    isSubmitting?: boolean
}

export function ConferenceForm({ initialData, onSubmit, isSubmitting }: ConferenceFormProps) {
    const [errors, setErrors] = useState<Record<string, string>>({})

    const [formData, setFormData] = useState<ConferenceData>(
        initialData ?? {
            name: "",
            acronym: "",
            description: "",
            location: "",
            startDate: "",
            endDate: "",
            websiteUrl: "",
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
        if (!formData.name.trim()) newErrors.name = "Conference name is required."
        if (!formData.acronym.trim()) newErrors.acronym = "Acronym is required."
        if (!formData.description.trim())
            newErrors.description = "Description is required."
        if (!formData.location.trim()) newErrors.location = "Location is required."
        if (!formData.startDate) newErrors.startDate = "Start date is required."
        if (!formData.endDate) newErrors.endDate = "End date is required."
        if (
            formData.startDate &&
            formData.endDate &&
            new Date(formData.endDate) < new Date(formData.startDate)
        ) {
            newErrors.endDate = "End date must be after start date."
        }

        if (
            formData.websiteUrl &&
            !/^https?:\/\/.+\..+/.test(formData.websiteUrl)
        ) {
            newErrors.websiteUrl = "Please enter a valid URL (e.g. https://example.com)."
        }
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
                <FieldGroup>
                    {/* Conference Full Name – full width */}
                    <Field data-invalid={!!errors.name || undefined}>
                        <FieldLabel htmlFor="name" className="text-base font-semibold">
                            Conference Full Name
                        </FieldLabel>
                        <Input
                            id="name"
                            className="h-12 text-base"
                            placeholder="e.g. International Conference on Artificial Intelligence 2024"
                            value={formData.name}
                            onChange={handleChange}
                            aria-invalid={!!errors.name}
                        />
                        {errors.name && <FieldError>{errors.name}</FieldError>}
                    </Field>

                    {/* Acronym + Location – 2 columns */}
                    <div className="grid gap-6 sm:grid-cols-2">
                        <Field data-invalid={!!errors.acronym || undefined}>
                            <FieldLabel htmlFor="acronym" className="text-base font-semibold">
                                Acronym
                            </FieldLabel>
                            <Input
                                id="acronym"
                                className="h-12 text-base"
                                placeholder="e.g. ICAI-24"
                                value={formData.acronym}
                                onChange={handleChange}
                                aria-invalid={!!errors.acronym}
                            />
                            {errors.acronym && (
                                <FieldError>{errors.acronym}</FieldError>
                            )}
                        </Field>

                        <Field data-invalid={!!errors.location || undefined}>
                            <FieldLabel htmlFor="location" className="text-base font-semibold">
                                Location
                            </FieldLabel>
                            <Input
                                id="location"
                                className="h-12 text-base"
                                placeholder="City, Country or Remote"
                                value={formData.location}
                                onChange={handleChange}
                                aria-invalid={!!errors.location}
                            />
                            {errors.location && (
                                <FieldError>{errors.location}</FieldError>
                            )}
                        </Field>
                    </div>

                    {/* Description – full width */}
                    <Field data-invalid={!!errors.description || undefined}>
                        <FieldLabel htmlFor="description" className="text-base font-semibold">
                            Description
                        </FieldLabel>
                        <Textarea
                            id="description"
                            className="min-h-[120px] text-base"
                            placeholder="Briefly describe the goals and scope of the conference..."
                            rows={5}
                            value={formData.description}
                            onChange={handleChange}
                            aria-invalid={!!errors.description}
                        />
                        {errors.description && (
                            <FieldError>{errors.description}</FieldError>
                        )}
                    </Field>

                    {/* Start Date + End Date – 2 columns */}
                    <div className="grid gap-6 sm:grid-cols-2">
                        <Field data-invalid={!!errors.startDate || undefined}>
                            <FieldLabel htmlFor="startDate" className="text-base font-semibold">
                                Start Date
                            </FieldLabel>
                            <Input
                                id="startDate"
                                type="datetime-local"
                                className="h-12 text-base"
                                value={formData.startDate}
                                onChange={handleChange}
                                aria-invalid={!!errors.startDate}
                            />
                            {errors.startDate && (
                                <FieldError>{errors.startDate}</FieldError>
                            )}
                        </Field>

                        <Field data-invalid={!!errors.endDate || undefined}>
                            <FieldLabel htmlFor="endDate" className="text-base font-semibold">
                                End Date
                            </FieldLabel>
                            <Input
                                id="endDate"
                                type="datetime-local"
                                className="h-12 text-base"
                                value={formData.endDate}
                                onChange={handleChange}
                                aria-invalid={!!errors.endDate}
                            />
                            {errors.endDate && (
                                <FieldError>{errors.endDate}</FieldError>
                            )}
                        </Field>
                    </div>

                    {/* Website URL – full width */}
                    <Field data-invalid={!!errors.websiteUrl || undefined}>
                        <FieldLabel htmlFor="websiteUrl" className="text-base font-semibold">
                            Website URL
                        </FieldLabel>
                        <Input
                            id="websiteUrl"
                            type="url"
                            className="h-12 text-base"
                            placeholder="https://your-conference-site.com"
                            value={formData.websiteUrl}
                            onChange={handleChange}
                            aria-invalid={!!errors.websiteUrl}
                        />
                        {errors.websiteUrl && (
                            <FieldError>{errors.websiteUrl}</FieldError>
                        )}
                    </Field>
                </FieldGroup>
            </FieldSet>

            <div className="mt-10 flex items-center justify-end gap-4">
                <Button type="submit" size="lg" className="text-base px-8" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Conference"}
                </Button>
            </div>
        </form>
    )
}
