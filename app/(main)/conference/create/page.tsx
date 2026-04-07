"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ConferenceForm } from "./conference-form"
import { ConferenceImport } from "./conference-import"
import { SetupWizard } from "./setup-wizard"
import { createConference } from "@/app/api/conference.api"
import { toast } from 'sonner'
import type { ConferenceData } from "@/types/conference-form"
import { getToken } from '@/lib/auth'
import { Sparkles, Upload } from 'lucide-react'

const FRIENDLY_FIELD_LABEL: Record<string, string> = {
    startDate: "Start date",
    endDate: "End date",
    websiteUrl: "Website URL",
    bannerImageUrl: "Banner image URL",
    acronym: "Short name",
    chairEmails: "Chair emails",
    contactInformation: "Contact information",
}

const normalizeFieldKey = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ""
    return trimmed.includes(".") ? trimmed.split(".").pop() || trimmed : trimmed
}

const humanizeField = (field: string) => {
    if (!field) return "Field"
    if (FRIENDLY_FIELD_LABEL[field]) return FRIENDLY_FIELD_LABEL[field]
    return field
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase())
}

const parseConferenceCreateError = (error: any): { message: string; fieldErrors: Record<string, string> } => {
    const data = error?.response?.data
    const message = data?.message || data?.detail || data?.error || ""
    const fieldErrors: Record<string, string> = {}

    const appendFieldError = (field: string, msg: string) => {
        const key = normalizeFieldKey(field)
        if (!key || !msg || fieldErrors[key]) return
        fieldErrors[key] = msg
    }

    if (Array.isArray(data?.errors)) {
        for (const item of data.errors) {
            const field = item?.field || item?.name || item?.property || ""
            const msg = item?.defaultMessage || item?.message || item?.reason || ""
            appendFieldError(field, msg)
        }
    }

    if (data?.fieldErrors && typeof data.fieldErrors === "object") {
        for (const [field, msg] of Object.entries(data.fieldErrors)) {
            if (typeof msg === "string") appendFieldError(field, msg)
        }
    }

    if (Object.keys(fieldErrors).length === 0 && typeof message === "string" && message) {
        const regex = /on field '([^']+)'.*?default message \[([^\]]+)\]/g
        let match: RegExpExecArray | null
        while ((match = regex.exec(message)) !== null) {
            appendFieldError(match[1], match[2])
        }
    }

    const firstFieldError = Object.entries(fieldErrors)[0]
    if (firstFieldError) {
        const [field, msg] = firstFieldError
        return { message: `${humanizeField(field)}: ${msg}`, fieldErrors }
    }

    if (typeof message === "string" && message.trim()) {
        return { message: message.trim(), fieldErrors }
    }

    return { message: "Failed to create conference. Please review your input and try again.", fieldErrors }
}

type TabMode = "wizard" | "import"

const TABS = [
    { id: 'wizard' as const, label: 'Quick Setup', icon: Sparkles, description: 'Guided step-by-step' },
    { id: 'import' as const, label: 'Import Excel', icon: Upload, description: 'Bulk import from spreadsheet' },
]

export default function CreateConferencePage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activeTab, setActiveTab] = useState<TabMode>("wizard")
    const [backendFieldErrors, setBackendFieldErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (!getToken()) {
            router.push('/auth/login')
        }
    }, [router])

    const handleConferenceSubmit = async (data: ConferenceData, pendingBannerFile?: File) => {
        setIsSubmitting(true)
        setBackendFieldErrors({})

        try {
            const conferenceResult = await createConference({
                ...data,
                bannerImageUrl: pendingBannerFile ? '' : data.bannerImageUrl,
                startDate: data.startDate ? new Date(data.startDate).toISOString() : "",
                endDate: data.endDate ? new Date(data.endDate).toISOString() : "",
                societySponsor: data.societySponsor.join(", "),
            })
            const conferenceId = conferenceResult.id

            if (pendingBannerFile && conferenceId) {
                try {
                    const { uploadBannerImage, updateConference } = await import('@/app/api/conference.api')
                    const bannerUrl = await uploadBannerImage(conferenceId, pendingBannerFile)
                    await updateConference(conferenceId, {
                        ...data,
                        id: conferenceId,
                        bannerImageUrl: bannerUrl,
                        startDate: data.startDate ? new Date(data.startDate).toISOString() : "",
                        endDate: data.endDate ? new Date(data.endDate).toISOString() : "",
                        societySponsor: data.societySponsor.join(", "),
                    })
                } catch {
                    toast.error("Conference created but banner upload failed. You can re-upload later.")
                }
            }

            toast.success("Conference created! Proceeding to configuration...")
            router.push(`/conference/${conferenceId}/update`)
        } catch (error: any) {
            console.error("Failed to create conference:", error)
            const parsed = parseConferenceCreateError(error)
            setBackendFieldErrors(parsed.fieldErrors)
            toast.error(parsed.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="page-wide">
            <div className="flex w-full flex-col gap-8 rounded-xl border bg-card p-6 shadow-sm bg-gray-50">
                <div className="relative mb-2">
                    <div className="absolute -left-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="relative z-10">
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Create <span className="text-primary">Conference</span>
                        </h2>
                        <p className="mt-2 text-base text-slate-500 dark:text-slate-400 font-medium">
                            Follow the guided setup to create your conference in minutes.
                        </p>
                    </div>
                </div>

                {/* Tab Switcher — 3 modes */}
                <div className="flex gap-1 rounded-lg bg-gray-200 p-1">
                    {TABS.map(tab => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
                                    activeTab === tab.id
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                }`}
                                onClick={() => setActiveTab(tab.id)}
                                aria-label={tab.label}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </span>
                                {activeTab === tab.id && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{tab.description}</p>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Tab Content */}
                <div className="pt-2">
                    {activeTab === "wizard" && (
                        <SetupWizard
                            onSubmit={handleConferenceSubmit}
                            isSubmitting={isSubmitting}
                            backendErrors={backendFieldErrors}
                        />
                    )}

                    {activeTab === "import" && (
                        <ConferenceImport />
                    )}
                </div>
            </div>
        </div>
    )
}
