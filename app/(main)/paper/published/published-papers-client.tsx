'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    Search, Users, Calendar, BookOpen, Tag, Layers,
    ChevronLeft, ChevronRight, ExternalLink, FileText, Loader2,
    Eye, Download, X, ArrowUpRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { getPublishedPapers, getPaperFilesByPaperId, type PublishedPaperDTO } from '@/app/api/paper.api'
import type { PaperFileResponse } from '@/types/paper'
import { toast } from 'sonner'
import Link from 'next/link'
import { fmtDate } from '@/lib/utils'

// ─── Paper Card ───────────────────────────────────────────────────────
function PaperCard({ paper, onReadPaper }: { paper: PublishedPaperDTO; onReadPaper: () => void }) {
    const formatDate = (iso?: string) => {
        if (!iso) return '—'
        return fmtDate(iso)
    }

    const authorDisplay = paper.authorNames && paper.authorNames.length > 0
        ? paper.authorNames.slice(0, 3).join(', ') + (paper.authorNames.length > 3 ? ` & ${paper.authorNames.length - 3} more` : '')
        : 'Unknown authors'

    return (
        <Card className="flex flex-col h-full border border-gray-200 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 bg-white overflow-hidden group">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400" />

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
                {paper.keywords && paper.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {paper.keywords.slice(0, 3).map((kw, i) => (
                            <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">
                                {kw}
                            </span>
                        ))}
                        {paper.keywords.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{paper.keywords.length - 3}</span>
                        )}
                    </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatDate(paper.submissionTime)}</span>
                </div>
            </CardContent>

            <CardFooter className="px-5 pb-4 pt-0 flex items-center gap-2">
                <Button
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={onReadPaper}
                >
                    <Eye className="h-3.5 w-3.5" />
                    Read Paper
                </Button>
                <Link href={`/conference/${paper.conferenceId}`}>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 border-gray-200 text-gray-600 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50"
                    >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        Conference
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    )
}

// ─── Paper Detail Dialog ──────────────────────────────────────────────
function PaperDetailDialog({
    paper,
    open,
    onClose,
}: {
    paper: PublishedPaperDTO | null
    open: boolean
    onClose: () => void
}) {
    const [files, setFiles] = useState<PaperFileResponse[]>([])
    const [loadingFiles, setLoadingFiles] = useState(false)

    useEffect(() => {
        if (open && paper) {
            setLoadingFiles(true)
            getPaperFilesByPaperId(paper.id)
                .then((data) => setFiles(data))
                .catch(() => setFiles([]))
                .finally(() => setLoadingFiles(false))
        } else {
            setFiles([])
        }
    }, [open, paper])

    if (!paper) return null

    const cameraReadyFile = files.find(f => f.isCameraReady && f.isActive)
    const latestFile = cameraReadyFile || files.find(f => f.isActive) || files[0]

    const formatDate = (iso?: string) => {
        if (!iso) return '—'
        return fmtDate(iso)
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="!max-w-3xl max-h-[90vh] overflow-y-auto sm:rounded-2xl">
                <DialogHeader className="pb-4 border-b">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                            {paper.conferenceName && (
                                <Link href={`/conference/${paper.conferenceId}`}>
                                    <Badge
                                        variant="outline"
                                        className="w-fit text-xs px-2.5 py-0.5 border-indigo-200 text-indigo-700 bg-indigo-50 font-medium hover:bg-indigo-100 transition-colors cursor-pointer"
                                    >
                                        {paper.conferenceName}
                                    </Badge>
                                </Link>
                            )}
                            <DialogTitle className="text-xl font-bold text-gray-900 leading-tight">
                                {paper.title}
                            </DialogTitle>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Authors */}
                    {paper.authorNames && paper.authorNames.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" /> Authors
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {paper.authorNames.map((name, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                            {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">{name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Track & Date */}
                    <div className="grid grid-cols-2 gap-4">
                        {paper.trackName && (
                            <div className="bg-gray-50 rounded-lg p-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                                    <Layers className="h-3 w-3" /> Track
                                </h4>
                                <p className="text-sm font-medium text-gray-700">{paper.trackName}</p>
                            </div>
                        )}
                        <div className="bg-gray-50 rounded-lg p-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" /> Published
                            </h4>
                            <p className="text-sm font-medium text-gray-700">{formatDate(paper.submissionTime)}</p>
                        </div>
                    </div>

                    {/* Keywords */}
                    {paper.keywords && paper.keywords.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5" /> Keywords
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {paper.keywords.map((kw, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs font-normal bg-indigo-50 text-indigo-700 border-indigo-200">
                                        {kw}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Abstract */}
                    {paper.abstractField && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" /> Abstract
                            </h4>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                    {paper.abstractField}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Camera-Ready File */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5" /> Camera-Ready Paper
                        </h4>
                        {loadingFiles ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                                <span className="ml-2 text-sm text-gray-400">Loading files...</span>
                            </div>
                        ) : latestFile ? (
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                {/* PDF Preview */}
                                <div className="bg-gray-100 border-b">
                                    <iframe
                                        src={latestFile.url}
                                        className="w-full h-[500px]"
                                        title={`${paper.title} - PDF`}
                                    />
                                </div>
                                {/* Download bar */}
                                <div className="flex items-center justify-between px-4 py-3 bg-white">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-red-500" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">
                                                {cameraReadyFile ? 'Camera-Ready Version' : 'Submitted Manuscript'}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                Uploaded {formatDate(latestFile.uploadedAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <a href={latestFile.url} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                                            <Download className="h-3.5 w-3.5" />
                                            Download PDF
                                        </Button>
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <FileText className="h-10 w-10 text-gray-200 mb-2" />
                                <p className="text-sm text-gray-400">No file available for this paper yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <Link href={`/conference/${paper.conferenceId}`}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Conference
                        </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="text-sm text-gray-500" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
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
    const [papers, setPapers] = useState<PublishedPaperDTO[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [totalElements, setTotalElements] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const [inputValue, setInputValue] = useState('')
    const PAGE_SIZE = 12

    // Dialog state
    const [selectedPaper, setSelectedPaper] = useState<PublishedPaperDTO | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

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

    const handleReadPaper = (paper: PublishedPaperDTO) => {
        setSelectedPaper(paper)
        setDialogOpen(true)
    }

    return (
        <div>
            {/* ── Hero / Search Header ── */}
            <div className="page-wide pb-0">
                <div className="relative mb-2 p-10 sm:p-14 bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800 text-center">
                    {/* Decorative background blobs */}
                    <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/15 to-indigo-400/15 dark:from-indigo-500/20 dark:to-indigo-400/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
                    <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-500/15 to-teal-500/15 dark:from-blue-500/20 dark:to-teal-500/10 rounded-full blur-3xl translate-y-1/3 translate-x-1/4 pointer-events-none"></div>

                    <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                        <div className="flex flex-col items-center justify-center gap-2 mb-1">
                            <BookOpen className="h-12 w-12 text-indigo-500 mb-2" />
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Published <span className="text-primary">Papers</span>
                            </h1>
                        </div>
                        <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">
                            Browse accepted &amp; published research across all conferences on Confhub
                        </p>

                        {/* Search bar */}
                        <form onSubmit={handleSearch} className="relative max-w-xl mx-auto mt-8 shadow-sm">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                            <Input
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                placeholder="Search by title or keyword..."
                                className="pl-11 pr-24 h-14 rounded-2xl text-base border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 bg-white"
                            />
                            <Button
                                type="submit"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                            >
                                Search
                            </Button>
                        </form>

                        {/* Result count */}
                        {!isLoading && (
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium pt-2">
                                {totalElements.toLocaleString()} paper{totalElements !== 1 ? 's' : ''} found
                                {searchQuery && <span> for <strong className="text-indigo-600 dark:text-indigo-400">&quot;{searchQuery}&quot;</strong></span>}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Paper Grid ── */}
            <div className="page-wide pt-0">
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
                                onReadPaper={() => handleReadPaper(paper)}
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

            {/* ── Paper Detail Dialog ── */}
            <PaperDetailDialog
                paper={selectedPaper}
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
            />
        </div>
    )
}
