"use client"

import { useState } from "react"
import type { ConferenceData } from "@/types/conference-form"
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
import { CountrySelect } from "@/components/ui/country-select"
import { Select } from "antd"
import { AREA_OPTIONS, SOCIETY_SPONSOR_OPTIONS } from "@/lib/constants/conference-options"

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
            area: "",
            societySponsor: [],
            conferenceIdNumber: "",
            country: "",
            province: "",
            bannerImageUrl: "",
            contactInformation: "",
            chairEmails: "",
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

    const handleSelectChange = (field: string, value: string | string[]) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev }
                delete next[field]
                return next
            })
        }
    }

    // Max length constraints matching DB varchar columns
    const SHORT_MAX = 255
    const LONG_MAX = 1000

    const validate = () => {
        const newErrors: Record<string, string> = {}
        if (!formData.name.trim()) newErrors.name = "Conference name is required."
        if (formData.name.length > SHORT_MAX) newErrors.name = `Name must be ${SHORT_MAX} characters or less.`
        if (!formData.acronym.trim()) newErrors.acronym = "Short name is required."
        if (formData.acronym.length > 20) newErrors.acronym = "Short name must be 20 characters or less."
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
        if (formData.websiteUrl.length > SHORT_MAX) newErrors.websiteUrl = `URL must be ${SHORT_MAX} characters or less.`

        if (
            formData.bannerImageUrl &&
            !/^https?:\/\/.+\..+/.test(formData.bannerImageUrl)
        ) {
            newErrors.bannerImageUrl = "Please enter a valid image URL."
        }
        if (formData.bannerImageUrl.length > SHORT_MAX) newErrors.bannerImageUrl = `Banner URL must be ${SHORT_MAX} characters or less.`

        if (formData.location.length > SHORT_MAX) newErrors.location = `Location must be ${SHORT_MAX} characters or less.`
        if (formData.province.length > SHORT_MAX) newErrors.province = `Province must be ${SHORT_MAX} characters or less.`
        if (formData.conferenceIdNumber.length > SHORT_MAX) newErrors.conferenceIdNumber = `ID number must be ${SHORT_MAX} characters or less.`
        if (formData.contactInformation.length > SHORT_MAX) newErrors.contactInformation = `Contact info must be ${SHORT_MAX} characters or less.`
        if (formData.description.length > LONG_MAX) newErrors.description = `Description must be ${LONG_MAX} characters or less.`
        if (formData.chairEmails.length > LONG_MAX) newErrors.chairEmails = `Chair emails must be ${LONG_MAX} characters or less.`

        // societySponsor is joined with ", " before sending – check combined length
        const sponsorJoined = formData.societySponsor.join(", ")
        if (sponsorJoined.length > SHORT_MAX) newErrors.societySponsor = `Combined sponsors must be ${SHORT_MAX} characters or less. Remove some selections.`

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* ── LEFT COLUMN ── */}
                <div className="space-y-10">
                    {/* ── Section: Basic Conference Information ── */}
                    <section>
                        <div className="mb-5 border-b pb-2">
                            <h3 className="text-lg font-semibold text-primary">Basic conference information</h3>
                        </div>
                        <FieldSet>
                            <FieldGroup>
                                {/* Full name */}
                                <Field data-invalid={!!errors.name || undefined}>
                                    <FieldLabel htmlFor="name" className="text-base font-semibold">
                                        Full name of conference <span className="text-red-500">*</span>
                                    </FieldLabel>
                                    <Input
                                        id="name"
                                        className="h-12 text-base"
                                        placeholder="e.g. First International Workshop on Rodent-Based Computing 2026"
                                        maxLength={SHORT_MAX}
                                        value={formData.name}
                                        onChange={handleChange}
                                    />
                                    {errors.name && <FieldError>{errors.name}</FieldError>}
                                </Field>

                                {/* Short name */}
                                <Field data-invalid={!!errors.acronym || undefined}>
                                    <FieldLabel htmlFor="acronym" className="text-base font-semibold">
                                        Short name of conference <span className="text-red-500">*</span>
                                    </FieldLabel>
                                    <Input
                                        id="acronym"
                                        className="h-12 text-base"
                                        placeholder="e.g. ICC 26 (20 characters or less, including year)"
                                        maxLength={20}
                                        value={formData.acronym}
                                        onChange={handleChange}
                                    />
                                    {errors.acronym && <FieldError>{errors.acronym}</FieldError>}
                                </Field>

                                {/* Area */}
                                <Field data-invalid={!!errors.area || undefined}>
                                    <FieldLabel className="text-base font-semibold">Area</FieldLabel>
                                    <Select
                                        showSearch
                                        optionFilterProp="label"
                                        className="w-full h-12"
                                        placeholder="Select closest topical area"
                                        value={formData.area || undefined}
                                        onChange={(val) => handleSelectChange("area", val)}
                                        options={AREA_OPTIONS.map((a) => ({ label: a, value: a }))}
                                    />
                                    {errors.area && <FieldError>{errors.area}</FieldError>}
                                </Field>

                                {/* Society Sponsor */}
                                <Field data-invalid={!!errors.societySponsor || undefined}>
                                    <FieldLabel className="text-base font-semibold">
                                        Society Sponsor (you can select multiple)
                                    </FieldLabel>
                                    <Select
                                        mode="multiple"
                                        showSearch
                                        optionFilterProp="label"
                                        className="w-full min-h-12"
                                        placeholder="Select society sponsors"
                                        value={formData.societySponsor}
                                        onChange={(val) => handleSelectChange("societySponsor", val)}
                                        options={SOCIETY_SPONSOR_OPTIONS.map((s) => ({
                                            label: s.label,
                                            value: s.value,
                                        }))}
                                    />
                                    {errors.societySponsor && (
                                        <FieldError>{errors.societySponsor}</FieldError>
                                    )}
                                </Field>

                                {/* Conference ID Number */}
                                <Field>
                                    <FieldLabel htmlFor="conferenceIdNumber" className="text-base font-semibold">
                                        Conference identification number
                                    </FieldLabel>
                                    <Input
                                        id="conferenceIdNumber"
                                        className="h-12 text-base"
                                        placeholder="e.g. IEEE Conference Record # from IEEE EuA"
                                        maxLength={SHORT_MAX}
                                        value={formData.conferenceIdNumber}
                                        onChange={handleChange}
                                    />
                                </Field>

                                {/* Description */}
                                <Field data-invalid={!!errors.description || undefined}>
                                    <FieldLabel htmlFor="description" className="text-base font-semibold">
                                        Description
                                    </FieldLabel>
                                    <Textarea
                                        id="description"
                                        className="min-h-[120px] text-base"
                                        placeholder="Briefly describe the goals and scope of the conference..."
                                        rows={5}
                                        maxLength={LONG_MAX}
                                        value={formData.description}
                                        onChange={handleChange}
                                    />
                                    {errors.description && (
                                        <FieldError>{errors.description}</FieldError>
                                    )}
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </section>
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="space-y-10">
                    {/* ── Section: Location ── */}
                    <section>
                        <div className="mb-5 border-b pb-2">
                            <h3 className="text-lg font-semibold text-primary">Location</h3>
                        </div>
                        <FieldSet>
                            <FieldGroup>
                                {/* Location */}
                                <Field data-invalid={!!errors.location || undefined}>
                                    <FieldLabel htmlFor="location" className="text-base font-semibold">
                                        Location of conference
                                    </FieldLabel>
                                    <Input
                                        id="location"
                                        className="h-12 text-base"
                                        placeholder='e.g. Sydney, without country and state name. Use "virtual" for remote/virtual conferences.'
                                        maxLength={SHORT_MAX}
                                        value={formData.location}
                                        onChange={handleChange}
                                    />
                                    {errors.location && (
                                        <FieldError>{errors.location}</FieldError>
                                    )}
                                </Field>

                                {/* Province */}
                                <Field>
                                    <FieldLabel htmlFor="province" className="text-base font-semibold">
                                        Province
                                    </FieldLabel>
                                    <Input
                                        id="province"
                                        className="h-12 text-base"
                                        placeholder="Province or state"
                                        maxLength={SHORT_MAX}
                                        value={formData.province}
                                        onChange={handleChange}
                                    />
                                </Field>

                                {/* Country */}
                                <Field>
                                    <FieldLabel className="text-base font-semibold">
                                        Country where conference is taking place
                                    </FieldLabel>
                                    <CountrySelect
                                        value={formData.country}
                                        onValueChange={(val) => handleSelectChange("country", val)}
                                    />
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </section>

                    {/* ── Section: Web page ── */}
                    <section>
                        <div className="mb-5 border-b pb-2">
                            <h3 className="text-lg font-semibold text-primary">Web page</h3>
                        </div>
                        <FieldSet>
                            <FieldGroup>
                                {/* Website URL */}
                                <Field data-invalid={!!errors.websiteUrl || undefined}>
                                    <FieldLabel htmlFor="websiteUrl" className="text-base font-semibold">
                                        URL for existing conference web site, including http:// or https://
                                    </FieldLabel>
                                    <Input
                                        id="websiteUrl"
                                        type="url"
                                        className="h-12 text-base"
                                        placeholder="https://your-conference-site.com"
                                        maxLength={SHORT_MAX}
                                        value={formData.websiteUrl}
                                        onChange={handleChange}
                                    />
                                    {errors.websiteUrl && (
                                        <FieldError>{errors.websiteUrl}</FieldError>
                                    )}
                                </Field>

                                {/* Banner Image URL */}
                                <Field data-invalid={!!errors.bannerImageUrl || undefined}>
                                    <FieldLabel htmlFor="bannerImageUrl" className="text-base font-semibold">
                                        URL for conference banner image (JPEG, GIF, or PNG)
                                    </FieldLabel>
                                    <Input
                                        id="bannerImageUrl"
                                        type="url"
                                        className="h-12 text-base"
                                        placeholder="https://example.com/banner.png"
                                        maxLength={SHORT_MAX}
                                        value={formData.bannerImageUrl}
                                        onChange={handleChange}
                                    />
                                    {errors.bannerImageUrl && (
                                        <FieldError>{errors.bannerImageUrl}</FieldError>
                                    )}
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </section>

                    {/* ── Section: Contact information ── */}
                    <section>
                        <div className="mb-5 border-b pb-2">
                            <h3 className="text-lg font-semibold text-primary">Contact information</h3>
                        </div>
                        <FieldSet>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="contactInformation" className="text-base font-semibold">
                                        Phone number for conference information
                                    </FieldLabel>
                                    <Input
                                        id="contactInformation"
                                        className="h-12 text-base"
                                        placeholder="e.g. chair, written as +1 900 555 1212"
                                        maxLength={SHORT_MAX}
                                        value={formData.contactInformation}
                                        onChange={handleChange}
                                    />
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </section>

                    {/* ── Section: Dates ── */}
                    <section>
                        <div className="mb-5 border-b pb-2">
                            <h3 className="text-lg font-semibold text-primary">Dates</h3>
                        </div>
                        <FieldSet>
                            <FieldGroup>
                                {/* Start + End Date in 2 cols */}
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <Field data-invalid={!!errors.startDate || undefined}>
                                        <FieldLabel htmlFor="startDate" className="text-base font-semibold">
                                            Start date <span className="text-red-500">*</span>
                                        </FieldLabel>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            className="h-12 text-base"
                                            value={formData.startDate}
                                            onChange={handleChange}
                                        />
                                        {errors.startDate && (
                                            <FieldError>{errors.startDate}</FieldError>
                                        )}
                                    </Field>

                                    <Field data-invalid={!!errors.endDate || undefined}>
                                        <FieldLabel htmlFor="endDate" className="text-base font-semibold">
                                            End date <span className="text-red-500">*</span>
                                        </FieldLabel>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            className="h-12 text-base"
                                            value={formData.endDate}
                                            onChange={handleChange}
                                        />
                                        {errors.endDate && (
                                            <FieldError>{errors.endDate}</FieldError>
                                        )}
                                    </Field>
                                </div>
                            </FieldGroup>
                        </FieldSet>
                    </section>

                    {/* ── Section: Chair email addresses ── */}
                    <section>
                        <div className="mb-5 border-b pb-2">
                            <h3 className="text-lg font-semibold text-primary">Chair email addresses</h3>
                        </div>
                        <FieldSet>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="chairEmails" className="text-base font-semibold">
                                        Chair email addresses, one address per line
                                    </FieldLabel>
                                    <Textarea
                                        id="chairEmails"
                                        className="min-h-[120px] text-base"
                                        placeholder={"chair1@example.com\nchair2@example.com"}
                                        rows={5}
                                        maxLength={LONG_MAX}
                                        value={formData.chairEmails}
                                        onChange={handleChange}
                                    />
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </section>
                </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4 border-t">
                <Button type="submit" size="lg" className="text-base px-8" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Conference"}
                </Button>
            </div>
        </form>
    )
}
