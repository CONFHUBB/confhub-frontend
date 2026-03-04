"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConferenceForm } from "./conference-form"
import { AddTrack } from "./add-track"
import { AddTopic } from "./add-topic"
import { AssignRole } from "./assign-role"
import { ConferenceTemplate } from "./conference-template"
import { ReviewType } from "./review-type"
import { createConference, createTrack } from "@/app/api/conference.api"
import { createTopic } from "@/app/api/topic.api"
import { assignRole } from "@/app/api/user.api"
import { createTemplate } from "@/app/api/template.api"
import { createReviewType } from "@/app/api/review-type.api"
import { sendEmail } from "@/app/api/email.api"
import toast from "react-hot-toast"
import type {
    ConferenceData,
    TrackData,
    TopicData,
    TrackWithTopics,
    RoleAssignmentData,
    TemplateData,
    ReviewTypeData,
    DefaultTrackDates,
} from "@/types/conference-form"

type Step = "conference" | "track" | "topic" | "assign-role" | "template" | "review-type"

const STEP_LABELS: Record<Step, string> = {
    conference: "Conference",
    track: "Tracks",
    topic: "Topics",
    "assign-role": "Roles",
    template: "Templates",
    "review-type": "Review",
}

const STEPS: Step[] = ["conference", "track", "topic", "assign-role", "template", "review-type"]

export default function CreateConferencePage() {
    const router = useRouter()
    const [step, setStep] = useState<Step>("conference")

    const [conferenceData, setConferenceData] = useState<ConferenceData | null>(null)
    const [tracksWithTopics, setTracksWithTopics] = useState<TrackWithTopics[]>([])
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1)
    const [defaultTrackDates, setDefaultTrackDates] = useState<DefaultTrackDates | null>(null)
    const [roleAssignments, setRoleAssignments] = useState<RoleAssignmentData[]>([])
    const [templates, setTemplates] = useState<TemplateData[]>([])
    const [reviewTypeData, setReviewTypeData] = useState<ReviewTypeData | null>(null)

    const [isSubmitting, setIsSubmitting] = useState(false)

    // --- Step Navigation ---
    const goBack = () => {
        const currentIndex = STEPS.indexOf(step)
        if (currentIndex > 0) {
            setStep(STEPS[currentIndex - 1])
        }
    }

    // --- Step Handlers ---

    const handleConferenceSubmit = (data: ConferenceData) => {
        setConferenceData(data)
        setStep("track")
    }

    const handleTrackSubmit = (data: TrackData) => {
        const dates: DefaultTrackDates = {
            submissionStart: data.submissionStart,
            submissionEnd: data.submissionEnd,
            registrationStart: data.registrationStart,
            registrationEnd: data.registrationEnd,
            cameraReadyStart: data.cameraReadyStart,
            cameraReadyEnd: data.cameraReadyEnd,
            biddingStart: data.biddingStart,
            biddingEnd: data.biddingEnd,
            reviewStart: data.reviewStart,
            reviewEnd: data.reviewEnd,
        }
        setDefaultTrackDates(dates)

        if (currentTrackIndex >= 0 && currentTrackIndex < tracksWithTopics.length) {
            setTracksWithTopics((prev) => {
                const updated = [...prev]
                updated[currentTrackIndex] = { ...updated[currentTrackIndex], track: data }
                return updated
            })
        } else {
            const newIndex = tracksWithTopics.length
            setTracksWithTopics((prev) => [...prev, { track: data, topics: [] }])
            setCurrentTrackIndex(newIndex)
        }

        setStep("topic")
    }

    const handleTopicSubmit = (topics: TopicData[]) => {
        setTracksWithTopics((prev) => {
            const updated = [...prev]
            if (currentTrackIndex >= 0 && currentTrackIndex < updated.length) {
                updated[currentTrackIndex] = { ...updated[currentTrackIndex], topics }
            }
            return updated
        })
        setStep("assign-role")
    }

    const handleAddAnotherTrack = (topics: TopicData[]) => {
        // Save current topics first
        setTracksWithTopics((prev) => {
            const updated = [...prev]
            if (currentTrackIndex >= 0 && currentTrackIndex < updated.length) {
                updated[currentTrackIndex] = { ...updated[currentTrackIndex], topics }
            }
            return updated
        })
        // Start a new track (will use defaultTrackDates)
        setCurrentTrackIndex(-1)
        setStep("track")
    }

    const handleRoleAssignmentsSubmit = (assignments: RoleAssignmentData[]) => {
        setRoleAssignments(assignments)
        setStep("template")
    }

    const handleTemplatesSubmit = (templateData: TemplateData[]) => {
        setTemplates(templateData)
        setStep("review-type")
    }

    const handleFinalSubmit = async (data: ReviewTypeData) => {
        setReviewTypeData(data)
        setIsSubmitting(true)

        try {
            // 1. Create conference
            const conferenceResult = await createConference({
                ...conferenceData!,
                startDate: new Date(conferenceData!.startDate).toISOString(),
                endDate: new Date(conferenceData!.endDate).toISOString(),
            })
            const conferenceId = conferenceResult.id
            toast.success("Conference created!")

            for (const { track, topics } of tracksWithTopics) {
                const trackResult = await createTrack({
                    name: track.name,
                    description: track.description,
                    conferenceId,
                    submissionStart: new Date(track.submissionStart).toISOString(),
                    submissionEnd: new Date(track.submissionEnd).toISOString(),
                    registrationStart: new Date(track.registrationStart).toISOString(),
                    registrationEnd: new Date(track.registrationEnd).toISOString(),
                    cameraReadyStart: new Date(track.cameraReadyStart).toISOString(),
                    cameraReadyEnd: new Date(track.cameraReadyEnd).toISOString(),
                    biddingStart: new Date(track.biddingStart).toISOString(),
                    biddingEnd: new Date(track.biddingEnd).toISOString(),
                    reviewStart: new Date(track.reviewStart).toISOString(),
                    reviewEnd: new Date(track.reviewEnd).toISOString(),
                    maxSubmissions: Number(track.maxSubmissions),
                })
                toast.success(`Track "${track.name}" created!`)

                if (topics.length > 0) {
                    await Promise.all(
                        topics.map((t) =>
                            createTopic({
                                trackId: trackResult.id,
                                title: t.title,
                                description: t.description,
                            })
                        )
                    )
                    toast.success(`${topics.length} topic(s) added to "${track.name}"`)
                }

                const internalRoles = roleAssignments.filter((a) => !a.isExternal && a.userId && a.role)
                if (internalRoles.length > 0) {
                    await Promise.all(
                        internalRoles.map((a) =>
                            assignRole({
                                userId: Number(a.userId),
                                conferenceId,
                                trackId: trackResult.id,
                                assignedRole: a.role,
                            })
                        )
                    )
                }
            }
            if (roleAssignments.filter((a) => !a.isExternal && a.userId && a.role).length > 0) {
                toast.success("Roles assigned!")
            }

            const emailAssignments = roleAssignments.filter((a) => a.externalEmail && a.role)
            if (emailAssignments.length > 0) {
                const invitationTemplate = templates.find(
                    (t) => t.templateType.toUpperCase() === "INVITATION"
                )

                const replaceVariables = (text: string, vars: Record<string, string>) => {
                    let result = text
                    for (const [key, value] of Object.entries(vars)) {
                        result = result.replaceAll(`{{${key}}}`, value)
                    }
                    return result
                }

                await Promise.all(
                    emailAssignments.map((a) => {
                        const roleName = a.role.replace(/_/g, " ").toLowerCase()
                        const vars: Record<string, string> = {
                            conferenceName: conferenceData!.name,
                            conferenceAcronym: conferenceData!.acronym,
                            location: conferenceData!.location,
                            startDate: new Date(conferenceData!.startDate).toLocaleDateString(),
                            endDate: new Date(conferenceData!.endDate).toLocaleDateString(),
                            websiteUrl: conferenceData!.websiteUrl || "",
                            roleName,
                            recipientEmail: a.externalEmail,
                        }

                        const subject = invitationTemplate
                            ? replaceVariables(invitationTemplate.subject, vars)
                            : `Invitation: You have been invited as ${roleName} for ${conferenceData!.name}`
                        const text = invitationTemplate
                            ? replaceVariables(invitationTemplate.body, vars)
                            : `You have been invited to ${conferenceData!.name} as ${roleName}.`

                        return sendEmail({ to: a.externalEmail, subject, text })
                    })
                )
                toast.success(`${emailAssignments.length} invitation email(s) sent!`)
            }

            if (templates.length > 0) {
                const validTemplates = templates.filter((t) => t.templateType && t.subject && t.body)
                if (validTemplates.length > 0) {
                    await Promise.all(
                        validTemplates.map((t) =>
                            createTemplate({
                                conferenceId,
                                templateType: t.templateType,
                                subject: t.subject,
                                body: t.body,
                                isDefault: t.isDefault,
                            })
                        )
                    )
                    toast.success("Templates created!")
                }
            }

            if (data.reviewOption) {
                await createReviewType({
                    conferenceId,
                    reviewOption: data.reviewOption,
                    isRebuttal: data.isRebuttal,
                })
                toast.success("Review type configured!")
            }

            toast.success("🎉 Conference setup complete!")
            router.push("/conference")
        } catch (error) {
            console.error("Failed to create conference:", error)
            toast.error("Something went wrong. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const currentStepIndex = STEPS.indexOf(step)

    const getCurrentTrackData = (): TrackData | undefined => {
        if (currentTrackIndex >= 0 && currentTrackIndex < tracksWithTopics.length) {
            return tracksWithTopics[currentTrackIndex].track
        }
        return undefined
    }

    const getCurrentTopics = (): TopicData[] => {
        if (currentTrackIndex >= 0 && currentTrackIndex < tracksWithTopics.length) {
            return tracksWithTopics[currentTrackIndex].topics
        }
        return []
    }

    return (
        <div className="mx-auto w-full max-w-2xl py-6">
            <div className="mb-8">
                {step === "conference" && (
                    <>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Create Conference
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Step 1: Fill in the details below to create a new conference.
                        </p>
                    </>
                )}
                {step === "track" && (
                    <>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Add Track
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Step 2: Add a track to your conference.
                            {tracksWithTopics.length > 0 && (
                                <span className="ml-1 font-medium">
                                    ({tracksWithTopics.length} track{tracksWithTopics.length > 1 ? "s" : ""} added so far)
                                </span>
                            )}
                        </p>
                    </>
                )}
                {step === "topic" && (
                    <>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Add Topics
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Step 3: Add topics for the current track.
                        </p>
                    </>
                )}
                {step === "assign-role" && (
                    <>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Assign Roles
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Step 4: Assign roles to users for this conference.
                        </p>
                    </>
                )}
                {step === "template" && (
                    <>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Configure Templates
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Step 5: Set up email templates for your conference.
                        </p>
                    </>
                )}
                {step === "review-type" && (
                    <>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Review Type
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Step 6: Configure the review type for your conference.
                        </p>
                    </>
                )}

                {/* Step indicator */}
                <div className="mt-4 flex items-center gap-2">
                    {STEPS.map((s, i) => (
                        <div
                            key={s}
                            className={`h-2 flex-1 rounded-full transition-colors ${i <= currentStepIndex ? "bg-primary" : "bg-muted"
                                }`}
                        />
                    ))}
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    {STEPS.map((s) => (
                        <span key={s}>{STEP_LABELS[s]}</span>
                    ))}
                </div>
            </div>

            {step === "conference" && (
                <ConferenceForm
                    initialData={conferenceData}
                    onSubmit={handleConferenceSubmit}
                />
            )}

            {step === "track" && (
                <AddTrack
                    initialData={getCurrentTrackData()}
                    defaultDates={defaultTrackDates}
                    onSubmit={handleTrackSubmit}
                    onBack={goBack}
                />
            )}

            {step === "topic" && (
                <AddTopic
                    initialTopics={getCurrentTopics()}
                    onSubmit={handleTopicSubmit}
                    onAddAnotherTrack={handleAddAnotherTrack}
                    onBack={goBack}
                />
            )}

            {step === "assign-role" && (
                <AssignRole
                    initialAssignments={roleAssignments}
                    onSubmit={handleRoleAssignmentsSubmit}
                    onBack={goBack}
                />
            )}

            {step === "template" && (
                <ConferenceTemplate
                    initialTemplates={templates}
                    onSubmit={handleTemplatesSubmit}
                    onBack={goBack}
                />
            )}

            {step === "review-type" && (
                <ReviewType
                    initialData={reviewTypeData}
                    onSubmit={handleFinalSubmit}
                    onBack={goBack}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    )
}
