'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getConference } from '@/app/api/conference.api'
import { getAggregatesByConference, type ReviewAggregate } from '@/app/api/review-aggregate.api'
import { uploadCameraReady, getFilesByPaper, type CameraReadyFile } from '@/app/api/camera-ready.api'
import type { ConferenceResponse } from '@/types/conference'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Upload, FileCheck, ExternalLink } from 'lucide-react'

export default function CameraReadyPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [papers, setPapers] = useState<ReviewAggregate[]>([])
    const [cameraReadyFiles, setCameraReadyFiles] = useState<Record<number, CameraReadyFile[]>>({})
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState<number | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const [conf, aggs] = await Promise.all([
                    getConference(conferenceId),
                    getAggregatesByConference(conferenceId),
                ])
                setConference(conf)

                // Only show ACCEPTED and PUBLISHED papers
                const eligiblePapers = aggs.filter(a => a.paperStatus === 'ACCEPTED' || a.paperStatus === 'PUBLISHED')
                setPapers(eligiblePapers)

                // Load camera-ready files for each paper
                const filesMap: Record<number, CameraReadyFile[]> = {}
                await Promise.all(
                    eligiblePapers.map(async (p) => {
                        const files = await getFilesByPaper(p.paperId).catch(() => [])
                        filesMap[p.paperId] = files.filter(f => f.isCameraReady)
                    })
                )
                setCameraReadyFiles(filesMap)
            } catch (err) {
                console.error('Failed to load camera-ready page:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [conferenceId])

    const handleUpload = async (paperId: number) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.pdf,.doc,.docx'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            try {
                setUploading(paperId)
                const uploaded = await uploadCameraReady(conferenceId, paperId, file)
                setCameraReadyFiles(prev => ({
                    ...prev,
                    [paperId]: [...(prev[paperId] || []), uploaded],
                }))
            } catch (err: any) {
                alert(err?.response?.data?.message || 'Upload failed. Please try again.')
            } finally {
                setUploading(null)
            }
        }
        input.click()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="space-y-3">
                <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push(`/conference/${conferenceId}`)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Conference
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Camera-Ready Submission</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {conference?.name} — Upload your final camera-ready manuscript
                    </p>
                </div>
            </div>

            {papers.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p>No accepted papers found for camera-ready submission.</p>
                        <p className="text-sm mt-1">Your paper must be accepted before you can upload the final version.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {papers.map(p => {
                        const files = cameraReadyFiles[p.paperId] || []
                        const hasUploaded = files.length > 0
                        const isPublished = p.paperStatus === 'PUBLISHED'

                        return (
                            <Card key={p.paperId} className={`border-l-4 ${isPublished ? 'border-l-emerald-500' : hasUploaded ? 'border-l-blue-500' : 'border-l-amber-500'}`}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 truncate">{p.paperTitle}</h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge className={
                                                    isPublished ? 'bg-emerald-100 text-emerald-800' :
                                                    'bg-green-100 text-green-800'
                                                }>
                                                    {p.paperStatus}
                                                </Badge>
                                                {hasUploaded && (
                                                    <Badge className="bg-blue-100 text-blue-800">
                                                        Camera-Ready Uploaded
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Show uploaded files */}
                                            {files.length > 0 && (
                                                <div className="mt-3 space-y-1">
                                                    {files.map(f => (
                                                        <a
                                                            key={f.id}
                                                            href={f.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            Camera-ready file #{f.id}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-shrink-0">
                                            {!isPublished && (
                                                <Button
                                                    onClick={() => handleUpload(p.paperId)}
                                                    disabled={uploading === p.paperId}
                                                    variant={hasUploaded ? 'outline' : 'default'}
                                                    className="gap-2"
                                                >
                                                    {uploading === p.paperId ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Upload className="h-4 w-4" />
                                                    )}
                                                    {hasUploaded ? 'Re-upload' : 'Upload'}
                                                </Button>
                                            )}
                                            {isPublished && (
                                                <Badge className="bg-emerald-100 text-emerald-800 text-sm py-1 px-3">
                                                    ✅ Published
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
