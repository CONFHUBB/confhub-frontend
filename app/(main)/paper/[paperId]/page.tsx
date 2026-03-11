'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPaperById, updatePaper, updatePaperFile, getPaperFiles } from '@/app/api/paper.api'
import type { PaperResponse, PaperFileResponse } from '@/types/paper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeft, Upload, FileUp, FileText, Trash2, Save, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EditPaperPage() {
    const params = useParams()
    const router = useRouter()
    const paperId = Number(params.paperId)

    const [paper, setPaper] = useState<PaperResponse | null>(null)
    const [currentFile, setCurrentFile] = useState<PaperFileResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const [formData, setFormData] = useState({
        title: '',
        abstractField: '',
        keyword1: '',
        keyword2: '',
        keyword3: '',
        keyword4: '',
    })

    useEffect(() => {
        const fetchPaper = async () => {
            try {
                setLoading(true)
                const data = await getPaperById(paperId)
                setPaper(data)
                setFormData({
                    title: data.title || '',
                    abstractField: data.abstractField || '',
                    keyword1: data.keyword1 || '',
                    keyword2: data.keyword2 || '',
                    keyword3: data.keyword3 || '',
                    keyword4: data.keyword4 || '',
                })

                // Load existing paper file
                try {
                    const files = await getPaperFiles()
                    const matchingFile = files.find(f => f.paper.id === paperId && f.isActive)
                    if (matchingFile) {
                        setCurrentFile(matchingFile)
                    }
                } catch (err) {
                    console.error('Could not fetch paper files', err)
                }

            } catch (error) {
                toast.error('Failed to load paper details')
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        if (paperId) {
            fetchPaper()
        }
    }, [paperId])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSavePaper = async () => {
        try {
            setSaving(true)
            await updatePaper(paperId, {
                ...paper,
                ...formData,
                topicId: paper?.topic?.id,
                conferenceTrackId: paper?.track?.id
            })
            toast.success('Paper details updated successfully!')
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update paper')
        } finally {
            setSaving(false)
        }
    }

    const handleUploadFile = async () => {
        if (!selectedFile) {
            toast.error('Please select a file to upload')
            return
        }
        try {
            setUploading(true)
            await updatePaperFile(paperId, selectedFile)
            toast.success('Manuscript file uploaded successfully!')
            setSelectedFile(null)

            // Refresh the current file
            try {
                const files = await getPaperFiles()
                const matchingFile = files.find(f => f.paper.id === paperId && f.isActive)
                if (matchingFile) {
                    setCurrentFile(matchingFile)
                }
            } catch (err) {
                console.error(err)
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to upload manuscript')
        } finally {
            setUploading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!paper) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-muted-foreground text-lg">Paper not found</p>
                <Button onClick={() => router.push('/paper')} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Submissions
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
            <Button variant="ghost" onClick={() => router.push('/paper')} className="-ml-2 mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to My Submissions
            </Button>

            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Paper</h1>
                <p className="text-muted-foreground mt-1">
                    Update your paper information and upload a new manuscript
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Paper Details Form */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Paper Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="Paper Title"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="abstractField">Abstract</Label>
                            <Textarea
                                id="abstractField"
                                name="abstractField"
                                value={formData.abstractField}
                                onChange={handleInputChange}
                                placeholder="Paper Abstract"
                                rows={5}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                                <Label htmlFor="keyword1">Keyword 1</Label>
                                <Input id="keyword1" name="keyword1" value={formData.keyword1} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="keyword2">Keyword 2</Label>
                                <Input id="keyword2" name="keyword2" value={formData.keyword2} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="keyword3">Keyword 3</Label>
                                <Input id="keyword3" name="keyword3" value={formData.keyword3} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="keyword4">Keyword 4</Label>
                                <Input id="keyword4" name="keyword4" value={formData.keyword4} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end">
                            <Button onClick={handleSavePaper} disabled={saving} className="gap-2">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* File Upload Section */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Manuscript File</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {currentFile && (
                            <div className="space-y-2">
                                <Label>Current Manuscript</Label>
                                <div className="p-4 rounded-lg border bg-muted/20 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-indigo-500" />
                                        <span className="font-medium text-sm">Uploaded Manuscript Document</span>
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={currentFile.url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4 mr-2" /> View File
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <Label>Upload New Manuscript</Label>
                            <div className="p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 text-sm text-blue-800 dark:text-blue-300">
                                <p>Upload a new PDF to replace the current manuscript for this paper.</p>
                            </div>
                            
                            <div className="flex gap-3 items-center">
                            <div className="flex-1">
                                <label
                                    htmlFor="file-upload"
                                    className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                                >
                                    <FileUp className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        {selectedFile ? selectedFile.name : 'Choose a new PDF file...'}
                                    </span>
                                </label>
                                <input
                                    id="file-upload"
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            if (file.type !== 'application/pdf') {
                                                toast.error('Please select a PDF file')
                                                return
                                            }
                                            setSelectedFile(file)
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {selectedFile && (
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-2 text-sm">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{selectedFile.name}</span>
                                    <span className="text-muted-foreground">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        )}

                        <div className="pt-2 flex justify-end">
                            <Button onClick={handleUploadFile} disabled={uploading || !selectedFile} className="gap-2">
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                Upload Manuscript
                            </Button>
                        </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
