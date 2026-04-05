"use client"

import { useEffect, useState, useCallback } from "react"
import { getReviewById, getAnswersByReview, getReviewQuestionsByTrack } from "@/app/api/review.api"
import type { ReviewResponse, ReviewAnswerResponse } from "@/types/review"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, FileText, Check, X, AlertTriangle } from "lucide-react"
import { UserLink } from '@/components/shared/user-link'
import { reviewStatusClass, getReviewStatus } from '@/lib/constants/status'

interface ReviewQuestion {
    id: number
    trackId: number
    text: string
    note?: string
    type: "COMMENT" | "AGREEMENT" | "OPTIONS" | "OPTIONS_WITH_VALUE"
    orderIndex: number
    maxLength?: number
    isRequired: boolean
    choices?: { id: number; text: string; value: number; orderIndex: number }[]
}



interface ReviewDetailDialogProps {
    reviewId: number | null
    open: boolean
    onClose: () => void
}

export function ReviewDetailDialog({ reviewId, open, onClose }: ReviewDetailDialogProps) {
    const [review, setReview] = useState<ReviewResponse | null>(null)
    const [questions, setQuestions] = useState<ReviewQuestion[]>([])
    const [answers, setAnswers] = useState<Map<number, { value: string; choiceId: number | null }>>(new Map())
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        if (!reviewId) return
        try {
            setLoading(true)
            const reviewData = await getReviewById(reviewId)
            setReview(reviewData)

            // Fetch review questions by track
            const trackId = reviewData.paper?.trackId
            if (trackId) {
                const questionsData = await getReviewQuestionsByTrack(trackId)
                const sorted = [...(questionsData || [])].sort(
                    (a: ReviewQuestion, b: ReviewQuestion) => a.orderIndex - b.orderIndex
                )
                setQuestions(sorted)
            }

            // Fetch existing answers
            const answersData: ReviewAnswerResponse[] = await getAnswersByReview(reviewId).catch(() => [])
            const answersMap = new Map<number, { value: string; choiceId: number | null }>()
            answersData.forEach((a) => {
                answersMap.set(a.questionId, {
                    value: a.answerValue || "",
                    choiceId: a.selectedChoiceId,
                })
            })
            setAnswers(answersMap)
        } catch (err) {
            console.error("Failed to load review:", err)
        } finally {
            setLoading(false)
        }
    }, [reviewId])

    useEffect(() => {
        if (open && reviewId) {
            fetchData()
        } else {
            // Reset state when closed
            setReview(null)
            setQuestions([])
            setAnswers(new Map())
        }
    }, [open, reviewId, fetchData])

    const answeredCount = questions.filter((q) => {
        const ans = answers.get(q.id)
        if (!ans) return false
        if (q.type === "COMMENT") return !!ans.value?.trim()
        if (q.type === "OPTIONS" || q.type === "OPTIONS_WITH_VALUE") return !!ans.choiceId
        return !!ans.value
    }).length

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <DialogTitle className="text-lg">Review Detail</DialogTitle>
                        {review && (
                            <Badge className={reviewStatusClass(review.status)}>
                                {getReviewStatus(review.status).label}
                            </Badge>
                        )}
                    </div>
                    {review && (
                        <>
                            <p className="text-sm text-muted-foreground mt-1">
                                Reviewer: <UserLink userId={review.reviewer.id} name={`${review.reviewer.firstName} ${review.reviewer.lastName}`} className="font-medium" />
                                {" "}({review.reviewer.email})
                            </p>
                            {review.totalScore != null && (
                                <p className="text-sm text-muted-foreground">
                                    Total Score: <span className="font-semibold text-foreground">{review.totalScore}</span>
                                </p>
                            )}
                        </>
                    )}
                </DialogHeader>
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : !review ? (
                    <div className="py-12 text-center text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-amber-400" />
                        <p>Review not found.</p>
                    </div>
                ) : (
                    <>

                        {/* Paper Info */}
                        <Card className="border-l-4 border-l-indigo-500 mt-2">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex items-start gap-2">
                                    <FileText className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                                    <p className="font-semibold text-sm">{review.paper?.title}</p>
                                </div>
                                {review.paper?.abstractField && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Abstract</p>
                                        <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">{review.paper.abstractField}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Progress */}
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                                Answered {answeredCount}/{questions.length} questions
                            </p>
                            <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                                    style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Review Questions & Answers (Read-Only) */}
                        {questions.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-amber-400" />
                                <p className="text-sm">No review questions found for this track.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {questions.map((question, idx) => {
                                    const answer = answers.get(question.id)
                                    return (
                                        <Card key={question.id} className={question.isRequired ? "border-l-4 border-l-red-400" : ""}>
                                            <CardContent className="p-4 space-y-2">
                                                {/* Question text */}
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900">
                                                        <span className="text-gray-400 mr-2">Q{idx + 1}.</span>
                                                        {question.text}
                                                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                                                    </p>
                                                    {question.note && (
                                                        <p className="text-xs text-muted-foreground mt-0.5 italic">{question.note}</p>
                                                    )}
                                                </div>

                                                {/* Answer display (read-only) */}
                                                {!answer || (!answer.value && !answer.choiceId) ? (
                                                    <p className="text-xs text-muted-foreground italic">No answer provided</p>
                                                ) : (
                                                    <>
                                                        {question.type === "COMMENT" && (
                                                            <div className="bg-gray-50 rounded-lg p-3 border">
                                                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{answer.value || "—"}</p>
                                                            </div>
                                                        )}

                                                        {question.type === "AGREEMENT" && (
                                                            <div className="flex gap-2">
                                                                <Badge
                                                                    className={
                                                                        answer.value === "Yes"
                                                                            ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                                                                            : answer.value === "No"
                                                                                ? "bg-red-100 text-red-700 border-red-300"
                                                                                : "bg-gray-100 text-gray-500"
                                                                    }
                                                                >
                                                                    {answer.value === "Yes" ? (
                                                                        <><Check className="h-3 w-3 mr-1" /> Agree</>
                                                                    ) : (
                                                                        <><X className="h-3 w-3 mr-1" /> Disagree</>
                                                                    )}
                                                                </Badge>
                                                            </div>
                                                        )}

                                                        {(question.type === "OPTIONS" || question.type === "OPTIONS_WITH_VALUE") && question.choices && (
                                                            <div className="space-y-1.5">
                                                                {[...question.choices]
                                                                    .sort((a, b) => a.orderIndex - b.orderIndex)
                                                                    .map((choice) => {
                                                                        const isSelected = answer.choiceId === choice.id
                                                                        return (
                                                                            <div
                                                                                key={choice.id}
                                                                                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                                                                                    isSelected
                                                                                        ? "bg-indigo-50 border-indigo-400 text-indigo-800 ring-1 ring-indigo-200"
                                                                                        : "bg-white border-gray-100 text-gray-400"
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <div
                                                                                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                                                                            isSelected ? "border-indigo-500 bg-indigo-500" : "border-gray-300"
                                                                                        }`}
                                                                                    >
                                                                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                                                    </div>
                                                                                    <span className="text-xs">{choice.text}</span>
                                                                                </div>
                                                                                {question.type === "OPTIONS_WITH_VALUE" && choice.value != null && (
                                                                                    <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                                                                                        {choice.value} pts
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    })}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}

                        {/* Status footer */}
                        <div
                            className={`p-3 rounded-lg border text-center text-sm mt-2 ${
                                review.status === "COMPLETED"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : review.status === "DECLINED"
                                        ? "bg-red-50 border-red-200 text-red-700"
                                        : review.status === "IN_PROGRESS"
                                            ? "bg-amber-50 border-amber-200 text-amber-700"
                                            : "bg-indigo-50 border-indigo-200 text-indigo-700"
                            }`}
                        >
                            {review.status === "COMPLETED"
                                ? "✅ This review has been submitted."
                                : review.status === "DECLINED"
                                    ? "❌ This review was declined."
                                    : review.status === "IN_PROGRESS"
                                        ? "⏳ This review is in progress."
                                        : "📋 This review has been assigned but not started."}
                            {review.totalScore != null && (
                                <span className="ml-2 font-semibold">Total Score: {review.totalScore}</span>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
