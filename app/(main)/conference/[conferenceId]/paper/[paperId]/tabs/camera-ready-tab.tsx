'use client'

import { useEffect, useState } from 'react'
import { Loader2, Camera, ExternalLink, FileCheck, FileText, Scale, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getFilesByPaper, type CameraReadyFile } from '@/app/api/camera-ready.api'
import type { PaperResponse } from '@/types/paper'
import { useRouter } from 'next/navigation'

interface CameraReadyTabProps {
    paperId: number
    conferenceId: number
    paper: PaperResponse
    isChair: boolean
}

export function CameraReadyTab({ paperId, conferenceId, paper, isChair }: CameraReadyTabProps) {
    const router = useRouter()
    const [cameraReadyFiles, setCameraReadyFiles] = useState<CameraReadyFile[]>([])
    const [copyrightFiles, setCopyrightFiles] = useState<CameraReadyFile[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            try {
                const files = await getFilesByPaper(paperId).catch(() => [])
                setCameraReadyFiles(files.filter(f => f.isCameraReady))
                setCopyrightFiles(files.filter(f => f.isCopyrightSubmission))
            } catch { /* ignore */ }
            setLoading(false)
        }
        fetch()
    }, [paperId])

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

    const hasFiles = cameraReadyFiles.length > 0 || copyrightFiles.length > 0

    return (
        <div className="space-y-6">
            {/* Action banner for Author */}
            {!isChair && (
                <Card className="border-indigo-200 overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="text-white">
                                <h3 className="font-semibold text-base flex items-center gap-2">
                                    <Upload className="h-5 w-5" /> Submit Camera-Ready
                                </h3>
                                <p className="text-indigo-100 text-sm mt-1">
                                    Complete registration & payment, then upload your final manuscript and copyright form.
                                </p>
                            </div>
                            <Button
                                className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold shrink-0"
                                onClick={() => router.push(`/conference/${conferenceId}/paper/${paperId}/camera-ready`)}
                            >
                                Go to Submission Wizard →
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {!hasFiles ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Camera className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">No camera-ready or copyright files submitted yet.</p>
                    {isChair && (
                        <p className="text-xs mt-1">
                            The author has not submitted camera-ready files for this paper.
                        </p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Camera-Ready Files */}
                    <div className="rounded-lg border bg-card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-emerald-50 rounded-md">
                                <Camera className="h-4 w-4 text-emerald-600" />
                            </div>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Camera-Ready Manuscripts ({cameraReadyFiles.length})
                            </h3>
                        </div>
                        {cameraReadyFiles.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">Not yet submitted</p>
                        ) : (
                            <div className="space-y-2">
                                {cameraReadyFiles.map((file, idx) => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-background border rounded-lg hover:border-emerald-300 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-1.5 bg-emerald-50 rounded-md shrink-0">
                                                <FileText className="h-4 w-4 text-emerald-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                    {decodeURIComponent(file.url.split('/').pop() || 'camera-ready.pdf')}
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
                    <div className="rounded-lg border bg-card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-indigo-50 rounded-md">
                                <Scale className="h-4 w-4 text-indigo-600" />
                            </div>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Copyright Submissions ({copyrightFiles.length})
                            </h3>
                        </div>
                        {copyrightFiles.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">Not yet submitted</p>
                        ) : (
                            <div className="space-y-2">
                                {copyrightFiles.map((file, idx) => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-background border rounded-lg hover:border-indigo-300 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-1.5 bg-indigo-50 rounded-md shrink-0">
                                                <Scale className="h-4 w-4 text-indigo-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                    {decodeURIComponent(file.url.split('/').pop() || 'copyright.pdf')}
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
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
