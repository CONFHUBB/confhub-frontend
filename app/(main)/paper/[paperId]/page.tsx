'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { assignAuthorToPaper, getAuthorsByPaper, deleteAuthorFromPaper, getPaperById, getPaperFilesByPaperId, updatePaper, updatePaperFile, withdrawPaper, restorePaper, deletePaperFile, uploadSupplementaryFile, setActiveFile } from '@/app/api/paper.api'
import type { PaperAuthorItem } from '@/app/api/paper.api'
import { getUsers } from '@/app/api/user.api'
import { getSubjectAreasByTrack } from '@/app/api/track.api'
import { getAggregateByPaper, type ReviewAggregate } from '@/app/api/review-aggregate.api'
import { getMetaReviewByPaper } from '@/app/api/meta-review.api'
import { getReviewsByPaper, getAnswersByReview } from '@/app/api/review.api'
import { getConferenceActivities } from '@/app/api/conference.api'
import { recheckPlagiarism } from '@/app/api/plagiarism.api'
import { ConferencePhaseTracker } from '@/components/conference-phase-tracker'
import { PlagiarismBadge } from '@/components/plagiarism-badge'
import type { MetaReviewResponse } from '@/types/meta-review'
import type { ReviewResponse, ReviewAnswerResponse } from '@/types/review'
import type { ConferenceActivityDTO } from '@/types/conference'
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/components/ui/field'
import { V } from '@/lib/validation'
import {
    Loader2, ArrowLeft, Upload, FileUp, FileText, Trash2, Save, ExternalLink,
    UserPlus, Layers, X, AlertTriangle, RotateCcw, Eye, Lock, Clock, CalendarDays,
    Star, BarChart3, CheckCircle2, XCircle, ClipboardList, Camera, Users, ShieldCheck,
    Calendar, Folder, Download, AlertCircle
} from 'lucide-react'
import { Select as AntdSelect } from 'antd'
import { BackButton } from '@/components/shared/back-button'
import { UserLink } from '@/components/shared/user-link'
import { WorkspaceSkeleton } from '@/components/shared/skeletons'
import { toast } from 'sonner'
import { getPaperStatus, DECISION_CONFIG } from '@/lib/constants/status'
import { fmtDate } from '@/lib/utils'



export default function PaperWorkspacePage() {
    const params = useParams()
    const router = useRouter()
    const paperId = Number(params.paperId)

    const [paper, setPaper] = useState<PaperResponse | null>(null)
    const [paperFiles, setPaperFiles] = useState<PaperFileResponse[]>([])
    const [activities, setActivities] = useState<ConferenceActivityDTO[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [users, setUsers] = useState<User[]>([])
    const [authors, setAuthors] = useState<PaperAuthorItem[]>([])
    const [selectedUser, setSelectedUser] = useState('')
    const [isAssigning, setIsAssigning] = useState(false)
    const [openAddAuthorDialog, setOpenAddAuthorDialog] = useState(false)
    const [openWithdrawDialog, setOpenWithdrawDialog] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [withdrawing, setWithdrawing] = useState(false)
    const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null)
    const [checkingPlagiarism, setCheckingPlagiarism] = useState(false)
    const [plagiarismKey, setPlagiarismKey] = useState(0)

    const [subjectAreas, setSubjectAreas] = useState<SubjectAreaResponse[]>([])
    const [primarySubjectAreaId, setPrimarySubjectAreaId] = useState<string>('')
    const [secondarySubjectAreaIds, setSecondarySubjectAreaIds] = useState<number[]>([])

    const [formData, setFormData] = useState({ title: '', abstractField: '' })
    const [keywords, setKeywords] = useState<string[]>([])
    const [keywordInput, setKeywordInput] = useState('')
    const [errors, setErrors] = useState<{ title?: string; abstractField?: string; keywords?: string }>({})

    // Review data
    const [aggregate, setAggregate] = useState<ReviewAggregate | null>(null)
    const [metaReview, setMetaReview] = useState<MetaReviewResponse | null>(null)
    const [reviews, setReviews] = useState<ReviewResponse[]>([])
    const [reviewAnswers, setReviewAnswers] = useState<Record<number, ReviewAnswerResponse[]>>({})

    const fetchUsers = async () => {
        try { setUsers(await getUsers()) } catch { toast.error('Failed to load available authors') }
    }
    const fetchAuthors = async () => {
        try { setAuthors(await getAuthorsByPaper(paperId)) } catch { toast.error('Failed to load authors') }
    }
    const fetchFiles = async () => {
        try { setPaperFiles(Array.isArray(await getPaperFilesByPaperId(paperId)) ? await getPaperFilesByPaperId(paperId) : []) } catch { /* ignore */ }
    }

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true)
                const data = await getPaperById(paperId)
                setPaper(data)
                setFormData({ title: data.title || '', abstractField: data.abstractField || '' })
                setKeywords(data.keywords || [])
                if (data.primarySubjectAreaId) setPrimarySubjectAreaId(data.primarySubjectAreaId.toString())
                if (data.secondarySubjectAreaIds) setSecondarySubjectAreaIds(data.secondarySubjectAreaIds)

                const trackId = data.trackId || data.track?.id
                if (trackId) {
                    try { setSubjectAreas(await getSubjectAreasByTrack(trackId) || []) } catch { /* ignore */ }
                }
                const confId = data.track?.conference?.id || data.conferenceId
                if (confId) {
                    try { setActivities(await getConferenceActivities(confId)) } catch { /* ignore */ }
                }

                await fetchFiles()

                if (!['DRAFT', 'SUBMITTED', 'WITHDRAWN'].includes(data.status)) {
                    try { setAggregate(await getAggregateByPaper(paperId)) } catch { /* ignore */ }
                    try { setMetaReview(await getMetaReviewByPaper(paperId)) } catch { /* ignore */ }
                    try { 
                        const paperReviews = await getReviewsByPaper(paperId)
                        setReviews(paperReviews)
                        const completedReviews = paperReviews.filter(r => r.status === 'COMPLETED')
                        const answersMap: Record<number, ReviewAnswerResponse[]> = {}
                        await Promise.all(completedReviews.map(async (r) => {
                            const ans = await getAnswersByReview(r.id).catch(() => [])
                            answersMap[r.id] = ans
                        }))
                        setReviewAnswers(answersMap)
                    } catch { /* ignore */ }
                }
            } catch {
                toast.error('Failed to load paper details')
            } finally {
                setLoading(false)
            }
        }
        if (paperId && !isNaN(paperId)) { fetchAll(); fetchUsers(); fetchAuthors() }
    }, [paperId])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name as keyof typeof errors]) setErrors(prev => ({ ...prev, [name]: undefined }))
    }

    const handleSavePaper = async () => {
        const newErrors: any = {}
        const titleErr = V.required(formData.title) || V.maxLen(formData.title, 150)
        if (titleErr) newErrors.title = titleErr
        const abstractErr = V.required(formData.abstractField) || V.wordCount(formData.abstractField, 20, 250)
        if (abstractErr) newErrors.abstractField = abstractErr
        const keywordErr = keywords.length === 0 ? 'Please add at least one keyword' : keywords.some(k => k.length > 50) ? 'Keywords cannot be longer than 50 characters' : null
        if (keywordErr) newErrors.keywords = keywordErr
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

        try {
            setSaving(true)
            await updatePaper(paperId, {
                ...paper, ...formData, keywords,
                primarySubjectAreaId: Number(primarySubjectAreaId),
                secondarySubjectAreaIds,
                conferenceTrackId: paper?.trackId || paper?.track?.id
            })
            toast.success('Paper details updated successfully!')
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update paper')
        } finally { setSaving(false) }
    }

    const handleWithdraw = async () => {
        try {
            setWithdrawing(true)
            const updated = await withdrawPaper(paperId)
            setPaper(updated)
            setOpenWithdrawDialog(false)
            toast.success('Paper withdrawn successfully')
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to withdraw paper')
        } finally { setWithdrawing(false) }
    }

    const handleRestore = async () => {
        try {
            setWithdrawing(true)
            const updated = await restorePaper(paperId)
            setPaper(updated)
            toast.success('Paper restored successfully')
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to restore paper')
        } finally { setWithdrawing(false) }
    }

    const handleUploadFile = async () => {
        if (!selectedFile) { toast.error('Please select a file to upload'); return }
        try {
            setUploading(true)
            const conferenceId = paper?.conferenceId ?? paper?.track?.conference?.id
            if (!conferenceId) { toast.error('Conference information not available'); return }
            await updatePaperFile(conferenceId, paperId, selectedFile)
            toast.success('File uploaded successfully!')
            setSelectedFile(null)
            await fetchFiles()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to upload manuscript')
        } finally { setUploading(false) }
    }

    const handleDeleteFile = async (fileId: number) => {
        if (!confirm('Are you sure you want to delete this file?')) return
        try {
            await deletePaperFile(fileId)
            toast.success('File deleted successfully.')
            await fetchFiles()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete file')
        }
    }

    const handleCheckPlagiarism = async () => {
        setCheckingPlagiarism(true)
        try {
            const result = await recheckPlagiarism(paperId)
            const score = result.score ?? 0
            const status = result.status ?? 'COMPLETED'
            // Update paper state so badge refreshes
            setPaper(prev => prev ? { ...prev, plagiarismScore: score, plagiarismStatus: status } : prev)
            setPlagiarismKey(k => k + 1)
            
            // Show detailed toast
            const details = result.details
            if (details) {
                const label = score <= 20 ? '✅ Low' : score <= 40 ? '⚠️ Moderate' : '🚨 High'
                toast.success(
                    `Plagiarism Check Complete!\n${label} Similarity: ${score.toFixed(1)}%\n` +
                    `Internal: ${(details.internalScore ?? 0).toFixed(1)}% | Web: ${(details.webSearchScore ?? 0).toFixed(1)}% | AI: ${(details.externalScore ?? 0).toFixed(1)}%`,
                    { duration: 6000 }
                )
            } else {
                toast.success(`Plagiarism check completed. Score: ${score.toFixed(1)}%`)
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Plagiarism check failed')
        } finally {
            setCheckingPlagiarism(false)
        }
    }

    const handleSetActive = async (fileId: number) => {
        try {
            await setActiveFile(fileId)
            toast.success('Active version updated!')
            await fetchFiles()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to set active file')
        }
    }

    const handleAssignAuthor = async () => {
        if (!selectedUser) { toast.error('Please select a user'); return }
        if (authors.some(a => a.user.id === Number(selectedUser))) { toast.error('This author is already added.'); return }
        try {
            setIsAssigning(true)
            await assignAuthorToPaper(paperId, Number(selectedUser))
            toast.success('Author assigned successfully!')
            setSelectedUser(''); setOpenAddAuthorDialog(false)
            await fetchAuthors()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to assign author')
        } finally { setIsAssigning(false) }
    }

    const handleRemoveAuthor = async (paperAuthorId: number, authorName: string) => {
        if (!confirm(`Are you sure you want to remove ${authorName} as a co-author?`)) return
        try {
            await deleteAuthorFromPaper(paperAuthorId)
            toast.success(`${authorName} has been removed.`)
            await fetchAuthors()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to remove author')
        }
    }

    if (loading) {
        return <WorkspaceSkeleton />
    }

    if (!paper) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-muted-foreground text-lg">Paper not found</p>
                <BackButton fallbackUrl={'/conference'} />
            </div>
        )
    }

    // ── Business logic flags ──
    const isPaperSubmissionOpen = activities.some(
        a => a.activityType === 'PAPER_SUBMISSION' && a.isEnabled && (!a.deadline || new Date(a.deadline) > new Date())
    )
    const isCameraReadyOpen = activities.some(
        a => a.activityType === 'CAMERA_READY_SUBMISSION' && a.isEnabled && (!a.deadline || new Date(a.deadline) > new Date())
    )

    const isEditable = isPaperSubmissionOpen
    const showReviews = ['ACCEPTED', 'REJECTED', 'CAMERA_READY', 'PUBLISHED'].includes(paper.status) || aggregate?.reviewCount! > 0
    const showCameraReadyUpload = ['ACCEPTED'].includes(paper.status) && isCameraReadyOpen
    const canWithdraw = ['SUBMITTED', 'UNDER_REVIEW'].includes(paper.status)
    const decision = metaReview?.finalDecision ? DECISION_CONFIG[metaReview.finalDecision as keyof typeof DECISION_CONFIG] : null

    // ── Separate Files ──
    const manuscriptFiles = paperFiles.filter(pf => !pf.isCameraReady && !pf.isSupplementary).sort((a, b) => a.id - b.id)
    const supplementaryFiles = paperFiles.filter(pf => !pf.isCameraReady && pf.isSupplementary)
    const cameraReadyFiles = paperFiles.filter(pf => pf.isCameraReady)

    return (
        <div className="page-base space-y-6">
            <BackButton fallbackUrl={`/conference/${paper.conferenceId || paper.track?.conference?.id}/update`} className="-ml-2" />

            {/* ── Workspace Header ── */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold tracking-tight line-clamp-2">{paper.title}</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Badge className={`px-2.5 py-0.5 text-white ${getPaperStatus(paper.status).dot}`}>
                            {getPaperStatus(paper.status).label}
                        </Badge>
                        <PlagiarismBadge paperId={paper.id} score={paper.plagiarismScore} status={paper.plagiarismStatus} />
                        <span>·</span>
                        <span className="font-mono">#{paper.id}</span>
                        <span>·</span>
                        <span>{paper.track?.conference?.acronym}</span>
                        <span>·</span>
                        <span>{paper.track?.name}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── Main Info Column (Left) ── */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Lock banner */}
                    {!isEditable && (
                        <div className="flex items-center gap-3 p-4 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800">
                            <Lock className="h-5 w-5 text-indigo-600 shrink-0" />
                            <p className="text-sm text-indigo-800 dark:text-indigo-300">
                                <strong>Submission is locked.</strong> Editing is only allowed while the paper submission phase is active.
                            </p>
                        </div>
                    )}

                    {/* ── Conference Phase Tracker ── */}
                    {(paper?.conferenceId || paper?.track?.conference?.id) && (
                        <ConferencePhaseTracker conferenceId={paper.conferenceId ?? paper.track?.conference?.id!} />
                    )}

                    {/* Paper Overview */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold border-b pb-2">Paper Details</h2>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Abstract</h3>
                                <p className="text-sm leading-relaxed">{paper.abstractField || <span className="text-muted-foreground italic">No abstract provided</span>}</p>
                            </div>
                            
                            {paper.keywords && paper.keywords.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Keywords</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {paper.keywords.map((kw, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs font-normal bg-muted">{kw}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {subjectAreas && subjectAreas.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Subject Areas</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {subjectAreas.filter(sa => sa.id.toString() === primarySubjectAreaId).map(sa => (
                                            <Badge key={sa.id} variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">Primary: {sa.name}</Badge>
                                        ))}
                                        {secondarySubjectAreaIds.map(id => {
                                            const sa = subjectAreas.find(s => s.id === id)
                                            return sa ? <Badge key={sa.id} variant="outline" className="text-muted-foreground">{sa.name}</Badge> : null
                                        })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Submitted Date</h3>
                                <p className="text-sm">{fmtDate(paper.submissionTime)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Authors List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Co-Authors ({authors.length})</h2>
                            {isEditable && (
                                <Dialog open={openAddAuthorDialog} onOpenChange={setOpenAddAuthorDialog}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-1.5"><UserPlus className="h-4 w-4" /> Add Author</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add Co-Author</DialogTitle>
                                            <DialogDescription>Select a user to add as a co-author to this paper.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <Select value={selectedUser} onValueChange={setSelectedUser}>
                                                <SelectTrigger><SelectValue placeholder="Choose a user" /></SelectTrigger>
                                                <SelectContent>
                                                    {users.map(u => (
                                                        <SelectItem key={u.id} value={u.id.toString()}>{u.fullName} ({u.email})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button onClick={handleAssignAuthor} disabled={isAssigning || !selectedUser} className="w-full">
                                                {isAssigning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assigning...</> : 'Assign Author'}
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                        <div className="bg-white border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/30">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Name</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Email</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {authors.length === 0 ? (
                                        <tr><td colSpan={3} className="px-4 py-4 text-center text-sm text-muted-foreground">No co-authors added yet</td></tr>
                                    ) : authors.map(item => (
                                        <tr key={item.paperAuthorId} className="border-b last:border-0 hover:bg-muted/20">
                                            <td className="px-4 py-3 font-medium"><UserLink userId={item.user.id} name={item.user.fullName || item.user.email} className="font-medium" /></td>
                                            <td className="px-4 py-3 text-muted-foreground">{item.user.email}</td>
                                            <td className="px-4 py-3 text-right">
                                                {isEditable && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveAuthor(item.paperAuthorId, item.user.fullName || item.user.email)} className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Files Section Separated */}
                    <div className="space-y-6 pt-2">
                        {/* Manuscript Files */}
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold border-b pb-2 flex items-center gap-2"><Layers className="h-5 w-5" /> Manuscript Files</h2>
                            {manuscriptFiles.length > 0 ? (
                                <div className="border border-muted-foreground/20 rounded-lg overflow-hidden bg-white shadow-sm">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/30">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">File</th>
                                                <th className="px-4 py-3 text-center font-medium text-muted-foreground w-24">Status</th>
                                                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-48">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {manuscriptFiles.map((pf, idx) => (
                                                <tr key={pf.id} className="hover:bg-muted/20">
                                                    <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                                                            <span className="font-medium truncate max-w-[250px]" title={pf.url.split('/').pop()}>
                                                                {decodeURIComponent(pf.url.split('/').pop() || 'paper-file')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {pf.isActive ? <Badge className="bg-green-100/50 text-green-700 border border-green-200">Active</Badge> : <Badge variant="secondary" className="opacity-50">Archived</Badge>}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => setPreviewFileUrl(pf.url)}>
                                                                <Eye className="h-3.5 w-3.5" /> Preview
                                                            </Button>
                                                            <a href={pf.url} target="_blank" rel="noopener noreferrer">
                                                                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-600 hover:text-slate-900"><ExternalLink className="h-3.5 w-3.5" /> Open</Button>
                                                            </a>
                                                            <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteFile(pf.id)}>
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No manuscript files uploaded yet.</p>
                            )}

                            {/* Check Plagiarism Button */}
                            {manuscriptFiles.length > 0 && (
                                <div className="flex items-center gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 shadow-sm"
                                        onClick={handleCheckPlagiarism}
                                        disabled={checkingPlagiarism}
                                    >
                                        {checkingPlagiarism ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Checking Plagiarism...</>
                                        ) : (
                                            <><ShieldCheck className="h-4 w-4" /> Check Plagiarism</>
                                        )}
                                    </Button>
                                    {paper && (
                                        <PlagiarismBadge
                                            key={plagiarismKey}
                                            paperId={paper.id}
                                            score={paper.plagiarismScore}
                                            status={paper.plagiarismStatus}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Supplementary Files — Separate Section */}
                        <Card className="border-blue-200/50 shadow-sm bg-gradient-to-b from-blue-50/30 to-transparent">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-blue-500" /> Supplementary Files
                                    <Badge variant="outline" className="ml-auto text-blue-600 border-blue-200">{supplementaryFiles.length} file(s)</Badge>
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">Additional supporting materials — datasets, appendices, code, etc.</p>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {supplementaryFiles.length > 0 ? (
                                    <div className="border border-blue-100 rounded-lg overflow-hidden bg-white">
                                        <table className="w-full text-sm">
                                            <thead className="bg-blue-50/60">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left font-medium text-blue-800 w-12">#</th>
                                                    <th className="px-4 py-2.5 text-left font-medium text-blue-800">File</th>
                                                    <th className="px-4 py-2.5 text-right font-medium text-blue-800 w-44">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-blue-50">
                                                {supplementaryFiles.map((pf, idx) => (
                                                    <tr key={pf.id} className="hover:bg-blue-50/40 transition-colors">
                                                        <td className="px-4 py-2.5 text-blue-500 font-mono text-xs">{idx + 1}</td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                                                                <span className="font-medium text-sm truncate max-w-[300px]" title={pf.url.split('/').pop()}>
                                                                    {decodeURIComponent(pf.url.split('/').pop() || 'supplementary-file')}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button variant="ghost" size="sm" className="gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100/50 h-7" onClick={() => setPreviewFileUrl(pf.url)}>
                                                                    <Eye className="h-3.5 w-3.5" /> Preview
                                                                </Button>
                                                                <a href={pf.url} target="_blank" rel="noopener noreferrer">
                                                                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-7"><ExternalLink className="h-3.5 w-3.5" /></Button>
                                                                </a>
                                                                {isEditable && (
                                                                    <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteFile(pf.id)}>
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-blue-200 rounded-lg bg-blue-50/20">
                                        <FileText className="h-8 w-8 text-blue-300 mb-2" />
                                        <p className="text-sm text-muted-foreground">No supplementary files uploaded yet.</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Use the "Upload Supplementary" button in Actions to add files.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Camera Ready Files */}
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold border-b pb-2 flex items-center gap-2"><Camera className="h-5 w-5 text-emerald-600" /> Camera-Ready Files</h2>
                            {cameraReadyFiles.length > 0 ? (
                                    <div className="border border-emerald-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                        <table className="w-full text-sm">
                                            <thead className="bg-emerald-50/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-medium text-emerald-900 w-12">#</th>
                                                    <th className="px-4 py-3 text-left font-medium text-emerald-900">File</th>
                                                    <th className="px-4 py-3 text-center font-medium text-emerald-900 w-24">Status</th>
                                                    <th className="px-4 py-3 text-right font-medium text-emerald-900 w-48">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-emerald-100">
                                                {cameraReadyFiles.map((pf, idx) => (
                                                    <tr key={pf.id} className="hover:bg-emerald-50/30">
                                                        <td className="px-4 py-3 text-emerald-600/70">{idx + 1}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <Camera className="h-4 w-4 text-emerald-600 shrink-0" />
                                                                <span className="font-medium truncate max-w-[250px] text-emerald-950" title={pf.url.split('/').pop()}>
                                                                    {decodeURIComponent(pf.url.split('/').pop() || 'camera-ready-file')}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {pf.isActive ? <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Active</Badge> : <Badge variant="secondary" className="opacity-50">Archived</Badge>}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100" onClick={() => setPreviewFileUrl(pf.url)}>
                                                                    <Eye className="h-3.5 w-3.5" /> Preview
                                                                </Button>
                                                                <a href={pf.url} target="_blank" rel="noopener noreferrer">
                                                                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100"><ExternalLink className="h-3.5 w-3.5" /> Open</Button>
                                                                </a>
                                                                <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteFile(pf.id)}>
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg bg-emerald-50/20 border-emerald-100">No camera-ready files uploaded yet.</p>
                                )}
                        </div>
                    </div>
                </div>

                {/* ── Actions Sidebar (Right) ── */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-24 shadow-sm border-indigo-100/50 dark:border-indigo-900/50 bg-gradient-to-b from-transparent to-indigo-50/10 dark:to-indigo-950/10">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2"><Layers className="h-5 w-5 text-indigo-500" /> Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Update Metadata */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start gap-3 h-11 bg-white hover:bg-indigo-50 hover:text-indigo-800" disabled={!isEditable}>
                                        <ClipboardList className="h-4 w-4 text-indigo-600" /> Update Metadata
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Update Paper Metadata</DialogTitle>
                                        <DialogDescription>Modify your submission details below.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="title">Title</Label>
                                            <Input id="title" name="title" value={formData.title} onChange={handleInputChange} placeholder="Paper Title" />
                                            <FieldError>{errors.title}</FieldError>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="abstractField">Abstract</Label>
                                            <Textarea id="abstractField" name="abstractField" value={formData.abstractField} onChange={handleInputChange} placeholder="Paper Abstract" rows={5} />
                                            <FieldError>{errors.abstractField}</FieldError>
                                        </div>
                                        <div className="space-y-3">
                                            <Label>Keywords (Press Enter to add)</Label>
                                            {keywords.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {keywords.map((kw, i) => (
                                                        <Badge key={i} variant="secondary" className="text-sm gap-1 pl-3 pr-1.5 py-1">
                                                            {kw}
                                                            <button type="button" onClick={() => setKeywords(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 rounded-full text-slate-500 hover:text-slate-800"><X className="h-3 w-3" /></button>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            <Input value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        const trimmed = keywordInput.trim()
                                                        if (trimmed && !keywords.includes(trimmed)) { setKeywords(prev => [...prev, trimmed]); setKeywordInput(''); setErrors(prev => ({ ...prev, keywords: undefined })) }
                                                    }
                                                }} placeholder="Type a keyword and press Enter" />
                                        </div>
                                        {subjectAreas.length > 0 && (
                                            <div className="grid gap-4 md:grid-cols-2 pt-2">
                                                <div className="space-y-2">
                                                    <Label>Primary Subject Area</Label>
                                                    <Select value={primarySubjectAreaId} onValueChange={setPrimarySubjectAreaId}>
                                                        <SelectTrigger><SelectValue placeholder="Select primary area" /></SelectTrigger>
                                                        <SelectContent>
                                                            {subjectAreas.map(sa => (
                                                                <SelectItem key={sa.id} value={sa.id.toString()}>{sa.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Secondary Subject Areas</Label>
                                                    <AntdSelect mode="multiple" className="w-full" placeholder="Select secondary areas" value={secondarySubjectAreaIds} onChange={setSecondarySubjectAreaIds} options={subjectAreas.filter(sa => sa.id.toString() !== primarySubjectAreaId).map(sa => ({ label: sa.name, value: sa.id }))} />
                                                </div>
                                            </div>
                                        )}
                                        <div className="pt-4 flex justify-end">
                                            <DialogTrigger asChild>
                                                <Button onClick={handleSavePaper} disabled={saving} className="gap-2 w-full sm:w-auto">
                                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                                                </Button>
                                            </DialogTrigger>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Upload File */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start gap-3 h-11 bg-white hover:bg-blue-50 hover:text-blue-800" disabled={!isEditable}>
                                        <FileUp className="h-4 w-4 text-blue-600" /> Upload Manuscript
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Upload / Update Manuscript</DialogTitle>
                                        <DialogDescription>Select a PDF file to upload as your manuscript.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <label htmlFor="file-upload" className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30">
                                            <FileUp className="h-8 w-8 text-muted-foreground" />
                                            <span className="text-sm font-medium">{selectedFile ? selectedFile.name : 'Click to choose a PDF file'}</span>
                                        </label>
                                        <input id="file-upload" type="file" accept=".pdf" className="hidden"
                                            onChange={e => {
                                                const f = e.target.files?.[0]
                                                if (f) { if (f.type !== 'application/pdf') { toast.error('Please select a PDF file'); return }; setSelectedFile(f) }
                                            }} />
                                        <div className="flex justify-end pt-2">
                                                <Button onClick={handleUploadFile} disabled={uploading || !selectedFile} className="gap-2">
                                                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploading ? 'Uploading...' : 'Upload'}
                                                </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Upload Supplementary */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start gap-3 h-11 bg-white hover:bg-blue-50 hover:text-blue-800" disabled={!isEditable}>
                                        <FileUp className="h-4 w-4 text-blue-500" /> Upload Supplementary
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Upload Supplementary File</DialogTitle>
                                        <DialogDescription>Upload additional supporting files (datasets, appendices, etc.)</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <label htmlFor="supplementary-upload" className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-blue-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30">
                                            <FileUp className="h-8 w-8 text-blue-400" />
                                            <span className="text-sm font-medium">{selectedFile ? selectedFile.name : 'Click to choose a file'}</span>
                                        </label>
                                        <input id="supplementary-upload" type="file" accept=".pdf,.doc,.docx,.zip,.rar" className="hidden"
                                            onChange={e => {
                                                const f = e.target.files?.[0]
                                                if (f) setSelectedFile(f)
                                            }} />
                                        <div className="flex justify-end pt-2">
                                            <Button onClick={async () => {
                                                if (!selectedFile) { toast.error('Please select a file'); return }
                                                try {
                                                    setUploading(true)
                                                    const conferenceId = paper?.conferenceId ?? paper?.track?.conference?.id
                                                    if (!conferenceId) { toast.error('Conference information not available'); return }
                                                    await uploadSupplementaryFile(conferenceId, paperId, selectedFile)
                                                    toast.success('Supplementary file uploaded!')
                                                    setSelectedFile(null)
                                                    await fetchFiles()
                                                } catch (error: any) {
                                                    toast.error(error.response?.data?.message || 'Failed to upload')
                                                } finally { setUploading(false) }
                                            }} disabled={uploading || !selectedFile} className="gap-2">
                                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploading ? 'Uploading...' : 'Upload'}
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Camera Ready */}
                            {/* Camera Ready */}
                            <Button 
                                variant="outline" 
                                className="w-full justify-start gap-3 h-11 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800 shadow-sm" 
                                disabled={!showCameraReadyUpload}
                                onClick={() => {
                                    const confId = paper.conferenceId || paper.track?.conference?.id
                                    if (confId) {
                                        router.push(`/conference/${confId}/paper/${paper.id}/camera-ready`)
                                    } else {
                                        toast.error('Conference information not available')
                                    }
                                }}
                            >
                                <Camera className="h-4 w-4 text-emerald-600" /> Upload Camera Ready
                            </Button>

                            {/* View Reviews */}
                            {showReviews && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start gap-3 h-11 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 shadow-sm">
                                            <Star className="h-4 w-4 text-indigo-600" /> View Reviews Result
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Review Results</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-6 py-4">
                                            {aggregate && aggregate.reviewCount > 0 ? (
                                                <>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <Card className="border-0 shadow-sm bg-muted/30">
                                                            <CardContent className="p-4 text-center">
                                                                <p className="text-xl font-bold">{aggregate.reviewCount}</p>
                                                                <p className="text-xs text-muted-foreground mt-0.5">Reviews</p>
                                                            </CardContent>
                                                        </Card>
                                                        <Card className="border-0 shadow-sm bg-muted/30">
                                                            <CardContent className="p-4 text-center">
                                                                <p className="text-xl font-bold text-green-700">{aggregate.completedReviewCount}</p>
                                                                <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
                                                            </CardContent>
                                                        </Card>
                                                        {aggregate.averageTotalScore > 0 && (
                                                            <Card className="border-0 shadow-sm bg-indigo-50 dark:bg-indigo-950/20">
                                                                <CardContent className="p-4 text-center">
                                                                    <p className="text-xl font-bold text-indigo-700">{aggregate.averageTotalScore.toFixed(2)}</p>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">Avg Score</p>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                        {decision && (
                                                            <Card className="border-0 shadow-sm bg-muted/30">
                                                                <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                                                                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${decision.bg} ${decision.text} ${decision.border}`}>
                                                                        {decision.label}
                                                                    </span>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                    </div>

                                                    {aggregate.questionAggregates?.length > 0 && (
                                                        <Card>
                                                            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Scores</CardTitle></CardHeader>
                                                            <CardContent className="space-y-4">
                                                                {aggregate.questionAggregates.map(qa => (
                                                                    <div key={qa.questionId}>
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="text-xs font-medium">{qa.questionText}</span>
                                                                            <span className="text-sm font-bold text-indigo-700">{qa.averageScore.toFixed(1)}</span>
                                                                        </div>
                                                                        <div className="w-full bg-muted rounded-full h-1.5">
                                                                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min((qa.averageScore / (qa.maxScore || 5)) * 100, 100)}%` }} />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </CardContent>
                                                        </Card>
                                                    )}

                                                    {/* Custom grouping logic for detailed answers */}
                                                    {(() => {
                                                        const completedReviews = reviews.filter(r => r.status === 'COMPLETED').sort((a,b) => a.id - b.id)
                                                        if (completedReviews.length === 0) return null

                                                        // Group by questionId
                                                        const qMap: Record<number, { text: string; answers: { reviewerIndex: number; value: string; choice: string | null }[] }> = {}
                                                        
                                                        completedReviews.forEach((rev, index) => {
                                                            const ansArr = reviewAnswers[rev.id] || []
                                                            ansArr.forEach(ans => {
                                                                if (!qMap[ans.questionId]) {
                                                                    qMap[ans.questionId] = { text: ans.questionText || `Question ${ans.questionId}`, answers: [] }
                                                                }
                                                                qMap[ans.questionId].answers.push({
                                                                    reviewerIndex: index + 1,
                                                                    value: ans.answerValue || '',
                                                                    choice: ans.selectedChoiceText || null
                                                                })
                                                            })
                                                        })

                                                        const questions = Object.values(qMap)
                                                        if (questions.length === 0) return null

                                                        return (
                                                            <div className="space-y-4 mt-6">
                                                                <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2"><ClipboardList className="h-5 w-5 text-indigo-600" /> Detailed Reviewer Comments</h3>
                                                                {questions.map((q, idx) => (
                                                                    <Card key={idx} className="shadow-sm border-slate-200">
                                                                        <CardHeader className="bg-slate-50/50 py-3 border-b">
                                                                            <CardTitle className="text-sm font-medium leading-relaxed">{q.text}</CardTitle>
                                                                        </CardHeader>
                                                                        <CardContent className="p-0 divide-y">
                                                                            {q.answers.map((ans, i) => (
                                                                                <div key={i} className="p-4 flex gap-4 hover:bg-slate-50/50 transition-colors">
                                                                                    <div className="shrink-0 pt-0.5">
                                                                                        <Badge variant="outline" className="bg-white text-indigo-700 font-mono text-xs border-indigo-200 shadow-sm">Reviewer {ans.reviewerIndex}</Badge>
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        {ans.choice && <p className="text-sm font-semibold text-slate-800 mb-1.5"><span className="text-slate-500 font-normal">Selected:</span> {ans.choice}</p>}
                                                                                        {ans.value ? (
                                                                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{ans.value}</p>
                                                                                        ) : (
                                                                                            !ans.choice && <p className="text-sm text-slate-400 italic">No comments provided.</p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </CardContent>
                                                                    </Card>
                                                                ))}
                                                            </div>
                                                        )
                                                    })()}

                                                    {/* Program Chair Final Decision */}
                                                    {metaReview && (
                                                        <Card className={`border-l-4 ${decision ? `border-l-${decision.border.replace('border-', '')}` : 'border-indigo-400'} shadow-md mt-6 overflow-hidden`}>
                                                            <CardHeader className="bg-slate-50/80 pb-3 border-b sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                                                <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-indigo-600" /> Chair Final Decision</CardTitle>
                                                                {decision && (
                                                                    <Badge className={`${decision.bg} ${decision.text} ${decision.border} px-3 py-1 shadow-sm text-sm gap-1`}>
                                                                        {decision.label}
                                                                    </Badge>
                                                                )}
                                                            </CardHeader>
                                                            <CardContent className="pt-4 bg-white">
                                                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Chair's Reason / Comments</h4>
                                                                {metaReview.reason ? (
                                                                    <div className="bg-slate-50/50 rounded-md p-4 border border-slate-100 shadow-inner">
                                                                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{metaReview.reason}</p>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-slate-400 italic">No additional reasons or comments provided.</p>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="py-12 text-center text-muted-foreground">
                                                    <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                                    <p>Reviews will appear here once reviewers complete their assessments.</p>
                                                </div>
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}

                            {/* Withdraw/Restore Paper */}
                            {canWithdraw && (
                                <>
                                    <div className="my-2 border-t border-slate-100" />
                                    <Dialog open={openWithdrawDialog} onOpenChange={setOpenWithdrawDialog}>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-red-600 hover:bg-red-50 hover:text-red-700">
                                                <AlertTriangle className="h-4 w-4" /> Withdraw Submission
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Withdraw Paper</DialogTitle>
                                                <DialogDescription>
                                                    Are you sure you want to withdraw <strong>{paper.title}</strong>?
                                                    Your submission will be removed from review. You can restore it later if submissions are still open.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter className="mt-4">
                                                <Button variant="outline" onClick={() => setOpenWithdrawDialog(false)}>Cancel</Button>
                                                <Button variant="destructive" onClick={handleWithdraw} disabled={withdrawing}>
                                                    {withdrawing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Confirm Withdraw
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </>
                            )}
                            
                            {paper.status === 'WITHDRAWN' && (
                                <>
                                  <div className="my-2 border-t border-slate-100" />
                                  <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-gray-700" onClick={handleRestore} disabled={withdrawing}>
                                      {withdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Restore Submission
                                  </Button>
                                </>
                            )}

                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Nested PDF Preview Dialog */}
            <Dialog open={!!previewFileUrl} onOpenChange={(o) => { if (!o) setPreviewFileUrl(null) }}>
                <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col gap-0 border-0 bg-transparent shadow-2xl">
                    <DialogHeader className="p-4 bg-slate-900 border-b border-slate-800 flex flex-row items-center justify-between m-0 shrink-0">
                        <div>
                            <DialogTitle className="text-slate-100 text-base">PDF Preview</DialogTitle>
                            <DialogDescription className="text-slate-400 text-xs hidden sm:block truncate pr-8">
                                {previewFileUrl?.split('/').pop()?.split('?')[0]}
                            </DialogDescription>
                        </div>
                        <a href={previewFileUrl || '#'} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white gap-1.5">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open in new tab
                            </Button>
                        </a>
                    </DialogHeader>
                    <div className="flex-1 bg-slate-900/50 relative w-full h-full backdrop-blur-sm">
                        {previewFileUrl && (
                            <iframe 
                                src={`https://docs.google.com/gview?url=${encodeURIComponent(previewFileUrl)}&embedded=true`} 
                                className="w-full h-full border-0 absolute inset-0" 
                                title="PDF Document Viewer"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}