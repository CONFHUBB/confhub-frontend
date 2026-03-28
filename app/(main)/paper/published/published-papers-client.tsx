'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    Search, Users, Calendar, BookOpen,
    ChevronLeft, ChevronRight, ExternalLink, FileText, Loader2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getPublishedPapers, type PublishedPaperDTO } from '@/app/api/paper.api'
import toast from 'react-hot-toast'

// ─── Paper Card ───────────────────────────────────────────────────────
function PaperCard({ paper, onViewDetail }: { paper: PublishedPaperDTO; onViewDetail: () => void }) {
    const formatDate = (iso?: string) => {
        if (!iso) return '—'
        try {
            return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        } catch { return '—' }
    }

    const authorDisplay = paper.authorNames && paper.authorNames.length > 0
        ? paper.authorNames.slice(0, 3).join(', ') + (paper.authorNames.length > 3 ? ` & ${paper.authorNames.length - 3} more` : '')
        : 'Unknown authors'

    return (
        <Card className="flex flex-col h-full border border-gray-200 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 bg-white overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500" />

            <CardHeader className="pb-2 pt-4 px-5 gap-2">
                {paper.conferenceName && (
                    <Badge
                        variant="outline"
                        className="w-fit text-[11px] px-2 py-0.5 border-indigo-200 text-indigo-700 bg-indigo-50 font-medium truncate max-w-full"
                        title={paper.conferenceName}
                    >
                        {paper.conferenceName}
                    </Badge>
                )}
                <h3
                    className="text-[15px] font-bold leading-snug line-clamp-2 text-gray-900 group-hover:text-indigo-700 transition-colors"
                    title={paper.title}
                >
                    {paper.title}
                </h3>
            </CardHeader>

            <CardContent className="flex-1 px-5 pb-3 space-y-2">
                <div className="flex items-start gap-2 text-sm text-gray-500">
                    <Users className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
                    <span className="italic line-clamp-1" title={paper.authorNames?.join(', ')}>
                        {authorDisplay}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatDate(paper.submissionTime)}</span>
                </div>
            </CardContent>

            <CardFooter className="px-5 pb-4 pt-0 flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1.5 border-gray-200 text-gray-600 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50"
                    onClick={onViewDetail}
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Detail
                </Button>
                <Button
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={onViewDetail}
                >
                    <FileText className="h-3.5 w-3.5" />
                    Read Abstract
                </Button>
            </CardFooter>
        </Card>
    )
}

// ─── Skeleton Card ─────────────────────────────────────────────────────
function PaperCardSkeleton() {
    return (
        <Card className="flex flex-col h-56 border border-gray-200 rounded-xl overflow-hidden animate-pulse">
            <div className="h-1 w-full bg-gray-200" />
            <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="h-4 w-1/2 bg-gray-100 rounded-full" />
                <div className="h-5 w-full bg-gray-200 rounded" />
                <div className="h-5 w-4/5 bg-gray-200 rounded" />
                <div className="h-3 w-2/3 bg-gray-100 rounded mt-auto" />
                <div className="h-3 w-1/3 bg-gray-100 rounded" />
            </div>
        </Card>
    )
}

// ─── Main Client Component ─────────────────────────────────────────────
export default function PublishedPapersClient() {
    const router = useRouter()

    const [papers, setPapers] = useState<PublishedPaperDTO[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [totalElements, setTotalElements] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const [inputValue, setInputValue] = useState('')
    const PAGE_SIZE = 12

    const fetchPapers = useCallback(async (page: number, search: string) => {
        try {
            setIsLoading(true)
            const result = await getPublishedPapers(page, PAGE_SIZE, search || undefined)
            setPapers(result.content ?? [])
            setTotalPages(result.totalPages ?? 1)
            setTotalElements(result.totalElements ?? 0)
        } catch {
            toast.error('Failed to load published papers.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Initial load
    useEffect(() => {
        fetchPapers(currentPage, searchQuery)
    }, [currentPage, fetchPapers])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (inputValue !== searchQuery) {
                setSearchQuery(inputValue)
                setCurrentPage(0)
                fetchPapers(0, inputValue)
            }
        }, 450)
        return () => clearTimeout(timer)
    }, [inputValue])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setSearchQuery(inputValue)
        setCurrentPage(0)
        fetchPapers(0, inputValue)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── Hero / Search Header ── */}
            <div className="bg-gradient-to-br from-[#1e1b4b] via-[#272463] to-[#312e81] py-14 px-4">
                <div className="max-w-3xl mx-auto text-center space-y-5">
                    <div className="flex items-center justify-center gap-2.5 mb-1">
                        <BookOpen className="h-8 w-8 text-indigo-300" />
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">
                            Published Papers
                        </h1>
                    </div>
                    <p className="text-indigo-200 text-base">
                        Browse accepted &amp; published research across all conferences on Confhub
                    </p>

                    {/* Search bar */}
                    <form onSubmit={handleSearch} className="relative max-w-xl mx-auto mt-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        <Input
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            placeholder="Search by title or keyword..."
                            className="pl-11 pr-4 h-12 rounded-xl text-base border-0 shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-400 bg-white"
                        />
                        <Button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                        >
                            Search
                        </Button>
                    </form>

                    {/* Result count */}
                    {!isLoading && (
                        <p className="text-indigo-200/70 text-sm pt-1">
                            {totalElements.toLocaleString()} paper{totalElements !== 1 ? 's' : ''} found
                            {searchQuery && <span> for &quot;<strong className="text-white">{searchQuery}</strong>&quot;</span>}
                        </p>
                    )}
                </div>
            </div>

            {/* ── Paper Grid ── */}
            <div className="max-w-7xl mx-auto px-4 py-10">
                {isLoading ? (
                    <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: PAGE_SIZE }).map((_, i) => <PaperCardSkeleton key={i} />)}
                    </div>
                ) : papers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                        <BookOpen className="h-16 w-16 text-gray-200" />
                        <p className="text-xl font-semibold text-gray-400">No papers found</p>
                        {searchQuery && (
                            <Button variant="outline" onClick={() => { setInputValue(''); setSearchQuery(''); setCurrentPage(0); fetchPapers(0, '') }}>
                                Clear search
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {papers.map(paper => (
                            <PaperCard
                                key={paper.id}
                                paper={paper}
                                onViewDetail={() => router.push(`/conference/${paper.conferenceId}`)}
                            />
                        ))}
                    </div>
                )}

                {/* ── Pagination ── */}
                {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-10">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0"
                            disabled={currentPage === 0}
                            onClick={() => setCurrentPage(p => p - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {Array.from({ length: totalPages }, (_, i) => i)
                            .slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 3))
                            .map(i => (
                                <Button
                                    key={i}
                                    size="sm"
                                    variant={currentPage === i ? 'default' : 'outline'}
                                    className={`h-9 w-9 p-0 text-sm ${currentPage === i ? 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600' : ''}`}
                                    onClick={() => setCurrentPage(i)}
                                >
                                    {i + 1}
                                </Button>
                            ))
                        }

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0"
                            disabled={currentPage >= totalPages - 1}
                            onClick={() => setCurrentPage(p => p + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
