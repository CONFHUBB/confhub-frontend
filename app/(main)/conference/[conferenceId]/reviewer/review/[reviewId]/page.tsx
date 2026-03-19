'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getReviewById, updateReview, getAnswersByReview, submitAnswer, getReviewQuestionsByTrack } from '@/app/api/review.api'
import { getConferenceActivities } from '@/app/api/conference.api'
import type { ReviewResponse, ReviewAnswerResponse, ReviewAnswerRequest } from '@/types/review'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeft, FileText, Check, X, AlertTriangle, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface ReviewQuestion {
    id: number
    trackId: number
    text: string
    note?: string
    type: 'COMMENT' | 'AGREEMENT' | 'OPTIONS' | 'OPTIONS_WITH_VALUE'
    orderIndex: number
    maxLength?: number
    isRequired: boolean
    choices?: { id: number; text: string; value: number; orderIndex: number }[]
}

const STATUS_COLORS: Record<string, string> = {
    ASSIGNED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-amber-100 text-amber-800',
    COMPLETED: 'bg-green-100 text-green-800',
    DECLINED: 'bg-red-100 text-red-800',
}

export default function ReviewPaperPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)
    const reviewId = Number(params.reviewId)

    const [review, setReview] = useState<ReviewResponse | null>(null)
    const [questions, setQuestions] = useState<ReviewQuestion[]>([])
    const [answers, setAnswers] = useState<Map<number, { value: string; choiceId: number | null }>>(new Map())
    const [savedAnswers, setSavedAnswers] = useState<ReviewAnswerResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [savingQuestion, setSavingQuestion] = useState<number | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [activityClosed, setActivityClosed] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const reviewData = await getReviewById(reviewId)
            setReview(reviewData)

            // Fetch review questions by track
            const trackId = reviewData.paper?.trackId
            if (trackId) {
                const questionsData = await getReviewQuestionsByTrack(trackId)
                const sorted = [...(questionsData || [])].sort((a: ReviewQuestion, b: ReviewQuestion) => a.orderIndex - b.orderIndex)
                setQuestions(sorted)
            }

            // Check if REVIEW_SUBMISSION activity is enabled
            try {
                const paper = reviewData.paper
                if (paper) {
                    // Derive conferenceId from route params
                    const activities = await getConferenceActivities(conferenceId)
                    const reviewActivity = activities.find(a => a.activityType === 'REVIEW_SUBMISSION')
                    if (reviewActivity) {
                        if (!reviewActivity.isEnabled) {
                            setActivityClosed('Review submission is currently disabled for this conference.')
                        } else if (reviewActivity.deadline && new Date(reviewActivity.deadline) < new Date()) {
                            setActivityClosed(`Review submission deadline has passed (${new Date(reviewActivity.deadline).toLocaleString()}).`)
                        }
                    }
                }
            } catch { /* ignore */ }

            // Fetch existing answers
            const answersData = await getAnswersByReview(reviewId).catch(() => [])
            setSavedAnswers(answersData)

            // Populate answers map
            const answersMap = new Map<number, { value: string; choiceId: number | null }>()
            answersData.forEach(a => {
                answersMap.set(a.questionId, {
                    value: a.answerValue || '',
                    choiceId: a.selectedChoiceId,
                })
            })
            setAnswers(answersMap)
        } catch (err) {
            console.error('Failed to load review:', err)
            toast.error('Failed to load review information')
        } finally {
            setLoading(false)
        }
    }, [reviewId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleAnswerChange = (questionId: number, value: string, choiceId: number | null = null) => {
        setAnswers(prev => {
            const next = new Map(prev)
            next.set(questionId, { value, choiceId })
            return next
        })
    }

    const handleSaveAnswer = async (questionId: number) => {
        const answer = answers.get(questionId)
        if (!answer) return
        setSavingQuestion(questionId)
        try {
            const dto: ReviewAnswerRequest = {
                reviewId,
                questionId,
                answerValue: answer.value || undefined,
                selectedChoiceId: answer.choiceId || undefined,
            }
            await submitAnswer(dto)

            // If ASSIGNED → transition to IN_PROGRESS
            if (review?.status === 'ASSIGNED') {
                try {
                    const updated = await updateReview(reviewId, {
                        paperId: review.paper.id,
                        reviewerId: review.reviewer.id,
                        status: 'IN_PROGRESS',
                    })
                    setReview(updated)
                } catch { /* ignore */ }
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Save failed')
        } finally {
            setSavingQuestion(null)
        }
    }

    const handleSubmitReview = async () => {
        if (!review) return

        // Validate required questions
        const unanswered = questions.filter(q => {
            if (!q.isRequired) return false
            const ans = answers.get(q.id)
            if (!ans) return true
            if (q.type === 'COMMENT') return !ans.value?.trim()
            if (q.type === 'OPTIONS' || q.type === 'OPTIONS_WITH_VALUE') return !ans.choiceId
            if (q.type === 'AGREEMENT') return !ans.value
            return false
        })

        if (unanswered.length > 0) {
            toast.error(`Please answer ${unanswered.length} required question(s)!`)
            return
        }

        setSubmitting(true)
        try {
            // Save all unsaved answers
            const allDtos: ReviewAnswerRequest[] = []
            answers.forEach((ans, qId) => {
                allDtos.push({
                    reviewId,
                    questionId: qId,
                    answerValue: ans.value || undefined,
                    selectedChoiceId: ans.choiceId || undefined,
                })
            })

            if (allDtos.length > 0) {
                // Save individually to avoid issues with bulk API
                for (const dto of allDtos) {
                    await submitAnswer(dto)
                }
            }

            // Transition status → COMPLETED
            const updated = await updateReview(reviewId, {
                paperId: review.paper.id,
                reviewerId: review.reviewer.id,
                status: 'COMPLETED',
            })
            setReview(updated)
            toast.success('✅ Review submitted successfully!')
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to submit review')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDecline = async () => {
        if (!review) return
        if (!confirm('Are you sure you want to decline this review?')) return

        try {
            const updated = await updateReview(reviewId, {
                paperId: review.paper.id,
                reviewerId: review.reviewer.id,
                status: 'DECLINED',
            })
            setReview(updated)
            toast.success('Review declined')
            router.push(`/conference/${conferenceId}/reviewer`)
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Action failed')
        }
    }

    const answeredCount = questions.filter(q => {
        const ans = answers.get(q.id)
        if (!ans) return false
        if (q.type === 'COMMENT') return !!ans.value?.trim()
        if (q.type === 'OPTIONS' || q.type === 'OPTIONS_WITH_VALUE') return !!ans.choiceId
        return !!ans.value
    }).length

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!review) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                <p className="text-muted-foreground">Review not found.</p>
            </div>
        )
    }

    const isReadOnly = review.status === 'COMPLETED' || review.status === 'DECLINED' || !!activityClosed

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="space-y-4">
                <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push(`/conference/${conferenceId}/reviewer`)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Reviewer Console
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">Review Paper</h1>
                        <Badge className={STATUS_COLORS[review.status]}>
                            {review.status === 'ASSIGNED' ? 'Assigned' :
                             review.status === 'IN_PROGRESS' ? 'In Progress' :
                             review.status === 'COMPLETED' ? 'Completed' : 'Declined'}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Answered {answeredCount}/{questions.length} questions
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
                />
            </div>

            {/* Activity closed warning */}
            {activityClosed && (
                <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-center">
                    <div className="flex items-center justify-center gap-2 text-red-700">
                        <AlertTriangle className="h-5 w-5" />
                        <p className="font-semibold">Review Submission Closed</p>
                    </div>
                    <p className="text-sm text-red-600 mt-1">{activityClosed}</p>
                    <p className="text-xs text-red-500 mt-1">The form is read-only. You can view your existing answers but cannot make changes.</p>
                </div>
            )}

            {/* Paper Info */}
            <Card className="border-l-4 border-l-indigo-500">
                <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                            <CardTitle className="text-lg">{review.paper?.title}</CardTitle>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {review.paper?.abstractField && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Abstract</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{review.paper.abstractField}</p>
                        </div>
                    )}
                    {review.paper?.keywordsJson && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Keywords</p>
                            <div className="flex flex-wrap gap-1.5">
                                {(() => {
                                    try {
                                        const kw = JSON.parse(review.paper.keywordsJson)
                                        return (Array.isArray(kw) ? kw : []).map((k: string, i: number) => (
                                            <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>
                                        ))
                                    } catch {
                                        return <span className="text-sm text-gray-600">{review.paper.keywordsJson}</span>
                                    }
                                })()}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Review Questions */}
            {questions.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-amber-400" />
                        <p>No review questions found for this track.</p>
                        <p className="text-sm mt-1">Contact the Chair to configure the review form.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {questions.map((question, idx) => {
                        const answer = answers.get(question.id)
                        const isSaving = savingQuestion === question.id
                        return (
                            <Card key={question.id} className={question.isRequired ? 'border-l-4 border-l-red-400' : ''}>
                                <CardContent className="p-5 space-y-3">
                                    {/* Question header */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                <span className="text-gray-400 mr-2">Q{idx + 1}.</span>
                                                {question.text}
                                                {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                                            </p>
                                            {question.note && (
                                                <p className="text-xs text-muted-foreground mt-1 italic">{question.note}</p>
                                            )}
                                        </div>
                                        {!isReadOnly && answer && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="shrink-0 text-xs"
                                                disabled={isSaving}
                                                onClick={() => handleSaveAnswer(question.id)}
                                            >
                                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                <span className="ml-1">Save</span>
                                            </Button>
                                        )}
                                    </div>

                                    {/* Answer input */}
                                    {question.type === 'COMMENT' && (
                                        <Textarea
                                            placeholder="Enter your comment..."
                                            rows={4}
                                            value={answer?.value || ''}
                                            onChange={e => handleAnswerChange(question.id, e.target.value)}
                                            disabled={isReadOnly}
                                            maxLength={question.maxLength || undefined}
                                            className="text-sm"
                                        />
                                    )}

                                    {question.type === 'AGREEMENT' && (
                                        <div className="flex gap-3">
                                            {['Yes', 'No'].map(val => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    disabled={isReadOnly}
                                                    onClick={() => handleAnswerChange(question.id, val)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                                                        answer?.value === val
                                                            ? val === 'Yes'
                                                                ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                                                                : 'bg-red-100 border-red-400 text-red-700'
                                                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                                    }`}
                                                >
                                                    {val === 'Yes' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                                    {val === 'Yes' ? 'Agree' : 'Disagree'}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {(question.type === 'OPTIONS' || question.type === 'OPTIONS_WITH_VALUE') && question.choices && (
                                        <div className="space-y-2">
                                            {[...question.choices].sort((a, b) => a.orderIndex - b.orderIndex).map(choice => {
                                                const isActive = answer?.choiceId === choice.id
                                                return (
                                                    <button
                                                        key={choice.id}
                                                        type="button"
                                                        disabled={isReadOnly}
                                                        onClick={() => handleAnswerChange(question.id, choice.text, choice.id)}
                                                        className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-all ${
                                                            isActive
                                                                ? 'bg-blue-50 border-blue-400 text-blue-800 ring-1 ring-blue-200'
                                                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                                                isActive ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                                            }`}>
                                                                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                            </div>
                                                            <span>{choice.text}</span>
                                                        </div>
                                                        {question.type === 'OPTIONS_WITH_VALUE' && choice.value != null && (
                                                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                                                                {choice.value} pts
                                                            </span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Action Buttons */}
            {!isReadOnly && (
                <div className="sticky bottom-4 flex items-center justify-between gap-3 p-4 bg-white/90 backdrop-blur border rounded-xl shadow-lg">
                    <Button
                        variant="outline"
                        onClick={handleDecline}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                        <X className="h-4 w-4 mr-1.5" />
                        Decline Review
                    </Button>
                    <Button
                        onClick={handleSubmitReview}
                        disabled={submitting}
                        size="lg"
                        className="px-8"
                    >
                        {submitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                        ) : (
                            <><Check className="mr-2 h-4 w-4" /> Submit Review</>
                        )}
                    </Button>
                </div>
            )}

            {/* Read-only notice */}
            {isReadOnly && (
                <div className={`p-4 rounded-lg border text-center text-sm ${
                    review.status === 'COMPLETED'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                    {review.status === 'COMPLETED'
                        ? '✅ Review has been submitted successfully. Contact the Chair if you need to make changes.'
                        : '❌ Review has been declined.'}
                    {review.totalScore != null && (
                        <p className="mt-1 font-semibold">Total Score: {review.totalScore}</p>
                    )}
                </div>
            )}
        </div>
    )
}
