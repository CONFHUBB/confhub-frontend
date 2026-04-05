'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSubjectAreasByTrack, getTracksByConference } from '@/app/api/track.api'
import { createInterest, getInterestsByReviewer, deleteInterest } from '@/app/api/reviewer-interest.api'
import type { TrackResponse } from '@/types/track'
import type { SubjectAreaResponse } from '@/types/subject-area'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Star, CheckSquare, Square } from 'lucide-react'
import { toast } from 'sonner'
import { getCurrentUserId } from '@/lib/auth'

interface InterestSelection {
    subjectAreaId: number
    isPrimary: boolean
    savedId?: number
}

export default function ReviewerInterestsPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [allSubjectAreas, setAllSubjectAreas] = useState<SubjectAreaResponse[]>([])
    const [selections, setSelections] = useState<InterestSelection[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [reviewerId, setReviewerId] = useState<number | null>(null)

    useEffect(() => {
        setReviewerId(getCurrentUserId())
    }, [])

    const fetchData = async () => {
        if (!reviewerId) return
        try {
            setLoading(true)
            const tracksData = await getTracksByConference(conferenceId)

            const areasPromises = tracksData.map(t => getSubjectAreasByTrack(t.id).catch(() => []))
            const areasArrays = await Promise.all(areasPromises)
            const allAreas = areasArrays.flat()
            const uniqueAreas = allAreas.filter((area, idx, arr) =>
                arr.findIndex(a => a.id === area.id) === idx
            )
            setAllSubjectAreas(uniqueAreas)

            const myInterests = await getInterestsByReviewer(reviewerId).catch(() => [])
            const conferenceAreaIds = new Set(uniqueAreas.map(a => a.id))
            const relevantInterests = myInterests.filter(i => conferenceAreaIds.has(i.subjectAreaId))
            setSelections(relevantInterests.map(i => ({
                subjectAreaId: i.subjectAreaId,
                isPrimary: i.isPrimary,
                savedId: i.id,
            })))
        } catch (err) {
            console.error('Failed to load data:', err)
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [conferenceId, reviewerId])

    const primarySelection = selections.find(s => s.isPrimary)
    const secondarySelections = selections.filter(s => !s.isPrimary)

    const handleSetPrimary = (areaId: number) => {
        if (primarySelection?.subjectAreaId === areaId) {
            // Deselect primary
            setSelections(prev => prev.filter(s => !(s.subjectAreaId === areaId && s.isPrimary)))
        } else {
            setSelections(prev => {
                // Remove old primary + remove this area from secondary if it was there
                const withoutOldPrimary = prev.filter(s => !s.isPrimary)
                const withoutThisArea = withoutOldPrimary.filter(s => s.subjectAreaId !== areaId)
                return [...withoutThisArea, { subjectAreaId: areaId, isPrimary: true }]
            })
        }
    }

    const handleToggleSecondary = (areaId: number) => {
        // Cannot add as secondary if it's the primary
        if (primarySelection?.subjectAreaId === areaId) return

        const existing = secondarySelections.find(s => s.subjectAreaId === areaId)
        if (existing) {
            // Deselect
            setSelections(prev => prev.filter(s => !(s.subjectAreaId === areaId && !s.isPrimary)))
        } else {
            // Select as secondary
            setSelections(prev => [...prev, { subjectAreaId: areaId, isPrimary: false }])
        }
    }

    const handleSave = async () => {
        if (!reviewerId) return
        if (!primarySelection) {
            toast.error('Please select a Primary Subject Area before saving.')
            return
        }
        setSaving(true)
        try {
            // Delete all existing
            const myInterests = await getInterestsByReviewer(reviewerId).catch(() => [])
            for (const interest of myInterests) {
                await deleteInterest(interest.id)
            }

            // Re-create
            for (const sel of selections) {
                await createInterest({
                    reviewerId,
                    subjectAreaId: sel.subjectAreaId,
                    isPrimary: sel.isPrimary,
                })
            }

            toast.success('Subject areas saved!')

            const updated = await getInterestsByReviewer(reviewerId).catch(() => [])
            const conferenceAreaIds = new Set(allSubjectAreas.map(a => a.id))
            setSelections(updated.filter(i => conferenceAreaIds.has(i.subjectAreaId)).map(i => ({
                subjectAreaId: i.subjectAreaId,
                isPrimary: i.isPrimary,
                savedId: i.id,
            })))
        } catch (err) {
            console.error('Failed to save:', err)
            toast.error('Save failed')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const parentAreas = allSubjectAreas.filter(a => a.parentId === null)
    const childAreas = allSubjectAreas.filter(a => a.parentId !== null)

    const renderSubjectAreaRow = (area: SubjectAreaResponse, isChild: boolean) => {
        const isPrimary = primarySelection?.subjectAreaId === area.id
        const isSecondary = !!secondarySelections.find(s => s.subjectAreaId === area.id)

        return (
            <div
                key={area.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    isPrimary
                        ? 'bg-violet-50 ring-2 ring-violet-300'
                        : isSecondary
                            ? 'bg-indigo-50 ring-1 ring-indigo-200'
                            : 'hover:bg-gray-50'
                }`}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {isChild && <span className="text-gray-300 ml-4">└</span>}
                    <span className={`text-sm font-medium ${isPrimary ? 'text-violet-900' : isSecondary ? 'text-indigo-900' : 'text-gray-700'}`}>
                        {area.name}
                    </span>
                    {isPrimary && (
                        <Badge className="bg-violet-600 text-white text-[10px] px-1.5 py-0">
                            <Star className="h-3 w-3 mr-0.5 fill-current" /> PRIMARY
                        </Badge>
                    )}
                    {isSecondary && (
                        <Badge variant="outline" className="border-indigo-400 text-indigo-600 text-[10px] px-1.5 py-0">
                            SECONDARY
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Primary button */}
                    <button
                        type="button"
                        onClick={() => handleSetPrimary(area.id)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all flex items-center gap-1.5 ${
                            isPrimary
                                ? 'bg-violet-100 border-violet-400 text-violet-700 ring-1 ring-violet-300'
                                : 'bg-white border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600'
                        }`}
                    >
                        <Star className={`h-3.5 w-3.5 ${isPrimary ? 'fill-violet-500' : ''}`} />
                        Primary
                    </button>

                    {/* Secondary checkbox */}
                    <button
                        type="button"
                        onClick={() => handleToggleSecondary(area.id)}
                        disabled={isPrimary}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all flex items-center gap-1.5 ${
                            isPrimary
                                ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                                : isSecondary
                                    ? 'bg-indigo-100 border-indigo-400 text-indigo-700 ring-1 ring-blue-300'
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                    >
                        {isSecondary ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                        Secondary
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="space-y-4">
                <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push(`/conference/${conferenceId}/reviewer`)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Reviewer Console
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Select Subject Areas</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Select <strong>one Primary</strong> subject area (your main expertise) and optionally add <strong>Secondary</strong> areas.
                        This is used to calculate relevance scores for paper matching.
                    </p>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium bg-violet-100 border-violet-300 text-violet-700">
                    <Star className="h-4 w-4 fill-violet-500" />
                    Primary (1 only)
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium bg-indigo-100 border-indigo-300 text-indigo-700">
                    <CheckSquare className="h-4 w-4" />
                    Secondary (multiple)
                </div>
            </div>

            {/* Subject Areas */}
            {allSubjectAreas.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <p>No subject areas configured for this conference yet.</p>
                        <p className="text-sm mt-1">Contact the Chair to set them up.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {parentAreas.map(parent => {
                        const children = childAreas.filter(c => c.parentId === parent.id)
                        return (
                            <Card key={parent.id}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">{parent.name}</CardTitle>
                                    {parent.description && (
                                        <p className="text-sm text-muted-foreground">{parent.description}</p>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {renderSubjectAreaRow(parent, false)}
                                    {children.map(child => renderSubjectAreaRow(child, true))}
                                </CardContent>
                            </Card>
                        )
                    })}

                    {childAreas.filter(c => !parentAreas.find(p => p.id === c.parentId)).length > 0 && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Other Subject Areas</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {childAreas
                                    .filter(c => !parentAreas.find(p => p.id === c.parentId))
                                    .map(area => renderSubjectAreaRow(area, false))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Summary + Save */}
            <div className="sticky bottom-4 flex items-center justify-between bg-white/90 backdrop-blur-sm rounded-xl border p-4 shadow-lg">
                <div className="text-sm text-muted-foreground space-y-0.5">
                    <div>
                        <span className="font-medium text-violet-700">
                            Primary: {primarySelection ? allSubjectAreas.find(a => a.id === primarySelection.subjectAreaId)?.name || '—' : 'None selected'}
                        </span>
                    </div>
                    <div className="text-xs">
                        Secondary: {secondarySelections.length} selected
                    </div>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="lg"
                    className="shadow-lg"
                >
                    {saving ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                        <>Save Subject Areas</>
                    )}
                </Button>
            </div>
        </div>
    )
}
