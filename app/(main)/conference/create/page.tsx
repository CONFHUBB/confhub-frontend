"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ConferenceForm } from "./conference-form"
import { ConferenceImport } from "./conference-import"
import { createConference } from "@/app/api/conference.api"
import toast from "react-hot-toast"
import type { ConferenceData } from "@/types/conference-form"

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

type TabMode = "form" | "import"

export default function CreateConferencePage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activeTab, setActiveTab] = useState<TabMode>("form")
    const [backendFieldErrors, setBackendFieldErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        const token = localStorage.getItem('accessToken')
        if (!token) {
            router.push('/auth/login')
        }
    }, [router])


    const handleConferenceSubmit = async (data: ConferenceData, pendingBannerFile?: File) => {
        setIsSubmitting(true)
        setBackendFieldErrors({})

        try {
            // Create conference first (without banner if file is pending)
            const conferenceResult = await createConference({
                ...data,
                bannerImageUrl: pendingBannerFile ? '' : data.bannerImageUrl,
                startDate: data.startDate ? new Date(data.startDate).toISOString() : "",
                endDate: data.endDate ? new Date(data.endDate).toISOString() : "",
                societySponsor: data.societySponsor.join(", "),
            })
            const conferenceId = conferenceResult.id

            // Upload banner after conference is created (now we have an ID)
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
                    // Non-critical: conference created, banner upload failed
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
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex w-full flex-col gap-8 rounded-xl border bg-card p-6 shadow-sm bg-gray-50">
                <div className="relative mb-2">
                    <div className="absolute -left-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="relative z-10">
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">Conference</span>
                        </h2>
                        <p className="mt-2 text-base text-slate-500 dark:text-slate-400 font-medium">
                            Fill in the details manually or import from an Excel file to set up quickly.
                        </p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-1 rounded-lg bg-gray-200 p-1">
                    <button
                        type="button"
                        className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "form"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                        onClick={() => setActiveTab("form")}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Manual Input
                        </span>
                    </button>
                    <button
                        type="button"
                        className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "import"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                        onClick={() => setActiveTab("import")}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Import from Excel
                        </span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="pt-2">
                    {activeTab === "form" ? (
                        <ConferenceForm
                            initialData={null}
                            onSubmit={handleConferenceSubmit}
                            isSubmitting={isSubmitting}
                            backendErrors={backendFieldErrors}
                        />
                    ) : (
                        <ConferenceImport />
                    )}
                </div>
            </div>
        </div>
    )
}
