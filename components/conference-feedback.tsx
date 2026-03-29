'use client'

import { useEffect, useState, useCallback } from 'react'
import { Star, MessageSquare, Send, Trash2, Loader2, UserCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import toast from 'react-hot-toast'
import {
    getConferenceFeedback,
    getConferenceFeedbackSummary,
    getMyFeedback,
    submitFeedback,
    deleteMyFeedback,
    type ConferenceFeedbackResponse,
    type ConferenceFeedbackSummary,
} from '@/app/api/feedback.api'

interface ConferenceFeedbackProps {
    conferenceId: number
    isCheckedIn?: boolean // if true, show the submit form
}

function StarRating({ rating, onRate, size = 'md', interactive = false }: {
    rating: number, onRate?: (r: number) => void, size?: 'sm' | 'md' | 'lg', interactive?: boolean
}) {
    const [hover, setHover] = useState(0)
    const sizeMap = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' }

    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    disabled={!interactive}
                    onClick={() => onRate?.(star)}
                    onMouseEnter={() => interactive && setHover(star)}
                    onMouseLeave={() => interactive && setHover(0)}
                    className={`transition-all ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                >
                    <Star
                        className={`${sizeMap[size]} transition-colors ${
                            star <= (hover || rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-none text-gray-300'
                        }`}
                    />
                </button>
            ))}
        </div>
    )
}

function RatingBar({ label, count, total }: { label: string, count: number, total: number }) {
    const pct = total > 0 ? (count / total) * 100 : 0
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="w-6 text-right text-muted-foreground font-medium">{label}</span>
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-8 text-right text-muted-foreground text-xs">{count}</span>
        </div>
    )
}

export function ConferenceFeedback({ conferenceId, isCheckedIn = false }: ConferenceFeedbackProps) {
    const [feedbacks, setFeedbacks] = useState<ConferenceFeedbackResponse[]>([])
    const [summary, setSummary] = useState<ConferenceFeedbackSummary | null>(null)
    const [myFeedback, setMyFeedback] = useState<ConferenceFeedbackResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [newRating, setNewRating] = useState(0)
    const [newComment, setNewComment] = useState('')

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const [fb, sm, my] = await Promise.all([
                getConferenceFeedback(conferenceId),
                getConferenceFeedbackSummary(conferenceId),
                getMyFeedback(conferenceId),
            ])
            setFeedbacks(fb)
            setSummary(sm)
            setMyFeedback(my)
            if (my) {
                setNewRating(my.rating)
                setNewComment(my.comment || '')
            }
        } catch (err) {
            console.error('Failed to load feedback:', err)
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleSubmit = async () => {
        if (newRating === 0) {
            toast.error('Please select a rating')
            return
        }
        setSubmitting(true)
        try {
            await submitFeedback(conferenceId, {
                rating: newRating,
                comment: newComment.trim() || undefined,
            })
            toast.success(myFeedback ? 'Feedback updated!' : 'Thank you for your feedback!')
            await fetchData()
        } catch (err: any) {
            const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to submit feedback'
            toast.error(msg)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete your feedback?')) return
        try {
            await deleteMyFeedback(conferenceId)
            toast.success('Feedback deleted')
            setNewRating(0)
            setNewComment('')
            setMyFeedback(null)
            await fetchData()
        } catch {
            toast.error('Failed to delete feedback')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* ── Summary Card ── */}
            <div className="grid gap-6 md:grid-cols-[280px_1fr]">
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <p className="text-5xl font-bold text-amber-600">
                            {summary?.averageRating?.toFixed(1) || '—'}
                        </p>
                        <StarRating rating={Math.round(summary?.averageRating || 0)} size="md" />
                        <p className="text-sm text-muted-foreground mt-2">
                            {summary?.totalCount || 0} {(summary?.totalCount || 0) === 1 ? 'review' : 'reviews'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 space-y-2">
                        <p className="text-sm font-semibold text-muted-foreground mb-3">Rating Distribution</p>
                        <RatingBar label="5" count={summary?.rating5 || 0} total={summary?.totalCount || 0} />
                        <RatingBar label="4" count={summary?.rating4 || 0} total={summary?.totalCount || 0} />
                        <RatingBar label="3" count={summary?.rating3 || 0} total={summary?.totalCount || 0} />
                        <RatingBar label="2" count={summary?.rating2 || 0} total={summary?.totalCount || 0} />
                        <RatingBar label="1" count={summary?.rating1 || 0} total={summary?.totalCount || 0} />
                    </CardContent>
                </Card>
            </div>

            {/* ── Submit Form (only for checked-in attendees) ── */}
            {isCheckedIn && (
                <Card className="border-primary/20 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            {myFeedback ? 'Update Your Review' : 'Write a Review'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Your rating</p>
                            <StarRating rating={newRating} onRate={setNewRating} size="lg" interactive />
                        </div>
                        <div>
                            <Textarea
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder="Share your experience at this conference... (optional)"
                                className="min-h-[100px] resize-none"
                                maxLength={2000}
                            />
                            <p className="text-xs text-muted-foreground mt-1 text-right">{newComment.length}/2000</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={handleSubmit} disabled={submitting || newRating === 0}>
                                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                <Send className="h-4 w-4 mr-2" />
                                {myFeedback ? 'Update Review' : 'Submit Review'}
                            </Button>
                            {myFeedback && (
                                <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Feedback List ── */}
            <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Reviews ({feedbacks.length})
                </h3>
                {feedbacks.length === 0 ? (
                    <div className="text-center py-12 border rounded-xl bg-muted/5">
                        <Star className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {feedbacks.map(fb => (
                            <Card key={fb.id} className="hover:shadow-sm transition-shadow">
                                <CardContent className="p-4 flex gap-4">
                                    <div className="shrink-0">
                                        {fb.userAvatarUrl ? (
                                            <img
                                                src={fb.userAvatarUrl}
                                                alt={`${fb.userFirstName} ${fb.userLastName}`}
                                                className="h-10 w-10 rounded-full object-cover border"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <UserCircle className="h-6 w-6 text-primary/60" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm">
                                                {fb.userFirstName} {fb.userLastName}
                                            </span>
                                            <StarRating rating={fb.rating} size="sm" />
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(fb.createdAt).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                        {fb.comment && (
                                            <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">
                                                {fb.comment}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
