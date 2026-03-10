"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConferenceForm } from "./conference-form"
import { createConference } from "@/app/api/conference.api"
import toast from "react-hot-toast"
import type { ConferenceData } from "@/types/conference-form"

export default function CreateConferencePage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleConferenceSubmit = async (data: ConferenceData) => {
        setIsSubmitting(true)

        try {
            const conferenceResult = await createConference({
                ...data,
                startDate: data.startDate ? new Date(data.startDate).toISOString() : "",
                endDate: data.endDate ? new Date(data.endDate).toISOString() : "",
                paperDeadline: data.paperDeadline ? new Date(data.paperDeadline).toISOString() : "",
                cameraReadyDeadline: data.cameraReadyDeadline ? new Date(data.cameraReadyDeadline).toISOString() : "",
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
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex w-full flex-col gap-8 rounded-xl border bg-card p-6 shadow-sm bg-gray-50">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Create Conference</h2>
                    <p className="mt-1 text-muted-foreground">
                        Fill in the basic details below to create a new conference. You can configure more details in the next step.
                    </p>
                </div>

                <div className="pt-2">
                    <ConferenceForm
                        initialData={null}
                        onSubmit={handleConferenceSubmit}
                        isSubmitting={isSubmitting}
                    />
                </div>
            </div>
        </div>
    )
}
