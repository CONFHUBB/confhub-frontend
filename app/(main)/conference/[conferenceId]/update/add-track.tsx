"use client"

import { useState } from "react"
import type { TrackData, DefaultTrackDates } from "@/types/conference-form"
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
import { ArrowLeft } from "lucide-react"

interface AddTrackProps {
    initialData?: TrackData
    defaultDates: DefaultTrackDates | null
    onSubmit: (data: TrackData) => void
}

export function AddTrack({ initialData, defaultDates, onSubmit }: AddTrackProps) {
    const [errors, setErrors] = useState<Record<string, string>>({})

    const [formData, setFormData] = useState<TrackData>(
        initialData ?? {
            name: "",
            description: "",
            maxSubmissions: "",
            submissionStart: defaultDates?.submissionStart ?? "",
            submissionEnd: defaultDates?.submissionEnd ?? "",
            biddingStart: defaultDates?.biddingStart ?? "",
            biddingEnd: defaultDates?.biddingEnd ?? "",
            reviewStart: defaultDates?.reviewStart ?? "",
            reviewEnd: defaultDates?.reviewEnd ?? "",
            cameraReadyStart: defaultDates?.cameraReadyStart ?? "",
            cameraReadyEnd: defaultDates?.cameraReadyEnd ?? "",
            registrationStart: defaultDates?.registrationStart ?? "",
            registrationEnd: defaultDates?.registrationEnd ?? "",
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
        if (!formData.submissionStart) newErrors.submissionStart = "Submission start date is required."
        if (!formData.submissionEnd) newErrors.submissionEnd = "Submission end date is required."
        if (!formData.reviewStart) newErrors.reviewStart = "Review start date is required."
        if (!formData.reviewEnd) newErrors.reviewEnd = "Review end date is required."
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
                <FieldDescription className="text-base">
                    Provide the basic information about this track.
                </FieldDescription>

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

            <div className="my-8 border-t" />

            <FieldSet>
                <FieldLegend className="text-lg">Submission Period</FieldLegend>
                <FieldDescription className="text-base">
                    Set the start and end dates for paper submissions.
                </FieldDescription>
                <FieldGroup>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <Field data-invalid={!!errors.submissionStart || undefined}>
                            <FieldLabel htmlFor="submissionStart" className="text-base font-semibold">
                                Submission Start
                            </FieldLabel>
                            <Input
                                id="submissionStart"
                                type="datetime-local"
                                className="h-12 text-base"
                                value={formData.submissionStart}
                                onChange={handleChange}
                                aria-invalid={!!errors.submissionStart}
                            />
                            {errors.submissionStart && (
                                <FieldError>{errors.submissionStart}</FieldError>
                            )}
                        </Field>
                        <Field data-invalid={!!errors.submissionEnd || undefined}>
                            <FieldLabel htmlFor="submissionEnd" className="text-base font-semibold">
                                Submission End
                            </FieldLabel>
                            <Input
                                id="submissionEnd"
                                type="datetime-local"
                                className="h-12 text-base"
                                value={formData.submissionEnd}
                                onChange={handleChange}
                                aria-invalid={!!errors.submissionEnd}
                            />
                            {errors.submissionEnd && (
                                <FieldError>{errors.submissionEnd}</FieldError>
                            )}
                        </Field>
                    </div>
                </FieldGroup>
            </FieldSet>

            <div className="my-8 border-t" />

            <FieldSet>
                <FieldLegend className="text-lg">Bidding Period</FieldLegend>
                <FieldDescription className="text-base">
                    Set the start and end dates for reviewer bidding.
                </FieldDescription>
                <FieldGroup>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <Field data-invalid={!!errors.biddingStart || undefined}>
                            <FieldLabel htmlFor="biddingStart" className="text-base font-semibold">
                                Bidding Start
                            </FieldLabel>
                            <Input
                                id="biddingStart"
                                type="datetime-local"
                                className="h-12 text-base"
                                value={formData.biddingStart}
                                onChange={handleChange}
                                aria-invalid={!!errors.biddingStart}
                            />
                            {errors.biddingStart && (
                                <FieldError>{errors.biddingStart}</FieldError>
                            )}
                        </Field>
                        <Field data-invalid={!!errors.biddingEnd || undefined}>
                            <FieldLabel htmlFor="biddingEnd" className="text-base font-semibold">
                                Bidding End
                            </FieldLabel>
                            <Input
                                id="biddingEnd"
                                type="datetime-local"
                                className="h-12 text-base"
                                value={formData.biddingEnd}
                                onChange={handleChange}
                                aria-invalid={!!errors.biddingEnd}
                            />
                            {errors.biddingEnd && (
                                <FieldError>{errors.biddingEnd}</FieldError>
                            )}
                        </Field>
                    </div>
                </FieldGroup>
            </FieldSet>

            <div className="my-8 border-t" />

            <FieldSet>
                <FieldLegend className="text-lg">Review Period</FieldLegend>
                <FieldDescription className="text-base">
                    Set the start and end dates for the review process.
                </FieldDescription>
                <FieldGroup>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <Field data-invalid={!!errors.reviewStart || undefined}>
                            <FieldLabel htmlFor="reviewStart" className="text-base font-semibold">
                                Review Start
                            </FieldLabel>
                            <Input
                                id="reviewStart"
                                type="datetime-local"
                                className="h-12 text-base"
                                value={formData.reviewStart}
                                onChange={handleChange}
                                aria-invalid={!!errors.reviewStart}
                            />
                            {errors.reviewStart && (
                                <FieldError>{errors.reviewStart}</FieldError>
                            )}
                        </Field>
                        <Field data-invalid={!!errors.reviewEnd || undefined}>
                            <FieldLabel htmlFor="reviewEnd" className="text-base font-semibold">
                                Review End
                            </FieldLabel>
                            <Input
                                id="reviewEnd"
                                type="datetime-local"
                                className="h-12 text-base"
                                value={formData.reviewEnd}
                                onChange={handleChange}
                                aria-invalid={!!errors.reviewEnd}
                            />
                            {errors.reviewEnd && (
                                <FieldError>{errors.reviewEnd}</FieldError>
                            )}
                        </Field>
                    </div>
                </FieldGroup>
            </FieldSet>

            <div className="my-8 border-t" />

            <FieldSet>
                <FieldLegend className="text-lg">Camera-Ready Period</FieldLegend>
                <FieldDescription className="text-base">
                    Set the start and end dates for camera-ready submission.
                </FieldDescription>
                <FieldGroup>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <Field data-invalid={!!errors.cameraReadyStart || undefined}>
                            <FieldLabel htmlFor="cameraReadyStart" className="text-base font-semibold">
                                Camera-Ready Start
                            </FieldLabel>
                            <Input
                                id="cameraReadyStart"
                                type="datetime-local"
                                className="h-12 text-base"
                                value={formData.cameraReadyStart}
                                onChange={handleChange}
                                aria-invalid={!!errors.cameraReadyStart}
                            />
                            {errors.cameraReadyStart && (
                                <FieldError>{errors.cameraReadyStart}</FieldError>
                            )}
                        </Field>
                        <Field data-invalid={!!errors.cameraReadyEnd || undefined}>
                            <FieldLabel htmlFor="cameraReadyEnd" className="text-base font-semibold">
                                Camera-Ready End
                            </FieldLabel>
                            <Input
                                id="cameraReadyEnd"
                                type="datetime-local"
                                className="h-12 text-base"
                                value={formData.cameraReadyEnd}
                                onChange={handleChange}
                                aria-invalid={!!errors.cameraReadyEnd}
                            />
                            {errors.cameraReadyEnd && (
                                <FieldError>{errors.cameraReadyEnd}</FieldError>
                            )}
                        </Field>
                    </div>
                </FieldGroup>
            </FieldSet>

            <div className="my-8 border-t" />

            <FieldSet>
                <FieldLegend className="text-lg">Registration Period</FieldLegend>
                <FieldDescription className="text-base">
                    Set the start and end dates for participant registration.
                </FieldDescription>
                <FieldGroup>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <Field data-invalid={!!errors.registrationStart || undefined}>
                            <FieldLabel htmlFor="registrationStart" className="text-base font-semibold">
                                Registration Start
                            </FieldLabel>
                            <Input
                                id="registrationStart"
                                type="datetime-local"
                                className="h-12 text-base"
                                value={formData.registrationStart}
                                onChange={handleChange}
                                aria-invalid={!!errors.registrationStart}
                            />
                            {errors.registrationStart && (
                                <FieldError>{errors.registrationStart}</FieldError>
                            )}
                        </Field>
                        <Field data-invalid={!!errors.registrationEnd || undefined}>
                            <FieldLabel htmlFor="registrationEnd" className="text-base font-semibold">
                                Registration End
                            </FieldLabel>
                            <Input
                                id="registrationEnd"
                                type="datetime-local"
                                className="h-12 text-base"
                                value={formData.registrationEnd}
                                onChange={handleChange}
                                aria-invalid={!!errors.registrationEnd}
                            />
                            {errors.registrationEnd && (
                                <FieldError>{errors.registrationEnd}</FieldError>
                            )}
                        </Field>
                    </div>
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
