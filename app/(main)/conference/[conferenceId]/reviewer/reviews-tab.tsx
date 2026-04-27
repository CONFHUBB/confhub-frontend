'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, ClipboardList, Download, Check, X, Loader2 } from 'lucide-react'
import { StandardPagination } from '@/components/ui/standard-pagination'
import type { ReviewResponse } from '@/types/review'
import { FilterPanel } from '@/components/ui/filter-panel'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { reviewStatusClass } from '@/lib/constants/status'
import { updateReview } from '@/app/api/review.api'

interface ReviewsTabProps {
    reviews: ReviewResponse[]
    conferenceId: number
    loading?: boolean
    onRefresh?: () => void
}

export function ReviewsTab({ reviews, conferenceId, loading = false, onRefresh }: ReviewsTabProps) {
    const [expandedReview, setExpandedReview] = useState<number | null>(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [currentPage, setCurrentPage] = useState(0)
    const [actionLoading, setActionLoading] = useState<number | null>(null)
    const PAGE_SIZE = 10

    const filteredReviews = useMemo(() => {
        return reviews.filter(r => {
            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
            if (search) {
                const q = search.toLowerCase()
                const titleMatch = r.paper?.title?.toLowerCase().includes(q)
                const idMatch = String(r.paper?.id).includes(q)
                if (!titleMatch && !idMatch) return false
            }
            return true
        })
    }, [reviews, search, statusFilter])

    const paginatedReviews = useMemo(() => {
        const start = currentPage * PAGE_SIZE
        const end = start + PAGE_SIZE
        return filteredReviews.slice(start, end)
    }, [filteredReviews, currentPage, PAGE_SIZE])

    const totalPages = Math.ceil(filteredReviews.length / PAGE_SIZE)

    const handleAccept = async (review: ReviewResponse) => {
        try {
            setActionLoading(review.id)
            await updateReview(review.id, {
                paperId: review.paper.id,
                reviewerId: review.reviewer.id,
                status: 'IN_PROGRESS',
            })
            toast.success('Review accepted! You can now start reviewing.')
            onRefresh?.()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to accept review')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDecline = async (review: ReviewResponse) => {
        try {
            setActionLoading(review.id)
            await updateReview(review.id, {
                paperId: review.paper.id,
                reviewerId: review.reviewer.id,
                status: 'DECLINED',
            })
            toast.success('Review declined. The chair has been notified.')
            onRefresh?.()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to decline review')
        } finally {
            setActionLoading(null)
        }
    }

    const exportCsv = () => {
        try {
            const headers = ['Review ID', 'Paper ID', 'Paper Title', 'Status', 'Score']
            const rows = filteredReviews.map(r => [
                r.id,
                r.paper?.id || '',
                `"${r.paper?.title?.replace(/"/g, '""') || ''}"`,
                r.status,
                r.totalScore != null ? r.totalScore : ''
            ])
            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `reviews-conf-${conferenceId}.csv`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            toast.error('Failed to export reviews CSV')
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-bold">Assigned Reviews</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {reviews.length} paper(s) assigned to you.
                </p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search paper title or ID..."
                        className="pl-9 h-9 text-sm"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
                    />
                </div>
                <FilterPanel
                    groups={[
                        {
                            label: 'Status',
                            type: 'pills',
                            options: [
                                { value: 'ALL', label: 'All' },
                                { value: 'ASSIGNED', label: 'Assigned' },
                                { value: 'IN_PROGRESS', label: 'In Progress' },
                                { value: 'COMPLETED', label: 'Completed' },
                                { value: 'DECLINED', label: 'Declined' },
                            ],
                            value: statusFilter,
                            onChange: (v) => { setStatusFilter(v); setCurrentPage(0) },
                        },
                    ]}
                />
                <Button variant="outline" size="sm" className="gap-2 text-xs h-9 bg-white" onClick={exportCsv} disabled={loading || filteredReviews.length === 0}>
                    <Download className="h-3.5 w-3.5" /> Export CSV
                </Button>
            </div>

            {loading ? (
                <TableSkeleton
                    rows={5}
                    headers={['#', 'Paper Title', 'Status', 'Score', 'Action']}
                    className="rounded-lg border overflow-hidden"
                />
            ) : filteredReviews.length === 0 ? (
                <EmptyState
                    emoji={search || statusFilter !== 'ALL' ? '🔍' : '📝'}
                    title={search || statusFilter !== 'ALL' ? 'No reviews match the filter' : 'No papers assigned yet'}
                    description={search || statusFilter !== 'ALL' ? 'Try adjusting your search or filter settings.' : 'The Chair will assign papers after bidding is complete.'}
                />
            ) : (
                <div className="rounded-lg border overflow-hidden bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-12 text-center">#</TableHead>
                                <TableHead>Paper Title</TableHead>
                                <TableHead className="w-32">Status</TableHead>
                                <TableHead className="w-24 text-center">Score</TableHead>
                                <TableHead className="w-44 text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedReviews.map((review, i) => (
                                <React.Fragment key={review.id}>
                                    <TableRow className="cursor-pointer hover:bg-indigo-50/30 transition-colors" onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}>
                                        <TableCell className="font-medium text-xs text-center text-muted-foreground">{currentPage * PAGE_SIZE + i + 1}</TableCell>
                                        <TableCell className="max-w-md font-medium">
                                            <span className="truncate block">{review.paper?.title || `Paper #${review.paper?.id}`}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`border ${reviewStatusClass(review.status)}`}>
                                                {review.status === 'IN_PROGRESS' ? 'In Progress' : review.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-mono">
                                            {review.totalScore != null ? review.totalScore : '—'}
                                        </TableCell>
                                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                            {review.status === 'ASSIGNED' && (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Accept */}
                                                    <Button
                                                        size="sm"
                                                        className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        disabled={actionLoading === review.id}
                                                        onClick={() => handleAccept(review)}
                                                    >
                                                        {actionLoading === review.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Check className="h-3.5 w-3.5" />
                                                        )}
                                                        Accept
                                                    </Button>
                                                    {/* Decline */}
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                disabled={actionLoading === review.id}
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                                Decline
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Decline this review?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    You will not be able to review "{review.paper?.title}" after declining. 
                                                                    The conference chair will be notified and may reassign the paper to another reviewer.
                                                                    This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                    onClick={() => handleDecline(review)}
                                                                >
                                                                    Decline Review
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            )}
                                            {review.status === 'IN_PROGRESS' && (
                                                <Link href={`/conference/${conferenceId}/reviewer/review/${review.id}`}>
                                                    <Button size="sm" className="h-8">Continue</Button>
                                                </Link>
                                            )}
                                            {review.status === 'COMPLETED' && (
                                                <Link href={`/conference/${conferenceId}/reviewer/review/${review.id}`}>
                                                    <Button size="sm" variant="outline" className="h-8">View</Button>
                                                </Link>
                                            )}
                                            {review.status === 'DECLINED' && (
                                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                    Declined
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                    {expandedReview === review.id && review.paper?.abstractField && (
                                        <TableRow className="bg-indigo-50/30 hover:bg-indigo-50/30">
                                            <TableCell colSpan={5} className="py-4">
                                                <div className="text-sm text-gray-600 max-w-4xl pl-6 border-l-2 border-indigo-200 ml-4">
                                                    <p className="font-medium text-gray-700 text-[10px] uppercase tracking-wider mb-1">Abstract</p>
                                                    <p className="leading-relaxed whitespace-pre-wrap">{review.paper.abstractField}</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <StandardPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalElements={filteredReviews.length}
                entityName="reviews"
                onPageChange={setCurrentPage}
            />
        </div>
    )
}

