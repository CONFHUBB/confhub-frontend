'use client'

import { useState, useRef, useEffect } from 'react'
import type { ConferenceData } from '@/types/conference-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field'
import { CountrySelect } from '@/components/ui/country-select'
import { Select } from 'antd'
import { AREA_OPTIONS, SOCIETY_SPONSOR_OPTIONS } from '@/lib/constants/conference-options'
import { toast } from 'sonner'
import {
    Upload, X, ImageIcon, ArrowLeft, ArrowRight, Check, Sparkles,
    Building2, MapPin, Globe, Calendar, Mail, Phone, FileText, Info
} from 'lucide-react'
import { V } from '@/lib/validation'
import { cn } from '@/lib/utils'

// ── Step Configuration ──────────────────────────────────────────────────────

const STEPS = [
    {
        id: 'basics',
        title: 'Conference Basics',
        description: 'Name, area, and description',
        icon: Building2,
        hint: 'Start with the essential identity of your conference.',
    },
    {
        id: 'location',
        title: 'Location & Dates',
        description: 'Where and when',
        icon: MapPin,
        hint: 'Where will your conference take place?',
    },
    {
        id: 'web',
        title: 'Web & Media',
        description: 'Website and banner image',
        icon: Globe,
        hint: 'Make your conference discoverable online.',
    },
    {
        id: 'contacts',
        title: 'Contacts & Review',
        description: 'Chair emails and final check',
        icon: Mail,
        hint: 'Almost there! Add contact info and review.',
    },
] as const

type StepId = typeof STEPS[number]['id']

interface SetupWizardProps {
    onSubmit: (data: ConferenceData, pendingBannerFile?: File) => void | Promise<void>
    isSubmitting?: boolean
    backendErrors?: Record<string, string>
}

// ── Max lengths ──────────────────────────────────────────────────────────────

const SHORT_MAX = 255
const LONG_MAX = 1000

function CustomStepIcon(props: any) {
    const { active, completed, icon } = props;
    const stepDef = STEPS[Number(icon) - 1];
    const IconComponent = stepDef ? stepDef.icon : Check;

    return (
        <div
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${active
                ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-200 scale-110'
                : completed
                    ? 'border-indigo-500 bg-indigo-500 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                }`}
        >
            {completed ? <Check className="h-5 w-5" /> : <IconComponent className="h-5 w-5" />}
        </div>
    );
}

// ── Component ────────────────────────────────────────────────────────────────

export function SetupWizard({ onSubmit, isSubmitting, backendErrors }: SetupWizardProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [visited, setVisited] = useState<Set<number>>(new Set([0]))
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null)
    const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null)

    const [formData, setFormData] = useState<ConferenceData>({
        name: '',
        acronym: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        websiteUrl: '',
        area: '',
        societySponsor: [],
        country: '',
        province: '',
        bannerImageUrl: '',
        contactInformation: '',
        chairEmails: '',
    })

    // Cleanup ObjectURL
    useEffect(() => {
        return () => {
            if (bannerPreviewUrl && bannerPreviewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(bannerPreviewUrl)
            }
        }
    }, [bannerPreviewUrl])

    // Merge backend errors
    useEffect(() => {
        if (!backendErrors || Object.keys(backendErrors).length === 0) return
        setErrors(prev => ({ ...prev, ...backendErrors }))
    }, [backendErrors])

    // ── Handlers ──

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target
        setFormData(prev => ({ ...prev, [id]: value }))
        if (errors[id]) {
            setErrors(prev => { const next = { ...prev }; delete next[id]; return next })
        }
    }

    const handleSelectChange = (field: string, value: string | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => { const next = { ...prev }; delete next[field]; return next })
        }
    }

    const handleBannerFileSelect = (file: File) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif']
        if (!validTypes.includes(file.type)) {
            toast.error('Please select a JPEG, PNG, or GIF image.')
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image must be less than 10MB.')
            return
        }
        if (bannerPreviewUrl && bannerPreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(bannerPreviewUrl)
        }
        const previewUrl = URL.createObjectURL(file)
        setPendingBannerFile(file)
        setBannerPreviewUrl(previewUrl)
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

    // ── Step validation ──

    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {}

        if (step === 0) { // Basics
            if (!formData.name.trim()) newErrors.name = 'Conference name is required.'
            if (formData.name.length > SHORT_MAX) newErrors.name = `Name must be ${SHORT_MAX} characters or less.`
            if (!formData.acronym.trim()) newErrors.acronym = 'Short name is required.'
            if (formData.acronym.length > 20) newErrors.acronym = 'Short name must be 20 characters or less.'
            if (formData.description.length > LONG_MAX) newErrors.description = `Description must be ${LONG_MAX} characters or less.`
        }

        if (step === 1) { // Location & Dates
            if (!formData.location.trim()) newErrors.location = 'Location is required.'
            if (formData.location.length > SHORT_MAX) newErrors.location = `Location must be ${SHORT_MAX} characters or less.`
            if (!formData.startDate) newErrors.startDate = 'Start date is required.'
            if (!formData.endDate) newErrors.endDate = 'End date is required.'
            if (formData.startDate && !newErrors.startDate) {
                const startYear = new Date(formData.startDate).getFullYear()
                if (startYear > 9999) newErrors.startDate = 'Year must be 4 digits or less.'
                const startTs = new Date(formData.startDate).getTime()
                if (!Number.isNaN(startTs) && startTs <= Date.now()) {
                    newErrors.startDate = 'Start date must be in the future.'
                }
            }
            if (formData.endDate && !newErrors.endDate) {
                const endYear = new Date(formData.endDate).getFullYear()
                if (endYear > 9999) newErrors.endDate = 'Year must be 4 digits or less.'
            }
            if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
                newErrors.endDate = 'End date must be after start date.'
            }
        }

        if (step === 2) { // Web & Media
            if (formData.websiteUrl && !/^https?:\/\/.+\..+/.test(formData.websiteUrl)) {
                newErrors.websiteUrl = 'Please enter a valid URL (e.g. https://example.com).'
            }
            if (formData.bannerImageUrl && !pendingBannerFile && !/^https?:\/\/.+\..+/.test(formData.bannerImageUrl)) {
                newErrors.bannerImageUrl = 'Please enter a valid image URL.'
            }
        }

        if (step === 3) { // Contacts
            if (formData.contactInformation && V.phone(formData.contactInformation)) {
                newErrors.contactInformation = 'Invalid phone format.'
            }
            if (formData.chairEmails) {
                const emailErr = V.emailList(formData.chairEmails)
                if (emailErr) newErrors.chairEmails = emailErr
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }))
            const firstError = Object.values(newErrors)[0]
            toast.error(firstError)
            return false
        }
        return true
    }

    const goNext = () => {
        if (!validateStep(currentStep)) return
        const nextStep = Math.min(currentStep + 1, STEPS.length - 1)
        setCurrentStep(nextStep)
        setVisited(prev => new Set(prev).add(nextStep))
    }

    const goPrev = () => {
        setCurrentStep(Math.max(currentStep - 1, 0))
    }

    const goToStep = (step: number) => {
        // Can go back freely; going forward requires validation
        if (step < currentStep) {
            setCurrentStep(step)
            return
        }
        // Validate all steps between current and target
        for (let i = currentStep; i < step; i++) {
            if (!validateStep(i)) return
        }
        setCurrentStep(step)
        setVisited(prev => new Set(prev).add(step))
    }

    const handleSubmit = () => {
        // Validate all steps
        for (let i = 0; i < STEPS.length; i++) {
            if (!validateStep(i)) {
                setCurrentStep(i)
                return
            }
        }
        onSubmit(formData, pendingBannerFile ?? undefined)
    }

    const isLastStep = currentStep === STEPS.length - 1
    const progress = ((currentStep + 1) / STEPS.length) * 100

    // ── Render ──

    return (
        <div className="space-y-8">
            {/* ── Progress Stepper ── */}
            <div className="w-full">
                <div className="flex items-center justify-between">
                    {STEPS.map((step, idx) => {
                        const isClickable = visited.has(idx) || idx <= currentStep
                        const isCompleted = idx < currentStep
                        const isActive = idx === currentStep

                        return (
                            <div key={step.id} className="flex items-center flex-1 last:flex-initial">
                                {/* Step circle + label */}
                                <button
                                    type="button"
                                    onClick={() => isClickable && goToStep(idx)}
                                    disabled={!isClickable}
                                    className="flex flex-col items-center gap-2 group cursor-pointer disabled:cursor-not-allowed"
                                >
                                    <CustomStepIcon active={isActive} completed={isCompleted} icon={idx + 1} />
                                    <div className="text-center">
                                        <p className={cn(
                                            'text-xs font-semibold transition-colors',
                                            isActive ? 'text-indigo-600' : isCompleted ? 'text-indigo-500' : 'text-gray-400'
                                        )}>
                                            {step.title}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">
                                            {step.description}
                                        </p>
                                    </div>
                                </button>
                                {/* Connector line */}
                                {idx < STEPS.length - 1 && (
                                    <div className="flex-1 mx-3 mt-[-24px]">
                                        <div className={cn(
                                            'h-0.5 w-full rounded-full transition-colors',
                                            idx < currentStep ? 'bg-indigo-500' : 'bg-gray-200'
                                        )} />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ── Step Hint ── */}
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
                <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                <p className="text-sm text-indigo-700">{STEPS[currentStep].hint}</p>
            </div>

            {/* ── Step Content ── */}
            <div className="min-h-[320px]">
                {/* Step 1: Basics */}
                {currentStep === 0 && (
                    <div className="space-y-6">
                        <FieldSet>
                            <FieldGroup>
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
                                        autoFocus
                                    />
                                    {errors.name && <FieldError>{errors.name}</FieldError>}
                                </Field>

                                <Field data-invalid={!!errors.acronym || undefined}>
                                    <FieldLabel htmlFor="acronym" className="text-base font-semibold">
                                        Short name (acronym) <span className="text-red-500">*</span>
                                    </FieldLabel>
                                    <Input
                                        id="acronym"
                                        className="h-12 text-base"
                                        placeholder="e.g. ICC 26 (20 characters or less)"
                                        maxLength={20}
                                        value={formData.acronym}
                                        onChange={handleChange}
                                    />
                                    {errors.acronym && <FieldError>{errors.acronym}</FieldError>}
                                </Field>

                                <div className="grid gap-6 sm:grid-cols-2">
                                    <Field>
                                        <FieldLabel className="text-base font-semibold">Area</FieldLabel>
                                        <Select
                                            showSearch
                                            optionFilterProp="label"
                                            className="w-full h-12"
                                            placeholder="Select topical area"
                                            value={formData.area || undefined}
                                            onChange={val => handleSelectChange('area', val)}
                                            options={AREA_OPTIONS.map(a => ({ label: a, value: a }))}
                                        />
                                    </Field>

                                    <Field>
                                        <FieldLabel className="text-base font-semibold">
                                            Society Sponsor
                                        </FieldLabel>
                                        <Select
                                            mode="multiple"
                                            showSearch
                                            optionFilterProp="label"
                                            className="w-full min-h-12"
                                            placeholder="Select sponsors"
                                            value={formData.societySponsor}
                                            onChange={val => handleSelectChange('societySponsor', val)}
                                            options={SOCIETY_SPONSOR_OPTIONS.map(s => ({ label: s.label, value: s.value }))}
                                        />
                                    </Field>
                                </div>

                                <Field data-invalid={!!errors.description || undefined}>
                                    <FieldLabel htmlFor="description" className="text-base font-semibold">
                                        Description
                                    </FieldLabel>
                                    <Textarea
                                        id="description"
                                        className="min-h-[120px] text-base"
                                        placeholder="Briefly describe the goals and scope of the conference..."
                                        rows={4}
                                        maxLength={LONG_MAX}
                                        value={formData.description}
                                        onChange={handleChange}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">{formData.description.length}/{LONG_MAX}</p>
                                    {errors.description && <FieldError>{errors.description}</FieldError>}
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </div>
                )}

                {/* Step 2: Location & Dates */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <FieldSet>
                            <FieldGroup>
                                <Field data-invalid={!!errors.location || undefined}>
                                    <FieldLabel htmlFor="location" className="text-base font-semibold">
                                        Location of conference <span className="text-red-500">*</span>
                                    </FieldLabel>
                                    <Input
                                        id="location"
                                        className="h-12 text-base"
                                        placeholder='e.g. Sydney, or "virtual" for remote conferences'
                                        maxLength={SHORT_MAX}
                                        value={formData.location}
                                        onChange={handleChange}
                                        autoFocus
                                    />
                                    {errors.location && <FieldError>{errors.location}</FieldError>}
                                </Field>

                                <div className="grid gap-6 sm:grid-cols-2">
                                    <Field>
                                        <FieldLabel htmlFor="province" className="text-base font-semibold">
                                            Province / State
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

                                    <Field>
                                        <FieldLabel className="text-base font-semibold">Country</FieldLabel>
                                        <CountrySelect
                                            value={formData.country}
                                            onValueChange={val => handleSelectChange('country', val)}
                                        />
                                    </Field>
                                </div>

                                <div className="grid gap-6 sm:grid-cols-2">
                                    <Field data-invalid={!!errors.startDate || undefined}>
                                        <FieldLabel htmlFor="startDate" className="text-base font-semibold">
                                            <Calendar className="h-4 w-4 inline mr-1.5" />
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
                                        {errors.startDate && <FieldError>{errors.startDate}</FieldError>}
                                    </Field>

                                    <Field data-invalid={!!errors.endDate || undefined}>
                                        <FieldLabel htmlFor="endDate" className="text-base font-semibold">
                                            <Calendar className="h-4 w-4 inline mr-1.5" />
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
                                        {errors.endDate && <FieldError>{errors.endDate}</FieldError>}
                                    </Field>
                                </div>
                            </FieldGroup>
                        </FieldSet>
                    </div>
                )}

                {/* Step 3: Web & Media */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        <FieldSet>
                            <FieldGroup>
                                <Field data-invalid={!!errors.websiteUrl || undefined}>
                                    <FieldLabel htmlFor="websiteUrl" className="text-base font-semibold">
                                        <Globe className="h-4 w-4 inline mr-1.5" />
                                        Conference website URL
                                    </FieldLabel>
                                    <Input
                                        id="websiteUrl"
                                        type="url"
                                        className="h-12 text-base"
                                        placeholder="https://your-conference-site.com"
                                        maxLength={SHORT_MAX}
                                        value={formData.websiteUrl}
                                        onChange={handleChange}
                                        autoFocus
                                    />
                                    {errors.websiteUrl && <FieldError>{errors.websiteUrl}</FieldError>}
                                </Field>

                                <Field data-invalid={!!errors.bannerImageUrl || undefined}>
                                    <FieldLabel className="text-base font-semibold">
                                        <ImageIcon className="h-4 w-4 inline mr-1.5" />
                                        Conference banner image
                                    </FieldLabel>

                                    {/* Banner preview */}
                                    {(bannerPreviewUrl || (formData.bannerImageUrl && !formData.bannerImageUrl.startsWith('[pending'))) && (
                                        <div className="relative mt-2 mb-3 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                            <img
                                                src={bannerPreviewUrl || formData.bannerImageUrl}
                                                alt="Banner preview"
                                                className="w-full h-48 object-cover"
                                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                            />
                                            <button
                                                type="button"
                                                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                                                onClick={handleRemoveBanner}
                                                aria-label="Remove banner image"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                            {pendingBannerFile && (
                                                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1.5">
                                                    <ImageIcon className="h-3 w-3" />
                                                    {pendingBannerFile.name} — will be uploaded on save
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <Input
                                            id="bannerImageUrl"
                                            type={pendingBannerFile ? 'text' : 'url'}
                                            className="h-12 text-base flex-1"
                                            placeholder="https://example.com/banner.png or upload →"
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
                                            onChange={e => {
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
                                    <p className="text-xs text-muted-foreground mt-1">JPEG, PNG or GIF. Max 10MB.</p>
                                    {errors.bannerImageUrl && <FieldError>{errors.bannerImageUrl}</FieldError>}
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                    </div>
                )}

                {/* Step 4: Contacts & Review */}
                {currentStep === 3 && (
                    <div className="space-y-6">
                        <FieldSet>
                            <FieldGroup>
                                <Field data-invalid={!!errors.contactInformation || undefined}>
                                    <FieldLabel htmlFor="contactInformation" className="text-base font-semibold">
                                        <Phone className="h-4 w-4 inline mr-1.5" />
                                        Contact phone number
                                    </FieldLabel>
                                    <Input
                                        id="contactInformation"
                                        className="h-12 text-base"
                                        placeholder="e.g. +1 900 555 1212"
                                        maxLength={SHORT_MAX}
                                        value={formData.contactInformation}
                                        onChange={handleChange}
                                        autoFocus
                                    />
                                    {errors.contactInformation && <FieldError>{errors.contactInformation}</FieldError>}
                                </Field>

                                <Field data-invalid={!!errors.chairEmails || undefined}>
                                    <FieldLabel htmlFor="chairEmails" className="text-base font-semibold">
                                        <Mail className="h-4 w-4 inline mr-1.5" />
                                        Chair email addresses
                                    </FieldLabel>
                                    <Textarea
                                        id="chairEmails"
                                        className="min-h-[100px] text-base"
                                        placeholder={"chair1@example.com\nchair2@example.com"}
                                        rows={4}
                                        maxLength={LONG_MAX}
                                        value={formData.chairEmails}
                                        onChange={handleChange}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">One email per line</p>
                                    {errors.chairEmails && <FieldError>{errors.chairEmails}</FieldError>}
                                </Field>
                            </FieldGroup>
                        </FieldSet>

                        {/* Review summary */}
                        <div className="rounded-xl border bg-gray-50 p-5 space-y-3">
                            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-indigo-500" />
                                Review Summary
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">Conference Name</p>
                                    <p className="font-medium truncate">{formData.name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Acronym</p>
                                    <p className="font-medium">{formData.acronym || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Location</p>
                                    <p className="font-medium">{formData.location || '—'}{formData.country ? `, ${formData.country}` : ''}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Dates</p>
                                    <p className="font-medium">
                                        {formData.startDate ? new Date(formData.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                        {' → '}
                                        {formData.endDate ? new Date(formData.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                    </p>
                                </div>
                                {formData.area && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Area</p>
                                        <p className="font-medium">{formData.area}</p>
                                    </div>
                                )}
                                {formData.websiteUrl && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Website</p>
                                        <p className="font-medium truncate text-indigo-600">{formData.websiteUrl}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Navigation Footer ── */}
            <div className="flex items-center justify-between pt-4 border-t">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={goPrev}
                    disabled={currentStep === 0}
                    className="gap-2"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    Step {currentStep + 1} of {STEPS.length}
                </div>

                {isLastStep ? (
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg"
                        size="lg"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Conference'}
                        {!isSubmitting && <Sparkles className="h-4 w-4" />}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={goNext}
                        className="gap-2"
                    >
                        Next <ArrowRight className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
