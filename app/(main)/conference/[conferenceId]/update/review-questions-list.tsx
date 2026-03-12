"use client"

import { useEffect, useState } from "react"
import { getTracksByConference } from "@/app/api/track.api"
import {
    getTrackReviewQuestions,
    createTrackReviewQuestion,
    updateTrackReviewQuestion,
    deleteTrackReviewQuestion,
    reorderTrackReviewQuestions,
    copyTrackReviewQuestions,
} from "@/app/api/track.api"
import type { TrackResponse, ReviewQuestionDTO } from "@/types/track"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, Copy, Eye, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import toast from "react-hot-toast"
import { Select } from "antd"

import { ReviewQuestionDialog } from "./review-question-dialog"
import { ReviewQuestionsPreview } from "./review-questions-preview"
import { ReviewQuestionsCopyDialog } from "./review-questions-copy-dialog"

interface ReviewQuestionsListProps {
    conferenceId: number
}

export function ReviewQuestionsList({ conferenceId }: ReviewQuestionsListProps) {
    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null)
    const [questions, setQuestions] = useState<ReviewQuestionDTO[]>([])
    
    // UI State
    const [loadingTracks, setLoadingTracks] = useState(true)
    const [loadingQuestions, setLoadingQuestions] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    
    // Dialog visibility & data
    const [showQuestionDialog, setShowQuestionDialog] = useState(false)
    const [showPreviewDialog, setShowPreviewDialog] = useState(false)
    const [showCopyDialog, setShowCopyDialog] = useState(false)
    const [editingQuestion, setEditingQuestion] = useState<ReviewQuestionDTO | null>(null)

    useEffect(() => {
        const fetchTracks = async () => {
            try {
                setLoadingTracks(true)
                const data = await getTracksByConference(conferenceId)
                setTracks(data)
                if (data.length > 0) {
                    setSelectedTrackId(data[0].id)
                }
            } catch (err) {
                console.error("Failed to load tracks:", err)
                toast.error("Failed to load tracks")
            } finally {
                setLoadingTracks(false)
            }
        }
        fetchTracks()
    }, [conferenceId])

    const fetchQuestions = async (trackId: number) => {
        try {
            setLoadingQuestions(true)
            const data = await getTrackReviewQuestions(trackId)
            // Ensure they are sorted by orderIndex
            data.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
            setQuestions(data)
        } catch (err) {
            console.error("Failed to load questions:", err)
            toast.error("Failed to load review questions")
            setQuestions([])
        } finally {
            setLoadingQuestions(false)
        }
    }

    useEffect(() => {
        if (!selectedTrackId) return
        fetchQuestions(selectedTrackId)
    }, [selectedTrackId])

    const handleSaveQuestion = async (data: ReviewQuestionDTO) => {
        if (!selectedTrackId) return
        setIsSaving(true)
        try {
            if (data.id) {
                await updateTrackReviewQuestion(selectedTrackId, data.id, data)
                toast.success("Question updated successfully!")
            } else {
                await createTrackReviewQuestion(selectedTrackId, data)
                toast.success("Question created successfully!")
            }
            setShowQuestionDialog(false)
            setEditingQuestion(null)
            await fetchQuestions(selectedTrackId)
        } catch (err) {
            console.error("Failed to save question:", err)
            toast.error("Failed to save question. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteQuestion = async (questionId: number) => {
        if (!selectedTrackId) return
        if (!window.confirm("Are you sure you want to delete this question? This action cannot be undone.")) return
        try {
            await deleteTrackReviewQuestion(selectedTrackId, questionId)
            toast.success("Question deleted!")
            await fetchQuestions(selectedTrackId)
        } catch (err) {
            console.error("Failed to delete question:", err)
            toast.error("Failed to delete question")
        }
    }

    const handleReorder = async (index: number, direction: 'up' | 'down') => {
        if (!selectedTrackId) return
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === questions.length - 1) return

        const newQuestions = [...questions]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        
        // Swap elements locally
        const temp = newQuestions[index]
        newQuestions[index] = newQuestions[targetIndex]
        newQuestions[targetIndex] = temp

        const orderedIds = newQuestions.map(q => q.id as number)
        
        // Optimistic UI update
        setQuestions(newQuestions)

        try {
            await reorderTrackReviewQuestions(selectedTrackId, orderedIds)
        } catch (err) {
            console.error("Failed to reorder:", err)
            toast.error("Failed to save new order")
            // Revert on failure
            await fetchQuestions(selectedTrackId)
        }
    }

    const handleCopySubmit = async (targetTrackIds: number[]) => {
        if (!selectedTrackId) return
        try {
            for (const targetId of targetTrackIds) {
                await copyTrackReviewQuestions(selectedTrackId, targetId)
            }
            toast.success("Questions copied successfully!")
        } catch (err) {
            console.error("Failed to copy questions:", err)
            toast.error("Failed to copy questions to some tracks.")
        }
    }

    if (loadingTracks) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (tracks.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed rounded-lg">
                <p className="text-muted-foreground text-lg mb-2">No tracks found.</p>
                <p className="text-sm text-muted-foreground">Please create a track in the General tab first.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header / Track Selector */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex-1 max-w-sm">
                    <h3 className="text-sm font-semibold mb-2">Select Track to Configure</h3>
                    <Select
                        className="w-full h-10"
                        placeholder="Select a track"
                        value={selectedTrackId ?? undefined}
                        onChange={(val) => setSelectedTrackId(val)}
                        options={tracks.map((t) => ({ label: t.name, value: t.id }))}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setShowPreviewDialog(true)}>
                        <Eye className="h-4 w-4 mr-2" /> Preview Form
                    </Button>
                    {tracks.length > 1 && (
                        <Button variant="outline" onClick={() => setShowCopyDialog(true)}>
                            <Copy className="h-4 w-4 mr-2" /> Copy to Other Tracks
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            {loadingQuestions ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h3 className="text-lg font-semibold">Review Questions ({questions.length})</h3>
                        <Button onClick={() => { setEditingQuestion(null); setShowQuestionDialog(true); }}>
                            <Plus className="h-4 w-4 mr-2" /> Add New Question
                        </Button>
                    </div>

                    {questions.length === 0 ? (
                        <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
                            <p className="text-muted-foreground mb-4">No questions have been added to this track yet.</p>
                            <Button variant="outline" onClick={() => { setEditingQuestion(null); setShowQuestionDialog(true); }}>
                                Add First Question
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {questions.map((q, index) => (
                                <div key={q.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-xl bg-card shadow-sm hover:border-primary/50 transition-colors">
                                    {/* Order controls */}
                                    <div className="flex sm:flex-col items-center justify-center gap-1 bg-muted/50 rounded-lg p-1 sm:w-10 overflow-hidden shrink-0">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-muted-foreground hover:text-primary" 
                                            disabled={index === 0}
                                            onClick={() => handleReorder(index, 'up')}
                                        >
                                            <ArrowUp className="h-4 w-4" />
                                        </Button>
                                        <span className="text-xs font-semibold font-mono w-full text-center">{index + 1}</span>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-muted-foreground hover:text-primary" 
                                            disabled={index === questions.length - 1}
                                            onClick={() => handleReorder(index, 'down')}
                                        >
                                            <ArrowDown className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Question content */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                                        <div className="flex items-start gap-2 mb-1.5">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                                                {q.type.replace(/_/g, " ")}
                                            </span>
                                            {q.isRequired && (
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 shrink-0">
                                                    Required
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-semibold text-base line-clamp-2">{q.text}</h4>
                                        {q.note && <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{q.note}</p>}
                                        
                                        {(q.type === 'OPTIONS' || q.type === 'OPTIONS_WITH_VALUE') && q.choices && q.choices.length > 0 && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {q.choices.length} options (Displayed as {q.showAs})
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                                        <Button variant="outline" size="sm" onClick={() => { setEditingQuestion(q); setShowQuestionDialog(true); }}>
                                            <Pencil className="h-4 w-4 mr-2" /> Edit
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteQuestion(q.id as number)}>
                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            <ReviewQuestionDialog 
                open={showQuestionDialog} 
                onClose={() => { setShowQuestionDialog(false); setEditingQuestion(null); }} 
                initialData={editingQuestion}
                onSave={handleSaveQuestion}
                isSaving={isSaving}
            />
            
            <ReviewQuestionsPreview 
                open={showPreviewDialog}
                onClose={() => setShowPreviewDialog(false)}
                questions={questions}
            />

            <ReviewQuestionsCopyDialog
                open={showCopyDialog}
                onClose={() => setShowCopyDialog(false)}
                tracks={tracks}
                currentTrackId={selectedTrackId}
                onCopy={handleCopySubmit}
            />
        </div>
    )
}
