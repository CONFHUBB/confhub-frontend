"use client"

import { useState, useRef, useEffect } from "react"
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
import { toast } from 'sonner'
import { Upload, Loader2, X, ImageIcon } from "lucide-react"
import { V } from "@/lib/validation"

interface ConferenceFormProps {
    initialData: ConferenceData | null
    onSubmit: (data: ConferenceData, pendingBannerFile?: File) => void | Promise<void>
    isSubmitting?: boolean
    submitLabel?: string
    conferenceId?: number
    backendErrors?: Record<string, string>
}

export function ConferenceForm({ initialData, onSubmit, isSubmitting, submitLabel, conferenceId, backendErrors }: ConferenceFormProps) {
    const isEditMode = !!initialData
    const [errors, setErrors] = useState<Record<string, string>>({})
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null)
    const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null)

    // Cleanup ObjectURL on unmount or when preview changes
    useEffect(() => {
        return () => {
            if (bannerPreviewUrl && bannerPreviewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(bannerPreviewUrl)
            }
        }
    }, [bannerPreviewUrl])

    useEffect(() => {
        if (!backendErrors || Object.keys(backendErrors).length === 0) return
        setErrors((prev) => ({ ...prev, ...backendErrors }))
    }, [backendErrors])

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
    const LONG_MAX = 2000

    const validate = () => {
        const newErrors: Record<string, string> = {}
        if (!formData.name.trim()) newErrors.name = "Conference name is required."
        if (formData.name.length > SHORT_MAX) newErrors.name = `Name must be ${SHORT_MAX} characters or less.`
        if (!formData.acronym.trim()) newErrors.acronym = "Short name is required."
        if (formData.acronym.length > 20) newErrors.acronym = "Short name must be 20 characters or less."
        if (!formData.location.trim()) newErrors.location = "Location is required."
        if (!formData.startDate) newErrors.startDate = "Start date is required."
        if (!formData.endDate) newErrors.endDate = "End date is required."
        if (formData.startDate && !newErrors.startDate) {
            const startYear = new Date(formData.startDate).getFullYear()
            if (startYear > 9999) newErrors.startDate = "Year must be 4 digits or less."
            const startTs = new Date(formData.startDate).getTime()
            if (!Number.isNaN(startTs) && startTs <= Date.now()) {
                newErrors.startDate = "Start date must be in the future."
            }
        }
        if (formData.endDate && !newErrors.endDate) {
            const endYear = new Date(formData.endDate).getFullYear()
            if (endYear > 9999) newErrors.endDate = "Year must be 4 digits or less."
        }
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

        // Only validate URL format if user typed a URL (not using file upload)
        if (
            formData.bannerImageUrl &&
            !pendingBannerFile &&
            !/^https?:\/\/.+\..+/.test(formData.bannerImageUrl)
        ) {
            newErrors.bannerImageUrl = "Please enter a valid image URL."
        }
        // Skip length check if there's a pending file (URL will be generated by backend)
        if (!pendingBannerFile && formData.bannerImageUrl.length > SHORT_MAX) newErrors.bannerImageUrl = `Banner URL must be ${SHORT_MAX} characters or less.`

        if (formData.location.length > SHORT_MAX) newErrors.location = `Location must be ${SHORT_MAX} characters or less.`
        if (formData.province.length > SHORT_MAX) newErrors.province = `Province must be ${SHORT_MAX} characters or less.`

        if (formData.contactInformation.length > SHORT_MAX) newErrors.contactInformation = `Contact info must be ${SHORT_MAX} characters or less.`
        if (formData.contactInformation && V.phone(formData.contactInformation)) newErrors.contactInformation = 'Invalid phone format. Use digits, +, -, spaces (7–20 chars).'
        if (formData.description.length > LONG_MAX) newErrors.description = `Description must be ${LONG_MAX} characters or less.`
        if (formData.chairEmails.length > LONG_MAX) newErrors.chairEmails = `Chair emails must be ${LONG_MAX} characters or less.`
        if (formData.chairEmails && !newErrors.chairEmails) {
            const emailErr = V.emailList(formData.chairEmails)
            if (emailErr) newErrors.chairEmails = emailErr
        }

        // societySponsor is joined with ", " before sending – check combined length
        const sponsorJoined = formData.societySponsor.join(", ")
        if (sponsorJoined.length > SHORT_MAX) newErrors.societySponsor = `Combined sponsors must be ${SHORT_MAX} characters or less. Remove some selections.`

        if (Object.keys(newErrors).length > 0) {
            console.log("Validation failed with errors:", newErrors)
            const firstError = Object.values(newErrors)[0]
            toast.error(`Validation failed: ${firstError}`)
            setErrors(newErrors)
            return false
        }
        
        setErrors({})
        return true
    }

    const handleBannerFileSelect = (file: File) => {
        // Validate file type & size
        const validTypes = ['image/jpeg', 'image/png', 'image/gif']
        if (!validTypes.includes(file.type)) {
            toast.error('Please select a JPEG, PNG, or GIF image.')
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image must be less than 10MB.')
            return
        }
        // Revoke old preview
        if (bannerPreviewUrl && bannerPreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(bannerPreviewUrl)
        }
        const previewUrl = URL.createObjectURL(file)
        setPendingBannerFile(file)
        setBannerPreviewUrl(previewUrl)
        // Set a placeholder in formData so validation knows an image is pending
        setFormData(prev => ({ ...prev, bannerImageUrl: `[pending upload] ${file.name}` }))
        setErrors(prev => { const next = { ...prev }; delete next.bannerImageUrl; return next })
    }

    const handleRemoveBanner = () => {
        if (bannerPreviewUrl && bannerPreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(bannerPreviewUrl)
        }
        setPendingBannerFile(null)
        setBannerPreviewUrl(null)
        setFormData(prev => ({ ...prev, bannerImageUrl: '' }))
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        onSubmit(formData, pendingBannerFile ?? undefined)
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* ── LEFT COLUMN ── */}
                <div className="space-y-10">
                    {/* ── Section: Basic Conference Information ── */}
                    <section>
                        <div className="mb-5 border-b pb-2">
                            <h3 className="text-lg font-semibold text-indigo-700">Basic conference information</h3>
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
                            <h3 className="text-lg font-semibold text-indigo-700">Location</h3>
                        </div>
                        <FieldSet>
                            <FieldGroup>
                                {/* Location */}
                                <Field data-invalid={!!errors.location || undefined}>
                                    <FieldLabel htmlFor="location" className="text-base font-semibold">
                                        Location of conference <span className="text-red-500">*</span>
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
                            <h3 className="text-lg font-semibold text-indigo-700">Web page</h3>
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

                                {/* Banner Image */}
                                <Field data-invalid={!!errors.bannerImageUrl || undefined}>
                                    <FieldLabel htmlFor="bannerImageUrl" className="text-base font-semibold">
                                        Conference banner image (JPEG, GIF, or PNG)
                                    </FieldLabel>

                                    {/* Preview area */}
                                    {(bannerPreviewUrl || (formData.bannerImageUrl && !formData.bannerImageUrl.startsWith('[pending'))) && (
                                        <div className="relative mt-2 mb-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                            <img
                                                src={bannerPreviewUrl || formData.bannerImageUrl}
                                                alt="Banner preview"
                                                className="w-full h-40 object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                                                onClick={handleRemoveBanner}
                                                title="Remove banner image"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                            {pendingBannerFile && (
                                                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1.5">
                                                    <ImageIcon className="h-3 w-3" />
                                                    {pendingBannerFile.name} — will be uploaded when you save
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <Input
                                            id="bannerImageUrl"
                                            type={pendingBannerFile ? "text" : "url"}
                                            className="h-12 text-base flex-1"
                                            placeholder="https://example.com/banner.png or upload a file →"
                                            maxLength={SHORT_MAX}
                                            value={pendingBannerFile ? `📎 ${pendingBannerFile.name}` : formData.bannerImageUrl}
                                            onChange={handleChange}
                                            disabled={!!pendingBannerFile}
                                        />
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/gif"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) handleBannerFileSelect(file)
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-12 px-4 shrink-0"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="h-4 w-4 mr-2" /> {pendingBannerFile ? 'Change' : 'Upload'}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Image will be uploaded to cloud when you save. Max 10MB.</p>
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
                            <h3 className="text-lg font-semibold text-indigo-700">Contact information</h3>
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
                            <h3 className="text-lg font-semibold text-indigo-700">Dates</h3>
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
                                            max="9999-12-31"
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
                                            max="9999-12-31"
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
                            <h3 className="text-lg font-semibold text-indigo-700">Chair email addresses</h3>
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
                    {isSubmitting 
                        ? (isEditMode ? "Saving..." : "Creating...") 
                        : (submitLabel || (isEditMode ? "Save Changes" : "Create Conference"))}
                </Button>
            </div>
        </form>
    )
}
