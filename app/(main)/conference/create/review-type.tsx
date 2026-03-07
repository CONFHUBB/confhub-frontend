"use client"

import { useState } from "react"
import type { ReviewTypeData } from "@/types/conference-form"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select } from "antd"
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from "@/components/ui/field"
import { ArrowLeft, Eye, Loader2, MessageSquare } from "lucide-react"

interface ReviewTypeProps {
    initialData: ReviewTypeData | null
    onSubmit: (data: ReviewTypeData) => Promise<void>
    onBack: () => void
    isSubmitting: boolean
}

const REVIEW_OPTIONS = [
    { value: "SINGLE_BLIND", label: "Single Blind", description: "Reviewers know the authors, but authors don't know the reviewers." },
    { value: "DOUBLE_BLIND", label: "Double Blind", description: "Neither authors nor reviewers know each other's identity." },
    { value: "OPEN_REVIEW", label: "Open Review", description: "Both authors and reviewers know each other's identity." },
]

export function ReviewType({ initialData, onSubmit, onBack, isSubmitting }: ReviewTypeProps) {
    const [errors, setErrors] = useState<Record<string, string>>({})

    const [reviewOption, setReviewOption] = useState(initialData?.reviewOption ?? "")
    const [isRebuttal, setIsRebuttal] = useState(initialData?.isRebuttal ?? false)

    const validate = () => {
        const newErrors: Record<string, string> = {}
        if (!reviewOption) newErrors.reviewOption = "Please select a review type."
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        await onSubmit({ reviewOption, isRebuttal })
    }

    const selectedOption = REVIEW_OPTIONS.find((o) => o.value === reviewOption)

    return (
        <form onSubmit={handleSubmit}>
            <FieldSet>
                <FieldLegend>Review Configuration</FieldLegend>
                <FieldDescription>
                    Choose the review type and rebuttal option for your conference.
                </FieldDescription>

                <FieldGroup>
                    {/* Review Option */}
                    <Field data-invalid={!!errors.reviewOption || undefined}>
                        <FieldLabel>
                            <Eye className="size-4" />
                            Review Type
                        </FieldLabel>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            className="w-full h-10"
                            placeholder="Select a review type"
                            value={reviewOption || undefined}
                            onChange={(value: string) => {
                                setReviewOption(value)
                                if (errors.reviewOption) {
                                    setErrors((prev) => {
                                        const next = { ...prev }
                                        delete next.reviewOption
                                        return next
                                    })
                                }
                            }}
                            disabled={isSubmitting}
                            options={REVIEW_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
                        />
                        {selectedOption && (
                            <FieldDescription>
                                {selectedOption.description}
                            </FieldDescription>
                        )}
                        {errors.reviewOption && (
                            <FieldError>{errors.reviewOption}</FieldError>
                        )}
                    </Field>

                    {/* Rebuttal */}
                    <Field>
                        <div className="flex items-center justify-between">
                            <div>
                                <FieldLabel className="mb-0">
                                    <MessageSquare className="size-4" />
                                    Allow Rebuttal
                                </FieldLabel>
                                <FieldDescription>
                                    Enable authors to respond to reviewer comments before the final decision.
                                </FieldDescription>
                            </div>
                            <Switch
                                checked={isRebuttal}
                                onCheckedChange={(checked: boolean) =>
                                    setIsRebuttal(checked)
                                }
                                disabled={isSubmitting}
                            />
                        </div>
                    </Field>
                </FieldGroup>
            </FieldSet>

            <div className="mt-8 flex items-center justify-between gap-4">
                <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                    <ArrowLeft className="mr-2 size-4" />
                    Back
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Creating Conference...
                        </>
                    ) : (
                        "Finish Setup"
                    )}
                </Button>
            </div>
        </form>
    )
}
