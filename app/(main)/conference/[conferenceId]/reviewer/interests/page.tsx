'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSubjectAreasByTrack, getTracksByConference } from '@/app/api/track.api'
import { createInterest, getInterestsByReviewer, deleteInterest } from '@/app/api/reviewer-interest.api'
import type { TrackResponse } from '@/types/track'
import type { SubjectAreaResponse } from '@/types/subject-area'
import type { ReviewerInterestResponse, Expertise } from '@/types/review'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Check, GraduationCap, BookOpen, Lightbulb } from 'lucide-react'
import toast from 'react-hot-toast'

const EXPERTISE_CONFIG: Record<Expertise, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    EXPERT: { label: 'Expert', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300', icon: <GraduationCap className="h-4 w-4" /> },
    KNOWLEDGEABLE: { label: 'Knowledgeable', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-300', icon: <BookOpen className="h-4 w-4" /> },
    INTERESTED: { label: 'Interested', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300', icon: <Lightbulb className="h-4 w-4" /> },
}

interface InterestSelection {
    subjectAreaId: number
    expertise: Expertise
    savedId?: number  // Server-saved ID
}

export default function ReviewerInterestsPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [allSubjectAreas, setAllSubjectAreas] = useState<SubjectAreaResponse[]>([])
    const [selections, setSelections] = useState<InterestSelection[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [reviewerId, setReviewerId] = useState<number | null>(null)

    useEffect(() => {
        try {
            const token = localStorage.getItem('accessToken')
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]))
                setReviewerId(payload.userId || payload.id)
            }
        } catch { /* ignore */ }
    }, [])

    const fetchData = async () => {
        if (!reviewerId) return
        try {
            setLoading(true)
            // Fetch tracks
            const tracksData = await getTracksByConference(conferenceId)
            setTracks(tracksData)

            // Fetch subject areas from all tracks
            const areasPromises = tracksData.map(t => getSubjectAreasByTrack(t.id).catch(() => []))
            const areasArrays = await Promise.all(areasPromises)
            const allAreas = areasArrays.flat()
            // Remove duplicates
            const uniqueAreas = allAreas.filter((area, idx, arr) =>
                arr.findIndex(a => a.id === area.id) === idx
            )
            setAllSubjectAreas(uniqueAreas)

            // Fetch saved interests by reviewerId
            const myInterests = await getInterestsByReviewer(reviewerId).catch(() => [])
            // Filter to only interests matching this conference's subject areas
            const conferenceAreaIds = new Set(uniqueAreas.map(a => a.id))
            const relevantInterests = myInterests.filter(i => conferenceAreaIds.has(i.subjectAreaId))
            setSelections(relevantInterests.map(i => ({
                subjectAreaId: i.subjectAreaId,
                expertise: i.expertise,
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

    const isSelected = (areaId: number) => selections.find(s => s.subjectAreaId === areaId)

    const handleToggle = (areaId: number, expertise: Expertise) => {
        const existing = selections.find(s => s.subjectAreaId === areaId)
        if (existing && existing.expertise === expertise) {
            // Deselect
            setSelections(prev => prev.filter(s => s.subjectAreaId !== areaId))
        } else {
            // Select or change expertise
            setSelections(prev => {
                const filtered = prev.filter(s => s.subjectAreaId !== areaId)
                return [...filtered, { subjectAreaId: areaId, expertise, savedId: existing?.savedId }]
            })
        }
    }

    const handleSave = async () => {
        if (!reviewerId) return
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
                    expertise: sel.expertise,
                })
            }

            toast.success('Areas of expertise saved!')

            // Re-fetch to update savedIds on UI
            const updated = await getInterestsByReviewer(reviewerId).catch(() => [])
            setSelections(updated.map(i => ({
                subjectAreaId: i.subjectAreaId,
                expertise: i.expertise,
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

    // Group subject areas by parent
    const parentAreas = allSubjectAreas.filter(a => a.parentId === null)
    const childAreas = allSubjectAreas.filter(a => a.parentId !== null)

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="space-y-4">
                <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push(`/conference/${conferenceId}/reviewer`)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Reviewer Console
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Select Areas of Expertise</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Select subject areas you have expertise in to help the system calculate relevance scores during bidding.
                    </p>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
                {Object.entries(EXPERTISE_CONFIG).map(([key, config]) => (
                    <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${config.bg} ${config.color}`}>
                        {config.icon}
                        {config.label}
                    </div>
                ))}
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
                        const areasToShow = [parent, ...children]

                        return (
                            <Card key={parent.id}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">{parent.name}</CardTitle>
                                    {parent.description && (
                                        <p className="text-sm text-muted-foreground">{parent.description}</p>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {areasToShow.map(area => {
                                        const sel = isSelected(area.id)
                                        return (
                                            <div key={area.id} className={`flex items-center justify-between p-3 rounded-lg transition-all ${sel ? 'bg-gray-50 ring-1 ring-gray-200' : 'hover:bg-gray-50'}`}>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {area.parentId !== null && <span className="text-gray-300 ml-4">└</span>}
                                                    <span className={`text-sm font-medium ${sel ? 'text-gray-900' : 'text-gray-700'}`}>
                                                        {area.name}
                                                    </span>
                                                    {sel && (
                                                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                                                    )}
                                                </div>
                                                <div className="flex gap-1.5 shrink-0">
                                                    {(Object.entries(EXPERTISE_CONFIG) as [Expertise, typeof EXPERTISE_CONFIG[Expertise]][]).map(([key, config]) => (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => handleToggle(area.id, key)}
                                                            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                                                                sel?.expertise === key
                                                                    ? `${config.bg} ${config.color} ring-1`
                                                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                                            }`}
                                                        >
                                                            {config.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>
                        )
                    })}

                    {/* Orphan areas (no parent) */}
                    {childAreas.filter(c => !parentAreas.find(p => p.id === c.parentId)).map(area => {
                        const sel = isSelected(area.id)
                        return (
                            <Card key={area.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{area.name}</span>
                                        <div className="flex gap-1.5">
                                            {(Object.entries(EXPERTISE_CONFIG) as [Expertise, typeof EXPERTISE_CONFIG[Expertise]][]).map(([key, config]) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => handleToggle(area.id, key)}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                                                        sel?.expertise === key
                                                            ? `${config.bg} ${config.color} ring-1`
                                                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                                    }`}
                                                >
                                                    {config.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Save button */}
            <div className="sticky bottom-4 flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="lg"
                    className="shadow-lg"
                >
                    {saving ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                        <>Save Expertise ({selections.length} selected)</>
                    )}
                </Button>
            </div>
        </div>
    )
}
