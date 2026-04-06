'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPapersByAuthor } from '@/app/api/paper.api'
import { getFilesByPaper, type CameraReadyFile } from '@/app/api/camera-ready.api'
import { getUserByEmail } from '@/app/api/user.api'
import type { PaperResponse } from '@/types/paper'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { toast } from 'sonner'
import { FileCheck, Camera, Calendar, Layers, ExternalLink, Activity, CheckCircle2, Search, Loader2, BookOpen, ChevronLeft, ChevronRight, Scale } from 'lucide-react'
import { getCurrentUserEmail } from '@/lib/auth'
import { fmtDate } from '@/lib/utils'

export default function CameraReadyDashboardTab() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [cameraReadyFiles, setCameraReadyFiles] = useState<Record<number, CameraReadyFile[]>>({})
    const [copyrightFiles, setCopyrightFiles] = useState<Record<number, CameraReadyFile[]>>({})
    const [loading, setLoading] = useState(true)

    // Table state
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(0) // 0-indexed internally
    const itemsPerPage = 10

    useEffect(() => {
        fetchData()
    }, [conferenceId])

    const fetchData = async () => {
        try {
            setLoading(true)
            const email = getCurrentUserEmail()
            if (!email) { router.push('/auth/login'); return }

            const user = await getUserByEmail(email)
            if (!user?.id) { router.push('/auth/login'); return }

            const allPapers = await getPapersByAuthor(user.id)

            // Filter papers that belong to THIS conference AND are ACCEPTED/PUBLISHED
            const eligible = allPapers.filter(p =>
                p.conferenceId === conferenceId &&
                (p.status === 'ACCEPTED' || p.status === 'PUBLISHED')
            )
            setPapers(eligible)

            // Load files and separate camera-ready vs copyright
            const crMap: Record<number, CameraReadyFile[]> = {}
            const cpMap: Record<number, CameraReadyFile[]> = {}
            await Promise.all(
                eligible.map(async (p) => {
                    const files = await getFilesByPaper(p.id).catch(() => [])
                    crMap[p.id] = files.filter(f => f.isCameraReady)
                    cpMap[p.id] = files.filter(f => f.isCopyrightSubmission)
                })
            )
            setCameraReadyFiles(crMap)
            setCopyrightFiles(cpMap)

        } catch (err) {
            console.error('Failed to load camera-ready dashboard:', err)
            toast.error('Failed to load camera-ready data')
        } finally {
            setLoading(false)
        }
    }

    // Derived filtering & pagination
    const filteredPapers = useMemo(() => {
        return papers.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
    }, [papers, searchTerm])

    const totalElements = filteredPapers.length
    const totalPages = Math.ceil(totalElements / itemsPerPage)
    const paginatedPapers = useMemo(() => {
        return filteredPapers.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
    }, [filteredPapers, currentPage, itemsPerPage])

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold mb-1">Camera-Ready & Copyright Submissions</h2>
                <p className="text-sm text-muted-foreground">
                    Manage final publication-ready manuscripts and copyright transfer documents.
                </p>
            </div>

            <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Accepted Manuscripts
                        {!loading && (
                            <span className="text-xs font-normal text-muted-foreground">
                                ({totalElements})
                            </span>
                        )}
                    </h3>
                </div>

                {/* Filter Toolbar */}
                {!loading && papers.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search papers by title..."
                                className="pl-9 h-9 text-sm"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    setCurrentPage(0)
                                }}
                            />
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : papers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                        No accepted papers found or eligible for camera-ready submission.
                    </div>
                ) : filteredPapers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No papers match your search.
                    </div>
                ) : (
                    <div className="rounded-lg border overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="w-12 text-center">#</TableHead>
                                        <TableHead>Paper Details</TableHead>
                                        <TableHead className="w-36">Camera-Ready</TableHead>
                                        <TableHead className="w-36">Copyright</TableHead>
                                        <TableHead className="w-36 text-center">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedPapers.map((p, idx) => {
                                        const crFiles = cameraReadyFiles[p.id] || []
                                        const cpFiles = copyrightFiles[p.id] || []
                                        const hasCR = crFiles.length > 0
                                        const hasCopyright = cpFiles.length > 0
                                        const isPublished = p.status === 'PUBLISHED'

                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell className="text-center text-xs text-muted-foreground font-medium">
                                                    {currentPage * itemsPerPage + idx + 1}
                                                </TableCell>
                                                
                                                <TableCell>
                                                    <div className="flex flex-col gap-1 py-1 pr-6 max-w-[400px]">
                                                        <p className="font-semibold text-sm line-clamp-2 leading-relaxed" title={p.title}>{p.title}</p>
                                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                                            <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> {p.track?.name || 'Main Track'}</span>
                                                            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {fmtDate(p.submissionTime)}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Camera-Ready Status */}
                                                <TableCell>
                                                    <div className="flex flex-col items-start gap-1.5 py-1">
                                                        {isPublished ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" /> Published</Badge>
                                                        ) : hasCR ? (
                                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 uppercase text-[10px]"><FileCheck className="h-3 w-3 mr-1" /> Uploaded</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[10px]"><Activity className="h-3 w-3 mr-1" /> Required</Badge>
                                                        )}

                                                        {crFiles.length > 0 && (
                                                            <a href={crFiles[crFiles.length - 1].url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
                                                                <ExternalLink className="h-3 w-3" /> View file
                                                            </a>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Copyright Status */}
                                                <TableCell>
                                                    <div className="flex flex-col items-start gap-1.5 py-1">
                                                        {hasCopyright ? (
                                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 uppercase text-[10px]"><Scale className="h-3 w-3 mr-1" /> Uploaded</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[10px]"><Activity className="h-3 w-3 mr-1" /> Required</Badge>
                                                        )}

                                                        {cpFiles.length > 0 && (
                                                            <a href={cpFiles[cpFiles.length - 1].url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
                                                                <ExternalLink className="h-3 w-3" /> View file
                                                            </a>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    {!isPublished ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => router.push(`/conference/${conferenceId}/paper/${p.id}/camera-ready`)}
                                                            variant={(hasCR && hasCopyright) ? 'outline' : 'default'}
                                                            className={`h-8 w-28 gap-1.5 shadow-sm mx-auto ${!(hasCR && hasCopyright) && 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                                                        >
                                                            <Camera className="h-3.5 w-3.5" />
                                                            {(hasCR || hasCopyright) ? 'Manage' : 'Proceed'}
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" variant="ghost" disabled className="text-emerald-700 h-8 w-28 mx-auto opacity-100 font-medium bg-emerald-50/50">
                                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Complete
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 rounded-b-xl -mx-6 -mb-6 mt-4">
                        <div className="text-sm text-muted-foreground">
                            Page {currentPage + 1} of {totalPages} · {totalElements} papers
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage(currentPage - 1)}
                                className="h-8"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage >= totalPages - 1}
                                onClick={() => setCurrentPage(currentPage + 1)}
                                className="h-8"
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
