'use client'

import { useEffect, useState } from 'react'
import { Loader2, FileText, ExternalLink, Paperclip, Camera, Upload, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getPaperFilesByPaperId, uploadPaperFile } from '@/app/api/paper.api'
import { getPlagiarismResult, type PlagiarismResult } from '@/app/api/plagiarism.api'
import { toast } from 'sonner'
import { getFilesByPaper, type CameraReadyFile } from '@/app/api/camera-ready.api'
import type { PaperFileResponse } from '@/types/paper'
import { fmtDate } from '@/lib/utils'
import { PlagiarismBadge } from '@/components/plagiarism-badge'

interface FilesTabProps {
    paperId: number
    conferenceId: number
    isAuthor?: boolean
}

export function FilesTab({ paperId, conferenceId, isAuthor = false }: FilesTabProps) {
    const [manuscriptFiles, setManuscriptFiles] = useState<PaperFileResponse[]>([])
    const [cameraReadyFiles, setCameraReadyFiles] = useState<CameraReadyFile[]>([])
    const [copyrightFiles, setCopyrightFiles] = useState<CameraReadyFile[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [checkingDialogOpen, setCheckingDialogOpen] = useState(false)
    const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null)
    const [plagiarismAutoOpen, setPlagiarismAutoOpen] = useState(false)
    const [plagiarismVerdict, setPlagiarismVerdict] = useState<'success' | 'rejected' | null>(null)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            try {
                const [mFiles, crFiles] = await Promise.all([
                    getPaperFilesByPaperId(paperId).catch(() => []),
                    getFilesByPaper(paperId).catch(() => []),
                ])
                // Manuscript files: exclude camera-ready ones
                setManuscriptFiles((mFiles || []).filter(f => !f.isCameraReady))
                setCameraReadyFiles((crFiles || []).filter(f => f.isCameraReady))
                setCopyrightFiles((crFiles || []).filter(f => f.isCopyrightSubmission))
            } catch {
                // silently fail
            }
            setLoading(false)
        }
        fetch()
    }, [paperId])

    const handleUploadManuscript = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.type !== 'application/pdf') {
            toast.error('Please select a PDF file')
            return
        }

        try {
            setUploading(true)
            setCheckingDialogOpen(true)
            setPlagiarismVerdict(null)
            setPlagiarismResult(null)
            await uploadPaperFile(conferenceId, paperId, file)
            toast.success('Manuscript uploaded successfully!')
            // Refresh files
            const newFiles = await getPaperFilesByPaperId(paperId)
            setManuscriptFiles((newFiles || []).filter(f => !f.isCameraReady))

            await new Promise(r => setTimeout(r, 500))
            try {
                let newRes = await getPlagiarismResult(paperId)
                if (!newRes.status || newRes.status === 'CHECKING') {
                    for (let i = 0; i < 4; i++) {
                        await new Promise(r => setTimeout(r, 1500))
                        newRes = await getPlagiarismResult(paperId)
                        if (newRes.status !== 'CHECKING') break
                    }
                }
                setPlagiarismResult(newRes)

                if (newRes.status === 'COMPLETED') {
                    const score = newRes.score ?? 0
                    if (score > 50) {
                        setPlagiarismVerdict('rejected')
                        toast.warning(
                            `High plagiarism similarity detected: ${score.toFixed(1)}%. Your file was uploaded, but conference chairs will review this report.`,
                            { duration: 8000 }
                        )
                    } else {
                        setPlagiarismVerdict('success')
                    }
                }
            } catch (err) {
                console.error('Error fetching plagiarism result:', err)
            }

            setPlagiarismAutoOpen(true)
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to upload manuscript')
        } finally {
            setUploading(false)
            setCheckingDialogOpen(false)
            e.target.value = '' // reset input
        }
    }

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

    const hasAnyFiles = manuscriptFiles.length > 0 || cameraReadyFiles.length > 0 || copyrightFiles.length > 0

    if (!hasAnyFiles) {
        return (
            <div className="text-center py-16 px-4 border rounded-lg bg-muted/10 border-dashed">
                <Paperclip className="h-10 w-10 mx-auto mb-3 opacity-40 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">No files uploaded yet.</p>
                <p className="text-sm mt-1 text-muted-foreground max-w-sm mx-auto mb-6">
                    Manuscript, camera-ready, and copyright files will appear here once submitted.
                </p>
                
                {isAuthor && (
                    <div className="flex justify-center">
                        <label className={`flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 transition-colors ${uploading ? 'opacity-70 pointer-events-none' : ''}`}>
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {uploading ? 'Uploading...' : 'Upload Manuscript (PDF)'}
                            <input 
                                type="file" 
                                className="hidden" 
                                accept=".pdf" 
                                onChange={handleUploadManuscript}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Dialog open={checkingDialogOpen}>
                <DialogContent className="sm:max-w-md [&>button]:hidden">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl">Analyzing Manuscript...</DialogTitle>
                        <DialogDescription className="text-center">
                            Uploading your file and running a plagiarism check. This may take up to 30 seconds.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-8 space-y-5">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-30" />
                            <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                                <Search className="h-8 w-8 text-white animate-pulse" />
                            </div>
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-sm font-semibold text-slate-800">Scanning for plagiarism...</p>
                            <p className="text-xs text-muted-foreground">Comparing against internal database & web sources</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {plagiarismResult && plagiarismResult.status === 'COMPLETED' && (
                <div className="hidden">
                    <PlagiarismBadge
                        key={`plag-hidden-${plagiarismResult.score}-${plagiarismResult.details?.checkedAt || Date.now()}`}
                        paperId={paperId}
                        score={plagiarismResult.score}
                        status={plagiarismResult.status}
                        autoOpen={plagiarismAutoOpen}
                        onAutoOpenDone={() => setPlagiarismAutoOpen(false)}
                        verdict={plagiarismVerdict}
                        initialDetails={plagiarismResult.details}
                    />
                </div>
            )}

            {/* Manuscript Files */}
            <div className="rounded-lg border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 rounded-md">
                            <FileText className="h-4 w-4 text-indigo-600" />
                        </div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Manuscript Files ({manuscriptFiles.length})
                        </h3>
                    </div>
                    {isAuthor && (
                        <label className={`flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 text-indigo-600 rounded-md cursor-pointer hover:bg-indigo-50 transition-colors text-xs font-medium ${uploading ? 'opacity-70 pointer-events-none' : ''}`}>
                            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            {uploading ? 'Uploading...' : 'Upload New Ver'}
                            <input 
                                type="file" 
                                className="hidden" 
                                accept=".pdf" 
                                onChange={handleUploadManuscript}
                                disabled={uploading}
                            />
                        </label>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <span>Plagiarism:</span>
                    {plagiarismResult ? (
                        <PlagiarismBadge
                            key={`plag-inline-${plagiarismResult.score}-${plagiarismResult.details?.checkedAt || Date.now()}`}
                            paperId={paperId}
                            score={plagiarismResult.score}
                            status={plagiarismResult.status}
                            showDetail
                            verdict={plagiarismVerdict}
                            initialDetails={plagiarismResult.details}
                        />
                    ) : (
                        <span className="italic">Not checked yet</span>
                    )}
                </div>
                {manuscriptFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No manuscript files uploaded.</p>
                ) : (
                    <div className="space-y-2">
                        {manuscriptFiles.map((file, idx) => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-background border rounded-lg hover:border-indigo-300 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-1.5 bg-indigo-50 rounded-md shrink-0">
                                        <FileText className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate" title={file.url}>
                                            {decodeURIComponent(file.url.split('/').pop() || `manuscript-${idx + 1}.pdf`)}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant="outline" className="text-[10px] border-indigo-200 bg-indigo-50/50 text-indigo-700">
                                                Ver. {idx + 1}
                                            </Badge>
                                            {file.isActive && (
                                                <Badge className="text-[10px] bg-emerald-100 text-emerald-700 shadow-none">Active</Badge>
                                            )}
                                            {file.uploadedAt && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {fmtDate(file.uploadedAt)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <a href={file.url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs shrink-0">
                                        <ExternalLink className="h-3 w-3" /> View
                                    </Button>
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Camera-Ready Files */}
            <div className="rounded-lg border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-emerald-50 rounded-md">
                        <Camera className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Camera-Ready Files ({cameraReadyFiles.length})
                    </h3>
                </div>
                {cameraReadyFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No camera-ready files submitted.</p>
                ) : (
                    <div className="space-y-2">
                        {cameraReadyFiles.map((file, idx) => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-background border rounded-lg hover:border-emerald-300 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-1.5 bg-emerald-50 rounded-md shrink-0">
                                        <Camera className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">
                                            {decodeURIComponent(file.url.split('/').pop() || `camera-ready-${idx + 1}.pdf`)}
                                        </p>
                                        <Badge variant="outline" className="text-[10px] mt-0.5 border-emerald-200 bg-emerald-50/50 text-emerald-700">
                                            Ver. {idx + 1}
                                        </Badge>
                                    </div>
                                </div>
                                <a href={file.url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs shrink-0">
                                        <ExternalLink className="h-3 w-3" /> View
                                    </Button>
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Copyright Files */}
            {copyrightFiles.length > 0 && (
                <div className="rounded-lg border bg-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-indigo-50 rounded-md">
                            <Upload className="h-4 w-4 text-indigo-600" />
                        </div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Copyright Submissions ({copyrightFiles.length})
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {copyrightFiles.map((file, idx) => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-background border rounded-lg hover:border-indigo-300 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-1.5 bg-indigo-50 rounded-md shrink-0">
                                        <Upload className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">
                                            {decodeURIComponent(file.url.split('/').pop() || `copyright-${idx + 1}.pdf`)}
                                        </p>
                                        <Badge variant="outline" className="text-[10px] mt-0.5 border-indigo-200 bg-indigo-50/50 text-indigo-700">
                                            Ver. {idx + 1}
                                        </Badge>
                                    </div>
                                </div>
                                <a href={file.url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs shrink-0">
                                        <ExternalLink className="h-3 w-3" /> View
                                    </Button>
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
