'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { assignAuthorToPaper, getAuthorsByPaper, deleteAuthorFromPaper, getPaperById, getPaperFiles, updatePaper, updatePaperFile, withdrawPaper, restorePaper } from '@/app/api/paper.api'
import type { PaperAuthorItem } from '@/app/api/paper.api'
import { getUsers } from '@/app/api/user.api'
import { getSubjectAreasByTrack } from '@/app/api/track.api'
import type { PaperResponse, PaperFileResponse } from '@/types/paper'
import type { SubjectAreaResponse } from '@/types/subject-area'
import type { User } from '@/types/user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeft, Upload, FileUp, FileText, Trash2, Save, ExternalLink, UserPlus, Layers, X, AlertTriangle, RotateCcw } from 'lucide-react'
import { Select as AntdSelect } from 'antd'
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
    const [users, setUsers] = useState<User[]>([])
    const [authors, setAuthors] = useState<PaperAuthorItem[]>([])
    const [selectedUser, setSelectedUser] = useState('')
    const [isAssigning, setIsAssigning] = useState(false)
    const [openAddAuthorDialog, setOpenAddAuthorDialog] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [withdrawing, setWithdrawing] = useState(false)
    const [showPdfViewer, setShowPdfViewer] = useState(false)

    const [subjectAreas, setSubjectAreas] = useState<SubjectAreaResponse[]>([])
    const [primarySubjectAreaId, setPrimarySubjectAreaId] = useState<string>('')
    const [secondarySubjectAreaIds, setSecondarySubjectAreaIds] = useState<number[]>([])

    const [formData, setFormData] = useState({
        title: '',
        abstractField: '',
    })
    const [keywords, setKeywords] = useState<string[]>([])
    const [keywordInput, setKeywordInput] = useState('')

    const fetchUsers = async () => {
        try {
            const data = await getUsers()
            setUsers(data)
        } catch (error) {
            console.error('Error fetching users:', error)
            toast.error('Failed to load available authors')
        }
    }

    const fetchAuthors = async () => {
        try {
            const data = await getAuthorsByPaper(paperId)
            setAuthors(data)
        } catch (error) {
            console.error('Error fetching authors:', error)
            toast.error('Failed to load authors')
        }
    }

    useEffect(() => {
        const fetchPaper = async () => {
            try {
                setLoading(true)
                const data = await getPaperById(paperId)
                setPaper(data)
                setFormData({
                    title: data.title || '',
                    abstractField: data.abstractField || '',
                })
                setKeywords(data.keywords || [])
                
                if (data.primarySubjectAreaId) {
                    setPrimarySubjectAreaId(data.primarySubjectAreaId.toString())
                }
                if (data.secondarySubjectAreaIds) {
                    setSecondarySubjectAreaIds(data.secondarySubjectAreaIds)
                }

                // Fetch subject areas for this track
                const trackIdToFetch = data.trackId || data.track?.id
                if (trackIdToFetch) {
                    try {
                        const areas = await getSubjectAreasByTrack(trackIdToFetch)
                        setSubjectAreas(areas || [])
                    } catch (err) {
                        console.error('Failed to load subject areas', err)
                    }
                }

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
            fetchUsers()
            fetchAuthors()
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
                keywords,
                primarySubjectAreaId: Number(primarySubjectAreaId),
                secondarySubjectAreaIds: secondarySubjectAreaIds,
                conferenceTrackId: paper?.trackId || paper?.track?.id
            })
            toast.success('Paper details updated successfully!')
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update paper')
        } finally {
            setSaving(false)
        }
    }

    const handleWithdraw = async () => {
        if (!confirm('Are you sure you want to withdraw this paper? You can restore it later.')) return
        try {
            setWithdrawing(true)
            const updated = await withdrawPaper(paperId)
            setPaper(updated)
            toast.success('Paper withdrawn successfully')
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to withdraw paper')
        } finally {
            setWithdrawing(false)
        }
    }

    const handleRestore = async () => {
        try {
            setWithdrawing(true)
            const updated = await restorePaper(paperId)
            setPaper(updated)
            toast.success('Paper restored successfully')
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to restore paper')
        } finally {
            setWithdrawing(false)
        }
    }

    const handleUploadFile = async () => {
        if (!selectedFile) {
            toast.error('Please select a file to upload')
            return
        }
        try {
            setUploading(true)
            const conferenceId = paper?.track?.conference?.id
            if (!conferenceId) {
                toast.error('Conference information not available')
                return
            }
            await updatePaperFile(conferenceId, paperId, selectedFile)
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

    const handleAssignAuthor = async () => {
        if (!selectedUser) {
            toast.error('Please select a user')
            return
        }

        // Duplicate check on frontend
        if (authors.some(a => a.user.id === Number(selectedUser))) {
            toast.error('This author is already added to the paper.')
            return
        }

        try {
            setIsAssigning(true)
            await assignAuthorToPaper(paperId, Number(selectedUser))
            toast.success('Author assigned successfully!')
            setSelectedUser('')
            setOpenAddAuthorDialog(false)
            await fetchAuthors()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to assign author')
        } finally {
            setIsAssigning(false)
        }
    }

    const handleRemoveAuthor = async (paperAuthorId: number, authorName: string) => {
        if (!confirm(`Are you sure you want to remove ${authorName} as a co-author?`)) return
        try {
            await deleteAuthorFromPaper(paperAuthorId)
            toast.success(`${authorName} has been removed and notified.`)
            await fetchAuthors()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to remove author')
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

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Edit Paper</h1>
                    <p className="text-muted-foreground mt-1">
                        Update your paper information and upload a new manuscript
                    </p>
                </div>
                <Badge
                    className={`text-sm px-3 py-1 ${
                        paper.status === 'ACCEPTED' ? 'bg-green-600 text-white' :
                        paper.status === 'REJECTED' ? 'bg-red-600 text-white' :
                        paper.status === 'PUBLISHED' ? 'bg-emerald-600 text-white' :
                        paper.status === 'CAMERA_READY' ? 'bg-blue-600 text-white' :
                        paper.status === 'WITHDRAWN' ? 'bg-gray-500 text-white' :
                        paper.status === 'DRAFT' ? 'bg-amber-500 text-white' :
                        paper.status === 'UNDER_REVIEW' ? 'bg-purple-600 text-white' :
                        ''
                    }`}
                >
                    {paper.status.replace(/_/g, ' ')}
                </Badge>
            </div>

            {/* Withdraw / Restore Actions */}
            {(paper.status === 'SUBMITTED' || paper.status === 'UNDER_REVIEW') && (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
                        You can withdraw this paper if you no longer wish it to be considered.
                    </p>
                    <Button
                        variant="warning"
                        size="sm"
                        onClick={handleWithdraw}
                        disabled={withdrawing}
                        className="shrink-0"
                    >
                        {withdrawing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <AlertTriangle className="h-4 w-4 mr-1" />}
                        Withdraw Paper
                    </Button>
                </div>
            )}

            {paper.status === 'WITHDRAWN' && (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                    <RotateCcw className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <p className="text-sm text-blue-800 dark:text-blue-300 flex-1">
                        This paper has been withdrawn. You can restore it to resubmit.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRestore}
                        disabled={withdrawing}
                        className="shrink-0"
                    >
                        {withdrawing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                        Restore Paper
                    </Button>
                </div>
            )}

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
                        <div className="space-y-3">
                            <Label>Keywords</Label>
                            {keywords.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {keywords.map((kw, i) => (
                                        <Badge key={i} variant="secondary" className="text-sm gap-1 pl-3 pr-1.5 py-1">
                                            {kw}
                                            <button
                                                type="button"
                                                onClick={() => setKeywords(prev => prev.filter((_, idx) => idx !== i))}
                                                className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Input
                                    value={keywordInput}
                                    onChange={(e) => setKeywordInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            const trimmed = keywordInput.trim()
                                            if (trimmed && !keywords.includes(trimmed)) {
                                                setKeywords(prev => [...prev, trimmed])
                                                setKeywordInput('')
                                            }
                                        }
                                    }}
                                    placeholder="Type a keyword and press Enter"
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        const trimmed = keywordInput.trim()
                                        if (trimmed && !keywords.includes(trimmed)) {
                                            setKeywords(prev => [...prev, trimmed])
                                            setKeywordInput('')
                                        }
                                    }}
                                    className="shrink-0"
                                >
                                    Add
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Press Enter or click Add to add each keyword.</p>
                        </div>

                        {subjectAreas.length > 0 && (
                            <div className="grid gap-4 md:grid-cols-2 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="primarySubjectArea">Primary Subject Area</Label>
                                    <Select
                                        value={primarySubjectAreaId}
                                        onValueChange={setPrimarySubjectAreaId}
                                    >
                                        <SelectTrigger id="primarySubjectArea">
                                            <SelectValue placeholder="Select primary area" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjectAreas.map((sa) => (
                                                <SelectItem key={sa.id} value={sa.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        {sa.parentId !== null && <Layers className="h-3 w-3 text-muted-foreground ml-2" />}
                                                        <span>{sa.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 flex flex-col">
                                    <Label htmlFor="secondarySubjectAreas">Secondary Subject Areas</Label>
                                    <AntdSelect
                                        mode="multiple"
                                        id="secondarySubjectAreas"
                                        className="w-full flex-1"
                                        placeholder="Select secondary areas"
                                        value={secondarySubjectAreaIds}
                                        onChange={setSecondarySubjectAreaIds}
                                        options={subjectAreas
                                            .filter(sa => sa.id.toString() !== primarySubjectAreaId)
                                            .map((sa) => ({ label: sa.name, value: sa.id }))}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="pt-4 flex justify-end">
                            <Button onClick={handleSavePaper} disabled={saving} className="gap-2">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Authors</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage co-authors for this paper from the edit page.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Dialog open={openAddAuthorDialog} onOpenChange={setOpenAddAuthorDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <UserPlus className="h-4 w-4" />
                                        Add Author
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Co-Author</DialogTitle>
                                        <DialogDescription>
                                            Select a user to add as a co-author to this paper.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="author-select">Select User</Label>
                                            <Select value={selectedUser} onValueChange={setSelectedUser}>
                                                <SelectTrigger id="author-select">
                                                    <SelectValue placeholder="Choose a user" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {users.map((user) => (
                                                        <SelectItem key={user.id} value={user.id.toString()}>
                                                            {user.fullName} ({user.email})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button onClick={handleAssignAuthor} disabled={isAssigning || !selectedUser} className="w-full">
                                            {isAssigning ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Assigning...
                                                </>
                                            ) : (
                                                'Assign Author'
                                            )}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Current co-authors: {authors.length}
                        </p>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-muted/60">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Name</th>
                                        <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Email</th>
                                        <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {authors.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-center text-muted-foreground">
                                                No co-authors added yet
                                            </td>
                                        </tr>
                                    ) : (
                                        authors.map((item) => (
                                            <tr key={item.paperAuthorId} className="border-b last:border-0">
                                                <td className="px-4 py-3 font-medium">{item.user.fullName}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{item.user.email}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveAuthor(item.paperAuthorId, item.user.fullName || item.user.email)}
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
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
                            <div className="space-y-3">
                                <Label>Current Manuscript</Label>
                                <div className="p-4 rounded-lg border bg-muted/20 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-medium text-sm">Uploaded Manuscript Document</span>
                                            <a
                                                href={currentFile.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-primary text-sm hover:underline truncate"
                                            >
                                                <ExternalLink className="h-4 w-4 shrink-0" />
                                                <span className="truncate">{currentFile.url.split('/').pop() || 'View Previous File'}</span>
                                            </a>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 shrink-0"
                                        onClick={() => setShowPdfViewer(!showPdfViewer)}
                                    >
                                        <FileText className="h-4 w-4" />
                                        {showPdfViewer ? 'Hide Viewer' : 'View Manuscript'}
                                    </Button>
                                </div>
                                {showPdfViewer && (
                                    <div className="rounded-lg border overflow-hidden bg-gray-100">
                                        <iframe
                                            src={currentFile.url}
                                            className="w-full border-0"
                                            style={{ height: '600px' }}
                                            title="Manuscript PDF Viewer"
                                        />
                                    </div>
                                )}
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
