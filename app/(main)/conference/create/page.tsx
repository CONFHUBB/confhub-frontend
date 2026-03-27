"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ConferenceForm } from "./conference-form"
import { ConferenceImport } from "./conference-import"
import { createConference } from "@/app/api/conference.api"
import toast from "react-hot-toast"
import type { ConferenceData } from "@/types/conference-form"

type TabMode = "form" | "import"

export default function CreateConferencePage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activeTab, setActiveTab] = useState<TabMode>("form")

    useEffect(() => {
        const token = localStorage.getItem('accessToken')
        if (!token) {
            router.push('/auth/login')
        }
    }, [router])


    const handleConferenceSubmit = async (data: ConferenceData) => {
        setIsSubmitting(true)

        try {
            const conferenceResult = await createConference({
                ...data,
                startDate: data.startDate ? new Date(data.startDate).toISOString() : "",
                endDate: data.endDate ? new Date(data.endDate).toISOString() : "",
                societySponsor: data.societySponsor.join(", "),
            })
            const conferenceId = conferenceResult.id
            toast.success("Conference created! Proceeding to configuration...")
            router.push(`/conference/${conferenceId}/update`)
        } catch (error) {
            console.error("Failed to create conference:", error)
            toast.error("Something went wrong. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex w-full flex-col gap-8 rounded-xl border bg-card p-6 shadow-sm bg-gray-50">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Create Conference</h2>
                    <p className="mt-1 text-muted-foreground">
                        Fill in the details manually or import from an Excel file to set up quickly.
                    </p>
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
                        />
                    ) : (
                        <ConferenceImport />
                    )}
                </div>
            </div>
        </div>
    )
}
