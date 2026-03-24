"use client"

import type { ReviewQuestionDTO } from "@/types/track"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select } from "antd"
import { X, Eye } from "lucide-react"

interface ReviewQuestionsPreviewProps {
    open: boolean
    onClose: () => void
    questions: ReviewQuestionDTO[]
}

export function ReviewQuestionsPreview({ open, onClose, questions }: ReviewQuestionsPreviewProps) {
    if (!open) return null

    const renderVisibilityTags = (q: ReviewQuestionDTO) => {
        const tags: string[] = []
        if (q.isRequired) tags.push("Required")
        if (q.lockedForEdit) tags.push("Locked for edit")
        if (q.visibleToOtherReviewers) tags.push("Visible to other reviewers during discussion")
        if (q.visibleToAuthorsDuringFeedback) tags.push("Visible to authors (feedback phase)")
        if (q.visibleToAuthorsAfterNotification) tags.push("Visible to authors (after notification)")
        if (q.visibleToMetaReviewers) tags.push("Visible to meta-reviewers")
        if (q.visibleToSeniorMetaReviewers) tags.push("Visible to senior meta-reviewers")

        if (tags.length === 0) return null

        return (
            <p className="mt-2 text-xs italic text-indigo-600 dark:text-indigo-400">
                [{tags.join(" • ")}]
            </p>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
            <div className="bg-background rounded-xl border shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b shrink-0 bg-muted/20 rounded-t-xl">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <Eye className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-semibold">Review Form Preview</h2>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">This is how reviewers will see the form.</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Body */}
                <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-8 bg-gray-50/50 dark:bg-background">
                    {questions.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            No questions configured for this track yet.
                        </div>
                    ) : (
                        questions.map((q, idx) => (
                            <div key={idx} className="bg-card p-6 rounded-xl border shadow-sm">
                                <div className="mb-4">
                                    <h3 className="text-base font-semibold leading-relaxed">
                                        <span className="text-primary mr-2">{idx + 1}.</span> 
                                        {q.text}
                                        {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                                    </h3>
                                    {q.note && <p className="text-sm text-muted-foreground mt-1.5">{q.note}</p>}
                                </div>

                                <div className="mt-4">
                                    {q.type === "COMMENT" && (
                                        <div className="relative">
                                            <Textarea 
                                                className="min-h-[120px] bg-background" 
                                                placeholder="Reviewer will enter their response here..."
                                                readOnly
                                            />
                                            {q.maxLength && (
                                                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                                    Max {q.maxLength} chars
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {q.type === "AGREEMENT" && (
                                        <div className="flex items-start gap-3 p-4 border rounded-lg bg-background">
                                            <Checkbox id={`preview-agree-${idx}`} disabled />
                                            <label htmlFor={`preview-agree-${idx}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                {q.text}
                                            </label>
                                        </div>
                                    )}

                                    {(q.type === "OPTIONS" || q.type === "OPTIONS_WITH_VALUE") && (
                                        <div className="p-4 border rounded-lg bg-background">
                                            {q.showAs === "RADIO" && (
                                                <div className="space-y-3">
                                                    {q.choices?.map((choice, i) => (
                                                        <div key={i} className="flex items-center space-x-2">
                                                            <input 
                                                                type="radio"
                                                                disabled
                                                                name={`radio-group-${idx}`}
                                                                id={`r-${idx}-${i}`}
                                                                className="h-4 w-4 text-primary border-input focus:ring-primary cursor-not-allowed opacity-70"
                                                            />
                                                            <label htmlFor={`r-${idx}-${i}`} className="text-sm font-medium cursor-not-allowed opacity-70">
                                                                {choice.text} {q.type === "OPTIONS_WITH_VALUE" && <span className="text-muted-foreground ml-1">({choice.value ?? "-"})</span>}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {q.showAs === "CHECKBOX" && (
                                                <div className="space-y-3">
                                                    {q.choices?.map((choice, i) => (
                                                        <div key={i} className="flex items-center space-x-2">
                                                            <Checkbox disabled id={`c-${idx}-${i}`} />
                                                            <label htmlFor={`c-${idx}-${i}`} className="text-sm font-medium">
                                                                {choice.text} {q.type === "OPTIONS_WITH_VALUE" && <span className="text-muted-foreground ml-1">({choice.value ?? "-"})</span>}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {q.showAs === "DROPDOWN" && (
                                                <Select 
                                                    disabled
                                                    placeholder="Select an option"
                                                    className="w-full h-10"
                                                    options={q.choices?.map(c => ({
                                                        label: `${c.text} ${q.type === "OPTIONS_WITH_VALUE" ? `(${c.value ?? "-"})` : ""}`,
                                                        value: c.text
                                                    }))}
                                                />
                                            )}

                                            {q.showAs === "LISTBOX" && (
                                                <Select 
                                                    disabled
                                                    mode="multiple"
                                                    placeholder="Select options"
                                                    className="w-full min-h-10"
                                                    options={q.choices?.map(c => ({
                                                        label: `${c.text} ${q.type === "OPTIONS_WITH_VALUE" ? `(${c.value ?? "-"})` : ""}`,
                                                        value: c.text
                                                    }))}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Visibility Tags */}
                                {renderVisibilityTags(q)}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t flex justify-end shrink-0 bg-background rounded-b-xl">
                    <Button onClick={onClose} size="lg">Close Preview</Button>
                </div>
            </div>
        </div>
    )
}
