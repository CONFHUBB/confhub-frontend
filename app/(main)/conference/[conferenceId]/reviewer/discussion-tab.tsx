'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, MessageSquare, ChevronDown, ChevronRight, FileText, CheckCircle2, User, AlertCircle } from 'lucide-react'
import { PaperDiscussion } from '@/components/paper-discussion'
import type { ReviewResponse } from '@/types/review'
import type { TrackReviewSetting } from '@/types/track'
import { getReviewsByPaper, getAnswersByReview, getReviewQuestionsByTrack } from '@/app/api/review.api'
import { getPapersByConference } from '@/app/api/paper.api'
import type { PaperResponse } from '@/types/paper'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { reviewStatusClass } from '@/lib/constants/status'

interface DiscussionTabProps {
    reviews: ReviewResponse[]
    conferenceId: number
    currentUserId: number | null
    activities?: { activityType: string; isEnabled: boolean }[]
    settings?: TrackReviewSetting
}



export function DiscussionTab({ reviews, conferenceId, currentUserId, activities = [], settings }: DiscussionTabProps) {
    const isDiscussionEnabled = activities.some(a => a.activityType === 'REVIEW_DISCUSSION' && a.isEnabled)
    const shouldAnonymize = !(settings?.showReviewerIdentityToOtherReviewer)
    const [expandedPaper, setExpandedPaper] = useState<number | null>(null)
    const [paperReviews, setPaperReviews] = useState<Record<number, ReviewResponse[]>>({})
    const [loadingReviews, setLoadingReviews] = useState<Record<number, boolean>>({})

    const [viewedReview, setViewedReview] = useState<number | null>(null)
    const [reviewerName, setReviewerName] = useState('')
    const [detailsLoading, setDetailsLoading] = useState(false)
    const [questions, setQuestions] = useState<any[]>([])
    const [answers, setAnswers] = useState<Record<number, any>>({})

    // #9: Fetch all conference papers when allowDiscussNonAssignedPapers is enabled
    const [allPapers, setAllPapers] = useState<PaperResponse[]>([])
    const [loadingAllPapers, setLoadingAllPapers] = useState(false)

    useEffect(() => {
        if (settings?.allowDiscussNonAssignedPapers && conferenceId) {
            setLoadingAllPapers(true)
            getPapersByConference(conferenceId)
                .then(papers => setAllPapers(papers || []))
                .catch(() => setAllPapers([]))
                .finally(() => setLoadingAllPapers(false))
        }
    }, [settings?.allowDiscussNonAssignedPapers, conferenceId])

    // Build discussion paper list: assigned papers + non-assigned (if setting enabled)
    const assignedPaperIds = new Set(reviews.map(r => r.paper?.id).filter(Boolean))
    const discussionPapers = useMemo(() => {
        // Start with assigned papers from reviews
        const assigned = reviews.map(r => ({
            paperId: r.paper?.id || 0,
            title: r.paper?.title || `Paper #${r.paper?.id}`,
            trackId: r.paper?.trackId,
            myReview: r,
            isAssigned: true,
        })).filter(p => p.paperId > 0)

        if (!settings?.allowDiscussNonAssignedPapers) return assigned

        // Add non-assigned papers
        const extra = allPapers
            .filter(p => !assignedPaperIds.has(p.id) && p.status !== 'WITHDRAWN' && p.status !== 'DRAFT')
            .map(p => ({
                paperId: p.id,
                title: p.title || `Paper #${p.id}`,
                trackId: p.trackId,
                myReview: null as ReviewResponse | null,
                isAssigned: false,
            }))

        return [...assigned, ...extra]
    }, [reviews, allPapers, settings?.allowDiscussNonAssignedPapers, assignedPaperIds])

    const handleExpand = async (paperId: number) => {
        if (expandedPaper === paperId) {
            setExpandedPaper(null)
            return
        }
        setExpandedPaper(paperId)

        if (!paperReviews[paperId]) {
            setLoadingReviews(prev => ({ ...prev, [paperId]: true }))
            try {
                const results = await getReviewsByPaper(paperId)
                setPaperReviews(prev => ({ ...prev, [paperId]: results }))
            } catch (err) {
                console.error(err)
            } finally {
                setLoadingReviews(prev => ({ ...prev, [paperId]: false }))
            }
        }
    }

    const handleViewDetails = async (reviewId: number, trackId: number, rName: string) => {
        setViewedReview(reviewId)
        setReviewerName(rName)
        setDetailsLoading(true)
        try {
            const [qData, aData] = await Promise.all([
                getReviewQuestionsByTrack(trackId),
                getAnswersByReview(reviewId)
            ])
            const qList = Array.isArray(qData) ? qData : (qData.content || [])
            setQuestions(qList)

            const aMap: Record<number, any> = {}
            for (const ans of (Array.isArray(aData) ? aData : [])) {
                aMap[ans.questionId] = ans
            }
            setAnswers(aMap)
        } catch (err) {
            console.error(err)
        } finally {
            setDetailsLoading(false)
        }
    }

    if (reviews.length === 0 && !settings?.allowDiscussNonAssignedPapers) {
        return (
            <EmptyState
                emoji="💬"
                title="No papers assigned for discussion"
                description="You have not been assigned any papers. Discussion will appear here once you have papers to review."
            />
        )
    }

    if (loadingAllPapers) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-bold">Paper Discussions</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Select an assigned paper below to consult with other reviewers and discuss your decisions.
                </p>
            </div>

            <div className="space-y-3">
                {discussionPapers.map((dp, dpIdx) => {
                    const paper = { id: dp.paperId, title: dp.title, trackId: dp.trackId }
                    const myReview = dp.myReview
                    const isExpanded = expandedPaper === paper.id
                    const isFetching = loadingReviews[paper.id]
                    const otherReviews = (paperReviews[paper.id] || []).filter(r => r.reviewer.id !== currentUserId)

                    return (
                        <Card key={`dp-${dp.paperId}-${dpIdx}`} className={`overflow-hidden transition-all ${isExpanded ? 'border-indigo-300 ring-1 ring-indigo-300 shadow-md' : 'hover:border-indigo-200'}`}>
                            <div 
                                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                                onClick={() => handleExpand(paper.id)}
                            >
                                <div className="flex-1 pr-4">
                                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700">
                                        {paper.title || `Paper #${paper.id}`}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                        {paper.trackId && <Badge variant="outline" className="font-normal text-[10px] bg-white border-gray-200">Track #{paper.trackId}</Badge>}
                                        {myReview ? (
                                            <>
                                                <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> My Score: {myReview.totalScore != null ? myReview.totalScore : '—'}</span>
                                                <Badge className={`font-normal text-[10px] border ${reviewStatusClass(myReview.status)}`}>
                                                    {myReview.status}
                                                </Badge>
                                            </>
                                        ) : (
                                            <Badge variant="outline" className="font-normal text-[10px] bg-slate-50 border-slate-200 text-slate-500">Not Assigned</Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="shrink-0 flex items-center gap-3">
                                    <div className="hidden sm:flex text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full text-xs font-semibold items-center gap-1.5 border border-indigo-100 shadow-sm transition-transform hover:scale-105">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        Discussion
                                    </div>
                                    {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                                </div>
                            </div>
                            
                            {isExpanded && (
                                <div className="border-t bg-gray-50/50">
                                    <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                                        {/* Other Reviewers' Status */}
                                        <div className="lg:col-span-1 border rounded-xl overflow-hidden bg-white shadow-sm lg:sticky lg:top-4">
                                            <div className="bg-gradient-to-r from-gray-50 to-white border-b px-4 py-3 border-gray-100">
                                                <h4 className="font-medium text-sm text-gray-800 flex items-center gap-2">
                                                    <User className="h-4 w-4 text-indigo-500" /> Review Board
                                                </h4>
                                            </div>
                                            <div className="divide-y max-h-[400px] overflow-y-auto">
                                                {isFetching ? (
                                                    <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-500" /></div>
                                                ) : otherReviews.length > 0 ? (
                                                    otherReviews.map((r, i) => {
                                                        const rName = shouldAnonymize ? `Reviewer ${i + 1}` : (r.reviewer?.firstName ? `${r.reviewer.firstName} ${r.reviewer.lastName}` : `Reviewer ${i + 1}`);
                                                        return (
                                                        <div key={r.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-700">{rName}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Badge variant="outline" className={`text-[10px] bg-slate-50 border-gray-200 ${r.status==='COMPLETED'?'text-green-600':''}`}>{r.status}</Badge>
                                                                    <Button variant="link" size="sm" className="h-auto p-0 text-[10px] text-indigo-500 hover:text-indigo-700" onClick={(e) => { e.stopPropagation(); handleViewDetails(r.id, paper.trackId!, rName); }}>
                                                                        View Answers
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-gray-500 mb-0.5">Score</p>
                                                                <p className="font-mono font-medium text-indigo-600">
                                                                    {r.totalScore != null ? r.totalScore : '—'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )})
                                                ) : (
                                                    <div className="p-6 text-center text-sm text-gray-500">
                                                        No other reviewers assigned yet.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Discussion Board */}
                                        <div className="lg:col-span-2 border rounded-xl overflow-hidden bg-white shadow-sm flex flex-col min-h-[500px]">
                                            <div className="bg-gradient-to-r from-indigo-50 to-white border-b px-4 py-3 shrink-0 border-indigo-100">
                                                <h4 className="font-medium text-sm flex items-center gap-2 text-indigo-700">
                                                    <MessageSquare className="h-4 w-4" /> Consensus Discussion
                                                </h4>
                                            </div>
                                            <div className="p-4 flex-1">
                                                {currentUserId ? (
                                                    <PaperDiscussion
                                                        paperId={paper.id}
                                                        currentUserId={currentUserId}
                                                        anonymize={shouldAnonymize}
                                                        discussionEnabled={isDiscussionEnabled}
                                                    />
                                                ) : (
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 my-10" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    )
                })}
            </div>

            {/* View Answers Dialog */}
            <Dialog open={viewedReview !== null} onOpenChange={(open) => !open && setViewedReview(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Detailed Review Answers</DialogTitle>
                        <DialogDescription>
                            Review submitted by {reviewerName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-6">
                        {detailsLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
                        ) : questions.length > 0 ? (
                            questions.map((q, idx) => {
                                const ans = answers[q.id];
                                return (
                                    <div key={q.id} className="p-4 rounded-lg bg-gray-50 border">
                                        <p className="font-medium text-sm text-gray-900 mb-2">Q{idx + 1}. {q.text}</p>
                                        <div className="bg-white p-3 rounded border border-gray-100 text-sm">
                                            {ans ? (
                                                ans.selectedChoiceText ? (
                                                    <span className="font-semibold text-indigo-700">{ans.selectedChoiceText}</span>
                                                ) : ans.answerValue ? (
                                                    <span className="text-gray-700 whitespace-pre-wrap">{ans.answerValue}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">No answer provided.</span>
                                                )
                                            ) : (
                                                <span className="text-gray-400 italic">No answer retrieved.</span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="text-center py-10 text-gray-500">No questions found.</div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
