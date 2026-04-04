'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getReviewById, updateReview, getAnswersByReview, submitAnswer, getReviewQuestionsByTrack, getReviewsByPaper } from '@/app/api/review.api'
import { getReviewerPaperFiles } from '@/app/api/paper.api'
import { getConferenceActivities } from '@/app/api/conference.api'
import type { ReviewResponse, ReviewAnswerResponse, ReviewAnswerRequest } from '@/types/review'
import type { PaperFileResponse } from '@/types/paper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/components/ui/field'
import { Loader2, ArrowLeft, FileText, Check, X, AlertTriangle, Save, Eye, ExternalLink, FileDown, MessageSquare, Lock, Sparkles, ThumbsUp, ThumbsDown, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { PaperDiscussion } from '@/components/paper-discussion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useTrackSettings } from '@/hooks/useTrackSettings'
import { reviewStatusClass } from '@/lib/constants/status'
import { summarizePaper, analyzeStrengthsWeaknesses, type PaperSummaryResponse, type StrengthWeaknessResponse } from '@/app/api/ai-assistant.api'

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



export default function ReviewPaperPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)
    const reviewId = Number(params.reviewId)

    const [review, setReview] = useState<ReviewResponse | null>(null)
    const [questions, setQuestions] = useState<ReviewQuestion[]>([])
    const [answers, setAnswers] = useState<Map<number, { value: string; choiceId: number | null }>>(new Map())
    const [savedAnswers, setSavedAnswers] = useState<ReviewAnswerResponse[]>([])
    const [questionErrors, setQuestionErrors] = useState<Map<number, string>>(new Map())
    const [loading, setLoading] = useState(true)
    const [savingQuestion, setSavingQuestion] = useState<number | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [activityClosed, setActivityClosed] = useState<string | null>(null)
    const [paperFiles, setPaperFiles] = useState<PaperFileResponse[]>([])
    const [showPdfPreview, setShowPdfPreview] = useState(true)
    const [showDiscussion, setShowDiscussion] = useState(false)
    const [discussionEnabled, setDiscussionEnabled] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<number | null>(null)

    // #5: Other reviews state
    const [otherReviews, setOtherReviews] = useState<any[]>([])
    const [otherReviewsLoading, setOtherReviewsLoading] = useState(false)
    const [otherReviewAnswers, setOtherReviewAnswers] = useState<Record<number, any[]>>({})
    const [expandedOtherReview, setExpandedOtherReview] = useState<number | null>(null)

    // Track settings for #6 and #7
    const { settings } = useTrackSettings(conferenceId, review?.paper?.trackId)
    const canEditDuringDiscussion = !discussionEnabled || settings.allowReviewUpdateDuringDiscussion

    // AI Assistant states
    const [aiSummary, setAiSummary] = useState<PaperSummaryResponse | null>(null)
    const [aiSW, setAiSW] = useState<StrengthWeaknessResponse | null>(null)
    const [loadingSummary, setLoadingSummary] = useState(false)
    const [loadingSW, setLoadingSW] = useState(false)
    const [showSummary, setShowSummary] = useState(false)
    const [showSW, setShowSW] = useState(false)
    const [showInstructions, setShowInstructions] = useState(true)

    // Get userId from JWT
    useEffect(() => {
        try {
            const token = localStorage.getItem('accessToken')
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]))
                setCurrentUserId(payload.userId || payload.id)
            }
        } catch { /* ignore */ }
    }, [])

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
                    // Check discussion activity
                    const discussionActivity = activities.find(a => a.activityType === 'REVIEW_DISCUSSION')
                    setDiscussionEnabled(!!(discussionActivity && discussionActivity.isEnabled))
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

            // Fetch paper files — uses auth-gated endpoint that verifies reviewer assignment
            if (reviewData.paper?.id) {
                try {
                    const files = await getReviewerPaperFiles(reviewData.paper.id)
                    if (Array.isArray(files)) {
                        setPaperFiles(files)
                    }
                } catch { /* ignore — viewer may not be assigned */ }
            }
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
        setQuestionErrors(prev => {
            if (!prev.has(questionId)) return prev
            const next = new Map(prev)
            next.delete(questionId)
            return next
        })
    }

    const handleSaveAnswer = async (questionId: number) => {
        const answer = answers.get(questionId)
        if (!answer) return

        const q = questions.find(question => question.id === questionId)
        if (q?.isRequired && q.type === 'COMMENT' && (!answer.value || !answer.value.trim())) {
            setQuestionErrors(prev => {
                const next = new Map(prev)
                next.set(questionId, 'This field is required')
                return next
            })
            return
        }

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
            setQuestionErrors(prev => {
                const next = new Map(prev)
                unanswered.forEach(q => next.set(q.id, 'This field is required'))
                return next
            })
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

    const handleEditReview = async () => {
        if (!review) return
        if (!confirm('This will unlock your review and allow you to make changes. Are you sure?')) return

        setSubmitting(true)
        try {
            const updated = await updateReview(reviewId, {
                paperId: review.paper.id,
                reviewerId: review.reviewer.id,
                status: 'IN_PROGRESS',
            })
            setReview(updated)
            toast.success('Review unlocked for editing')
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to unlock review')
        } finally {
            setSubmitting(false)
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
        <div className="max-w-7xl 2xl:max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="space-y-4">
                <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push(`/conference/${conferenceId}/reviewer`)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Reviewer Console
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">Review Paper</h1>
                        <Badge className={reviewStatusClass(review.status)}>
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
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* LEFT COLUMN: Paper Info & Manuscript */}
                <div className="space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] overflow-y-auto pr-1 pb-4">
                    <h2 className="text-xl font-bold border-b pb-2 text-gray-800 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-500" />
                        Paper Reference
                    </h2>
                    
                    {/* Paper Info */}
                    <Card className="border-l-4 border-l-indigo-500">
                        <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                            <CardTitle className="text-lg">{review.paper?.title}</CardTitle>
                            {review.paper?.isDoubleBlind ? (
                                <Badge variant="outline" className="mt-2 text-xs bg-slate-100 text-slate-600 border-slate-200">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Đã ẩn do chế độ Double-Blind
                                </Badge>
                            ) : (
                                review.paper?.authorNames && review.paper.authorNames.length > 0 && (
                                    <p className="mt-1.5 text-sm text-muted-foreground">{review.paper.authorNames.join(', ')}</p>
                                )
                            )}
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

            {/* AI Assistant Tools */}
            {review.paper?.id && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        AI Assistant
                    </h3>

                    {/* AI Summary Button */}
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        disabled={loadingSummary}
                        onClick={async () => {
                            if (aiSummary) { setShowSummary(!showSummary); return }
                            setLoadingSummary(true)
                            try {
                                const result = await summarizePaper(review.paper!.id)
                                setAiSummary(result)
                                setShowSummary(true)
                            } catch { toast.error('Failed to generate summary') }
                            finally { setLoadingSummary(false) }
                        }}
                    >
                        {loadingSummary ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                        {loadingSummary ? 'Generating Summary...' : aiSummary ? (showSummary ? 'Hide AI Summary' : 'Show AI Summary') : '📖 AI Paper Summary'}
                    </Button>
                    {showSummary && aiSummary && (
                        <Card className="border-indigo-200 bg-indigo-50/30">
                            <CardContent className="p-4 space-y-3">
                                <p className="text-sm text-gray-700 leading-relaxed">{aiSummary.summary}</p>
                                {aiSummary.keyContributions.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Key Contributions</p>
                                        <ul className="text-sm text-gray-700 space-y-1">
                                            {aiSummary.keyContributions.map((c, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <span className="text-indigo-400 mt-0.5">•</span>{c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {aiSummary.methodology && (
                                    <div>
                                        <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Methodology</p>
                                        <p className="text-sm text-gray-700">{aiSummary.methodology}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* AI Strengths & Weaknesses Button */}
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        disabled={loadingSW}
                        onClick={async () => {
                            if (aiSW) { setShowSW(!showSW); return }
                            setLoadingSW(true)
                            try {
                                const result = await analyzeStrengthsWeaknesses(review.paper!.id)
                                setAiSW(result)
                                setShowSW(true)
                            } catch { toast.error('Failed to analyze') }
                            finally { setLoadingSW(false) }
                        }}
                    >
                        {loadingSW ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                        {loadingSW ? 'Analyzing...' : aiSW ? (showSW ? 'Hide Analysis' : 'Show Analysis') : '🔎 Strengths & Weaknesses'}
                    </Button>
                    {showSW && aiSW && (
                        <Card className="border-emerald-200">
                            <CardContent className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-emerald-600 uppercase flex items-center gap-1">
                                            <ThumbsUp className="h-3.5 w-3.5" /> Strengths
                                        </p>
                                        {aiSW.strengths.map((s, i) => (
                                            <div key={i} className="p-2 bg-emerald-50 rounded text-sm text-emerald-800 flex items-start gap-2">
                                                <span className="text-emerald-400 mt-0.5">✓</span>{s}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-red-600 uppercase flex items-center gap-1">
                                            <ThumbsDown className="h-3.5 w-3.5" /> Weaknesses
                                        </p>
                                        {aiSW.weaknesses.map((w, i) => (
                                            <div key={i} className="p-2 bg-red-50 rounded text-sm text-red-800 flex items-start gap-2">
                                                <span className="text-red-400 mt-0.5">✗</span>{w}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Manuscript Files */}
            {paperFiles.length > 0 && (() => {
                const activeFile = paperFiles.find(f => f.isActive) || paperFiles[0]
                return (
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileDown className="h-5 w-5 text-indigo-500" />
                                    <CardTitle className="text-base">Manuscript File</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 text-xs"
                                        onClick={() => setShowPdfPreview(!showPdfPreview)}
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        {showPdfPreview ? 'Hide Preview' : 'Show Preview'}
                                    </Button>
                                    <a href={activeFile.url} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Open in New Tab
                                        </Button>
                                    </a>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {showPdfPreview && (
                                <div className="rounded-lg border overflow-hidden bg-gray-50">
                                    <iframe
                                        src={`https://docs.google.com/gview?url=${encodeURIComponent(activeFile.url)}&embedded=true`}
                                        className="w-full border-0 h-[65vh] min-h-[500px]"
                                        title="Manuscript PDF"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            })()}

                </div>

                {/* RIGHT COLUMN: Review Form & Discussion */}
                <div className="pb-20">
                    <Tabs defaultValue="review" className="w-full">
                        <TabsList className={`grid w-full mb-6 h-12 bg-gray-100 p-1 rounded-xl ${settings.allowOthersReviewAccessAfterSubmit ? 'grid-cols-3' : 'grid-cols-2'}`}>
                            <TabsTrigger value="review" className="text-sm font-semibold h-full flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                                <Check className="h-4 w-4" /> Review Form
                            </TabsTrigger>
                            {settings.allowOthersReviewAccessAfterSubmit && (
                                <TabsTrigger
                                    value="other-reviews"
                                    className="text-sm font-semibold h-full flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm"
                                    onClick={async () => {
                                        if (review?.paper?.id && otherReviews.length === 0 && review.status === 'COMPLETED') {
                                            setOtherReviewsLoading(true)
                                            try {
                                                const allReviews = await getReviewsByPaper(review.paper.id)
                                                setOtherReviews(allReviews.filter((r: any) => r.id !== reviewId))
                                            } catch { /* ignore */ }
                                            finally { setOtherReviewsLoading(false) }
                                        }
                                    }}
                                >
                                    <Eye className="h-4 w-4" /> Other Reviews
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="discussion" className="text-sm font-semibold h-full flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                                <MessageSquare className="h-4 w-4" /> Discussion
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="review" className="space-y-6">
                            {/* #2: Reviewer Instructions Banner */}
                            {settings.reviewerInstructions && settings.reviewerInstructions.trim() !== '' && (
                                <Card className="border-blue-200 bg-blue-50/50">
                                    <button
                                        type="button"
                                        onClick={() => setShowInstructions(!showInstructions)}
                                        className="w-full p-4 flex items-center justify-between text-left hover:bg-blue-50 transition-colors rounded-t-lg"
                                    >
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-blue-600" />
                                            <span className="text-sm font-semibold text-blue-800">Reviewer Instructions</span>
                                        </div>
                                        {showInstructions ? (
                                            <ChevronUp className="h-4 w-4 text-blue-500" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-blue-500" />
                                        )}
                                    </button>
                                    {showInstructions && (
                                        <CardContent className="pt-0 pb-4 px-4">
                                            <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                                                {settings.reviewerInstructions}
                                            </p>
                                        </CardContent>
                                    )}
                                </Card>
                            )}
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
                                        <div className="space-y-1">
                                            <Textarea
                                                placeholder="Enter your comment..."
                                                rows={4}
                                                value={answer?.value || ''}
                                                onChange={e => handleAnswerChange(question.id, e.target.value)}
                                                disabled={isReadOnly}
                                                maxLength={question.maxLength || undefined}
                                                className="text-sm"
                                            />
                                            {questionErrors.has(question.id) && (
                                                <FieldError>{questionErrors.get(question.id)}</FieldError>
                                            )}
                                        </div>
                                    )}

                                    {question.type === 'AGREEMENT' && (
                                        <div className="space-y-1">
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
                                            {questionErrors.has(question.id) && (
                                                <FieldError>{questionErrors.get(question.id)}</FieldError>
                                            )}
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
                                                                ? 'bg-indigo-50 border-indigo-400 text-indigo-800 ring-1 ring-indigo-200'
                                                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                                                isActive ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
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
                                            {questionErrors.has(question.id) && (
                                                <FieldError>{questionErrors.get(question.id)}</FieldError>
                                            )}
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
                <div className={`p-4 rounded-lg border flex flex-col items-center text-center text-sm ${
                    review.status === 'COMPLETED'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                    <div>
                        {review.status === 'COMPLETED'
                            ? '✅ Review has been submitted successfully.'
                            : '❌ Review has been declined.'}
                        {review.totalScore != null && (
                            <p className="mt-1 font-semibold">Total Score: {review.totalScore}</p>
                        )}
                    </div>
                    {review.status === 'COMPLETED' && !activityClosed && (
                        canEditDuringDiscussion ? (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-4 border-emerald-300 text-emerald-700 hover:bg-emerald-100 min-w-[140px]"
                                onClick={handleEditReview}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Edit Review
                            </Button>
                        ) : (
                            <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                                <Lock className="h-4 w-4 shrink-0" />
                                Review editing is locked during Discussion phase
                            </div>
                        )
                    )}
                </div>
            )}

                        </TabsContent>

                        {/* #5: Other Reviews Tab */}
                        {settings.allowOthersReviewAccessAfterSubmit && (
                            <TabsContent value="other-reviews" className="space-y-4">
                                {review.status !== 'COMPLETED' ? (
                                    <Card className="border-amber-200 bg-amber-50/50">
                                        <CardContent className="p-6 text-center">
                                            <Lock className="h-8 w-8 text-amber-400 mx-auto mb-3" />
                                            <p className="font-semibold text-amber-800">Submit your review first</p>
                                            <p className="text-sm text-amber-600 mt-1">You can view other reviewers' submissions after completing your own review.</p>
                                        </CardContent>
                                    </Card>
                                ) : otherReviewsLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : otherReviews.length === 0 ? (
                                    <Card>
                                        <CardContent className="p-6 text-center text-muted-foreground">
                                            <p className="text-sm">No other reviews available for this paper yet.</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    otherReviews.map((or, idx) => {
                                        const rName = !settings.showReviewerIdentityToOtherReviewer
                                            ? `Reviewer ${idx + 1}`
                                            : (or.reviewer?.firstName ? `${or.reviewer.firstName} ${or.reviewer.lastName}` : `Reviewer ${idx + 1}`)
                                        const isExpOther = expandedOtherReview === or.id
                                        return (
                                            <Card key={or.id} className={`transition-all ${isExpOther ? 'border-indigo-300 ring-1 ring-indigo-200' : ''}`}>
                                                <div
                                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                                    onClick={async () => {
                                                        if (isExpOther) { setExpandedOtherReview(null); return }
                                                        setExpandedOtherReview(or.id)
                                                        if (!otherReviewAnswers[or.id]) {
                                                            try {
                                                                const ans = await getAnswersByReview(or.id)
                                                                setOtherReviewAnswers(prev => ({ ...prev, [or.id]: Array.isArray(ans) ? ans : [] }))
                                                            } catch { /* ignore */ }
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                                            <span className="text-xs font-bold text-indigo-700">{idx + 1}</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm text-gray-900">{rName}</p>
                                                            <Badge variant="outline" className={`text-[10px] mt-0.5 ${or.status === 'COMPLETED' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-gray-500'}`}>
                                                                {or.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-500">Score</p>
                                                        <p className="font-mono font-semibold text-indigo-600">{or.totalScore != null ? or.totalScore : '—'}</p>
                                                    </div>
                                                </div>
                                                {isExpOther && (
                                                    <div className="border-t bg-gray-50/50 p-4 space-y-3">
                                                        {!otherReviewAnswers[or.id] ? (
                                                            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-indigo-500" /></div>
                                                        ) : otherReviewAnswers[or.id].length === 0 ? (
                                                            <p className="text-sm text-muted-foreground text-center py-4">No answers available.</p>
                                                        ) : (
                                                            otherReviewAnswers[or.id].map((ans: any, aIdx: number) => (
                                                                <div key={ans.id || aIdx} className="p-3 bg-white rounded-lg border">
                                                                    <p className="text-xs font-medium text-gray-500 mb-1">Q{aIdx + 1}</p>
                                                                    <p className="text-sm text-gray-800">
                                                                        {ans.selectedChoice?.text || ans.answerValue || ans.value || <span className="italic text-gray-400">No answer</span>}
                                                                    </p>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </Card>
                                        )
                                    })
                                )}
                            </TabsContent>
                        )}

                        <TabsContent value="discussion">
                            <Card className="border-t-4 border-t-indigo-500 shadow-sm">
                                <CardHeader className="pb-4 border-b border-gray-100 mb-4 bg-gray-50/50">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2 text-indigo-700">
                                                <MessageSquare className="h-5 w-5" />
                                                Reviewer Discussion
                                            </CardTitle>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Discuss this paper with other assigned reviewers and the Chair.
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                {currentUserId && review.paper?.id && (
                                    <CardContent>
                                        <PaperDiscussion
                                            paperId={review.paper.id}
                                            currentUserId={currentUserId}
                                            anonymize={!settings.showReviewerIdentityToOtherReviewer}
                                            discussionEnabled={discussionEnabled}
                                        />
                                    </CardContent>
                                )}
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
