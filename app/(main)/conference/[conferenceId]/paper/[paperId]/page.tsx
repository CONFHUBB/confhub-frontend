'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// APIs
import { getPaperById, getAuthorsByPaper, type PaperAuthorItem } from '@/app/api/paper.api'
import { getConference } from '@/app/api/conference.api'
import { getAggregateByPaper, type ReviewAggregate } from '@/app/api/review-aggregate.api'
import { getMetaReviewByPaper } from '@/app/api/meta-review.api'

// Types
import type { PaperResponse } from '@/types/paper'
import type { ConferenceResponse } from '@/types/conference'
import type { MetaReviewResponse } from '@/types/meta-review'

// Hooks & Components
import { usePaperRole } from '@/hooks/usePaperRole'
import { PaperDetailHeader } from './paper-detail-header'

// Tab Components (lazy loaded per tab switch)
import { InfoTab } from './tabs/info-tab'
import { FilesTab } from './tabs/files-tab'
import { ReviewsTab } from './tabs/reviews-tab'
import { AssignmentsTab } from './tabs/assignments-tab'
import { ConflictsTab } from './tabs/conflicts-tab'
import { DiscussionTab } from './tabs/discussion-tab'
import { DecisionTab } from './tabs/decision-tab'
import { CameraReadyTab } from './tabs/camera-ready-tab'
import { HistoryTab } from './tabs/history-tab'

export default function PaperDetailPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()

    const conferenceId = Number(params.conferenceId)
    const paperId = Number(params.paperId)

    // ── Core Data ──
    const [paper, setPaper] = useState<PaperResponse | null>(null)
    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [authors, setAuthors] = useState<PaperAuthorItem[]>([])
    const [aggregate, setAggregate] = useState<ReviewAggregate | null>(null)
    const [metaReview, setMetaReview] = useState<MetaReviewResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // ── Tab State ──
    const initialTab = searchParams.get('tab') || 'info'
    const [activeTab, setActiveTab] = useState(initialTab)

    // ── Role Detection ──
    const { isChair, isReviewer, isAuthor, userId, permissions, visibleTabs, isLoading: roleLoading, isDoubleBlind } = usePaperRole(
        conferenceId, paper, authors,
        aggregate ? { reviewCount: aggregate.reviewCount, completedReviewCount: aggregate.completedReviewCount } : undefined
    )

    // ── Initial Data Fetch ──
    const fetchCoreData = useCallback(async () => {
        if (!conferenceId || !paperId) return
        try {
            setLoading(true)
            setError(null)
            const [paperData, confData, authorsData, aggData, mrData] = await Promise.all([
                getPaperById(paperId),
                getConference(conferenceId),
                getAuthorsByPaper(paperId).catch(() => []),
                getAggregateByPaper(paperId).catch(() => null),
                getMetaReviewByPaper(paperId).catch(() => null),
            ])
            setPaper(paperData)
            setConference(confData)
            setAuthors(authorsData || [])
            setAggregate(aggData)
            setMetaReview(mrData)
        } catch (err) {
            console.error('Failed to load paper detail:', err)
            setError('Paper not found or you do not have permission to view it.')
        } finally {
            setLoading(false)
        }
    }, [conferenceId, paperId])

    useEffect(() => {
        fetchCoreData()
    }, [fetchCoreData])

    // ── Tab Change Handler (updates URL) ──
    const handleTabChange = useCallback((tab: string) => {
        setActiveTab(tab)
        const url = new URL(window.location.href)
        url.searchParams.set('tab', tab)
        window.history.replaceState({}, '', url.toString())
    }, [])

    // ── Ensure active tab is valid ──
    useEffect(() => {
        if (!roleLoading && visibleTabs.length > 0) {
            const isValid = visibleTabs.some(t => t.key === activeTab)
            if (!isValid) {
                handleTabChange(visibleTabs[0]?.key || 'info')
            }
        }
    }, [roleLoading, visibleTabs, activeTab, handleTabChange])

    // ── Data refresh after mutation ──
    const handleDataChanged = useCallback(() => {
        fetchCoreData()
    }, [fetchCoreData])

    // ── Loading State ──
    if (loading || roleLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading paper details...</p>
                </div>
            </div>
        )
    }

    // ── Error State ──
    if (error || !paper) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="text-center space-y-2">
                    <p className="text-lg font-semibold text-destructive">Paper Not Found</p>
                    <p className="text-sm text-muted-foreground">{error || 'The paper you are looking for does not exist.'}</p>
                </div>
                <Button variant="outline" onClick={() => router.back()}>
                    ← Back to Workspace
                </Button>
            </div>
        )
    }

    // ── Render Active Tab Content ──
    const renderTabContent = () => {
        switch (activeTab) {
            case 'info':
                return <InfoTab paper={paper} paperId={paperId} authors={authors} isChair={isChair} />
            case 'files':
                return <FilesTab paperId={paperId} conferenceId={conferenceId} isAuthor={isAuthor} />
            case 'reviews':
                return <ReviewsTab paperId={paperId} paper={paper} conferenceId={conferenceId} isChair={isChair} isAuthor={isAuthor} isDoubleBlind={isDoubleBlind} />
            case 'assignments':
                return <AssignmentsTab paperId={paperId} conferenceId={conferenceId} />
            case 'conflicts':
                return <ConflictsTab paperId={paperId} conferenceId={conferenceId} isChair={isChair} isAuthor={isAuthor} />
            case 'discussion':
                return <DiscussionTab paperId={paperId} userId={userId} isChair={isChair} isReviewer={isReviewer} isAuthor={isAuthor} conferenceId={conferenceId} />
            case 'decision':
                return <DecisionTab paperId={paperId} conferenceId={conferenceId} userId={userId} metaReview={metaReview} paper={paper} aggregate={aggregate} isChair={isChair} onChanged={handleDataChanged} />
            case 'camera-ready':
                return <CameraReadyTab paperId={paperId} conferenceId={conferenceId} paper={paper} isChair={isChair} />
            case 'history':
                return <HistoryTab paperId={paperId} conferenceId={conferenceId} />
            default:
                return <InfoTab paper={paper} paperId={paperId} authors={authors} isChair={isChair} />
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-0">
            {/* ── 1. Paper Metadata Card ── */}
            <PaperDetailHeader
                paper={paper}
                authors={authors}
                metaReview={metaReview}
                reviewCount={aggregate?.reviewCount || 0}
                completedReviewCount={aggregate?.completedReviewCount || 0}
                averageTotalScore={aggregate?.completedReviewCount ? aggregate.averageTotalScore : null}
                isChair={isChair}
                isReviewer={isReviewer}
                isAuthor={isAuthor}
                isDoubleBlind={isDoubleBlind}
                permissions={permissions}
                conferenceId={conferenceId}
                conferenceName={conference?.name}
                onTabChange={handleTabChange}
            />

            {/* ── 2. Horizontal Tab Bar ── */}
            <div className="border-b bg-background sticky top-0 z-10 mt-6">
                <div className="flex gap-1 overflow-x-auto -mb-px">
                    {visibleTabs.map(tab => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.key
                        return (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-3 text-sm font-medium',
                                    'border-b-2 transition-colors whitespace-nowrap',
                                    isActive
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                                {tab.badge && (
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                                        {tab.badge}
                                    </Badge>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* ── 3. Tab Content Area ── */}
            <div className="py-6">
                {renderTabContent()}
            </div>
        </div>
    )
}
