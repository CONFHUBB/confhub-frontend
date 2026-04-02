'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, ClipboardList, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReviewResponse } from '@/types/review'
import { FilterPanel } from '@/components/ui/filter-panel'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PlagiarismBadge } from '@/components/plagiarism-badge'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
    ASSIGNED: 'bg-amber-100 text-amber-800 border-amber-200',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    DECLINED: 'bg-red-100 text-red-800 border-red-200',
    SUBMITTED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
}

interface ReviewsTabProps {
    reviews: ReviewResponse[]
    conferenceId: number
    loading?: boolean
}

export function ReviewsTab({ reviews, conferenceId, loading = false }: ReviewsTabProps) {
    const [expandedReview, setExpandedReview] = useState<number | null>(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [currentPage, setCurrentPage] = useState(0)
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
                                { value: 'SUBMITTED', label: 'Draft' },
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
                                <TableHead className="w-16 text-center">#</TableHead>
                                <TableHead>Paper Title</TableHead>
                                <TableHead className="w-32">Status</TableHead>
                                <TableHead className="w-24 text-center">Score</TableHead>
                                <TableHead className="w-32 text-center">Plagiarism</TableHead>
                                <TableHead className="w-28 text-right">Action</TableHead>
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
                                            <Badge className={`border ${STATUS_COLORS[review.status] || 'bg-gray-100 text-gray-800'}`}>
                                                {review.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-mono">
                                            {review.totalScore != null ? review.totalScore : '—'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <PlagiarismBadge paperId={review.paper?.id!} score={review.paper?.plagiarismScore} status={review.paper?.plagiarismStatus} />
                                        </TableCell>
                                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                            {review.status !== 'DECLINED' && (
                                                <Link href={`/conference/${conferenceId}/reviewer/review/${review.id}`}>
                                                    <Button size="sm" variant={review.status === 'COMPLETED' ? 'outline' : 'default'} className="h-8">
                                                        {review.status === 'COMPLETED' ? 'View' : review.status === 'ASSIGNED' ? 'Start' : 'Continue'}
                                                    </Button>
                                                </Link>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 mt-4 rounded-b-lg border">
                    <div className="text-sm text-muted-foreground">
                        Page {currentPage + 1} of {totalPages} · {filteredReviews.length} reviews total
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => p - 1)}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage((p) => p + 1)}>
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
