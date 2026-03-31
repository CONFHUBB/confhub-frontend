'use client'

import { useEffect, useState } from 'react'
import { Loader2, FileText, ExternalLink, Paperclip, Camera, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getPaperFilesByPaperId } from '@/app/api/paper.api'
import { getFilesByPaper, type CameraReadyFile } from '@/app/api/camera-ready.api'
import type { PaperFileResponse } from '@/types/paper'

interface FilesTabProps {
    paperId: number
    conferenceId: number
}

export function FilesTab({ paperId, conferenceId }: FilesTabProps) {
    const [manuscriptFiles, setManuscriptFiles] = useState<PaperFileResponse[]>([])
    const [cameraReadyFiles, setCameraReadyFiles] = useState<CameraReadyFile[]>([])
    const [copyrightFiles, setCopyrightFiles] = useState<CameraReadyFile[]>([])
    const [loading, setLoading] = useState(true)

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

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

    const hasAnyFiles = manuscriptFiles.length > 0 || cameraReadyFiles.length > 0 || copyrightFiles.length > 0

    if (!hasAnyFiles) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <Paperclip className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No files uploaded yet.</p>
                <p className="text-xs mt-1">Manuscript, camera-ready, and copyright files will appear here.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Manuscript Files */}
            <div className="rounded-lg border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-indigo-50 rounded-md">
                        <FileText className="h-4 w-4 text-indigo-600" />
                    </div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Manuscript Files ({manuscriptFiles.length})
                    </h3>
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
                                                    {new Date(file.uploadedAt).toLocaleDateString('en-US')}
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
                        <div className="p-1.5 bg-purple-50 rounded-md">
                            <Upload className="h-4 w-4 text-purple-600" />
                        </div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Copyright Submissions ({copyrightFiles.length})
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {copyrightFiles.map((file, idx) => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-background border rounded-lg hover:border-purple-300 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-1.5 bg-purple-50 rounded-md shrink-0">
                                        <Upload className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">
                                            {decodeURIComponent(file.url.split('/').pop() || `copyright-${idx + 1}.pdf`)}
                                        </p>
                                        <Badge variant="outline" className="text-[10px] mt-0.5 border-purple-200 bg-purple-50/50 text-purple-700">
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
