'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getConference } from '@/app/api/conference.api'
import { getPapersByAuthor } from '@/app/api/paper.api'
import { uploadCameraReady, getFilesByPaper, type CameraReadyFile } from '@/app/api/camera-ready.api'
import {
    getTicketTypes, getMyTicket, registerForConference, retryPayment,
    type TicketTypeResponse, type TicketResponse
} from '@/app/api/registration.api'
import { getUserByEmail } from '@/app/api/user.api'
import type { ConferenceResponse } from '@/types/conference'
import type { PaperResponse } from '@/types/paper'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import {
    Loader2, ArrowLeft, Upload, FileCheck, ExternalLink, Ticket, CreditCard,
    CheckCircle2, AlertTriangle, ShieldCheck, FileText, RefreshCw, Info,
    ChevronDown, ChevronUp, Tag, Calendar, Layers, Users
} from 'lucide-react'

// ── Types ──
type Step = 'loading' | 'register' | 'pending-payment' | 'upload'

// ── Main Page ──
export default function CameraReadyPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [cameraReadyFiles, setCameraReadyFiles] = useState<Record<number, CameraReadyFile[]>>({})
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState<number | null>(null)

    // Registration state
    const [userId, setUserId] = useState<number | null>(null)
    const [myTicket, setMyTicket] = useState<TicketResponse | null>(null)
    const [ticketTypes, setTicketTypes] = useState<TicketTypeResponse[]>([])
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
    const [selectedPaperIds, setSelectedPaperIds] = useState<Set<number>>(new Set())
    const [registering, setRegistering] = useState(false)
    const [retrying, setRetrying] = useState(false)
    const [currentStep, setCurrentStep] = useState<Step>('loading')
    const [expandedPapers, setExpandedPapers] = useState<Set<number>>(new Set())

    useEffect(() => {
        fetchData()
    }, [conferenceId])

    const fetchData = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('accessToken')
            if (!token) { router.push('/auth/login'); return }

            const payload = JSON.parse(atob(token.split('.')[1]))
            const user = await getUserByEmail(payload.sub)
            if (!user?.id) { router.push('/auth/login'); return }
            setUserId(user.id)

            const [conf, allPapers, tickets] = await Promise.all([
                getConference(conferenceId),
                getPapersByAuthor(user.id),
                getTicketTypes(conferenceId, true).catch(() => []),
            ])
            setConference(conf)
            setTicketTypes(tickets)

            // ★ KEY FIX: Filter papers that belong to THIS conference AND are ACCEPTED/PUBLISHED
            const eligible = allPapers.filter(p =>
                p.conferenceId === conferenceId &&
                (p.status === 'ACCEPTED' || p.status === 'PUBLISHED')
            )
            setPapers(eligible)

            // Auto-select all papers for registration
            setSelectedPaperIds(new Set(eligible.map(p => p.id)))

            // Load camera-ready files
            const filesMap: Record<number, CameraReadyFile[]> = {}
            await Promise.all(
                eligible.map(async (p) => {
                    const files = await getFilesByPaper(p.id).catch(() => [])
                    filesMap[p.id] = files.filter(f => f.isCameraReady)
                })
            )
            setCameraReadyFiles(filesMap)

            // Check registration status
            try {
                const ticket = await getMyTicket(conferenceId, user.id)
                setMyTicket(ticket)
                if (ticket.paymentStatus === 'COMPLETED') {
                    setCurrentStep('upload')
                } else if (ticket.paymentStatus === 'PENDING') {
                    setCurrentStep('pending-payment')
                } else {
                    setCurrentStep('register')
                }
            } catch {
                setCurrentStep('register')
            }
        } catch (err) {
            console.error('Failed to load camera-ready page:', err)
            toast.error('Failed to load page data')
        } finally {
            setLoading(false)
        }
    }

    const togglePaperSelection = (paperId: number) => {
        setSelectedPaperIds(prev => {
            const next = new Set(prev)
            if (next.has(paperId)) next.delete(paperId)
            else next.add(paperId)
            return next
        })
    }

    const toggleAllPapers = () => {
        if (selectedPaperIds.size === papers.length) {
            setSelectedPaperIds(new Set())
        } else {
            setSelectedPaperIds(new Set(papers.map(p => p.id)))
        }
    }

    const toggleExpand = (paperId: number) => {
        setExpandedPapers(prev => {
            const next = new Set(prev)
            if (next.has(paperId)) next.delete(paperId)
            else next.add(paperId)
            return next
        })
    }

    const handleRegister = async () => {
        if (!selectedTicketId || !userId || selectedPaperIds.size === 0) return
        try {
            setRegistering(true)
            // Register with first selected paper (backend supports 1 paperId per registration)
            const primaryPaperId = Array.from(selectedPaperIds)[0]
            const result = await registerForConference(conferenceId, userId, {
                ticketTypeId: selectedTicketId,
                paperId: primaryPaperId,
            })
            setMyTicket(result.ticket)

            if (result.paymentUrl) {
                toast.success('Redirecting to payment gateway...')
                window.location.href = result.paymentUrl
            } else if (result.ticket.paymentStatus === 'COMPLETED') {
                toast.success('Registration complete! You can now upload camera-ready files.')
                setCurrentStep('upload')
            } else {
                setCurrentStep('pending-payment')
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Registration failed. Please try again.'
            toast.error(msg)
            if (msg.includes('already registered')) {
                try {
                    const ticket = await getMyTicket(conferenceId, userId)
                    setMyTicket(ticket)
                    if (ticket.paymentStatus === 'COMPLETED') setCurrentStep('upload')
                    else setCurrentStep('pending-payment')
                } catch { /* ignore */ }
            }
        } finally {
            setRegistering(false)
        }
    }

    const handleRetryPayment = async () => {
        if (!userId) return
        try {
            setRetrying(true)
            const result = await retryPayment(conferenceId, userId)
            setMyTicket(result.ticket)
            if (result.paymentUrl) {
                toast.success('Redirecting to payment gateway...')
                window.location.href = result.paymentUrl
            } else if (result.ticket.paymentStatus === 'COMPLETED') {
                toast.success('Payment already completed!')
                setCurrentStep('upload')
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to retry payment.')
        } finally {
            setRetrying(false)
        }
    }

    const handleUpload = async (paperId: number) => {
        if (!userId) return
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.pdf,.doc,.docx'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
            try {
                setUploading(paperId)
                const uploaded = await uploadCameraReady(conferenceId, paperId, userId, file)
                setCameraReadyFiles(prev => ({
                    ...prev,
                    [paperId]: [...(prev[paperId] || []), uploaded],
                }))
                toast.success('Camera-ready file uploaded successfully!')
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Upload failed. Please try again.')
            } finally {
                setUploading(null)
            }
        }
        input.click()
    }

    // ── Derived data ──
    const authorTickets = useMemo(() => ticketTypes.filter(t => t.category === 'AUTHOR'), [ticketTypes])
    const otherTickets = useMemo(() => ticketTypes.filter(t => t.category !== 'AUTHOR'), [ticketTypes])
    const selectedTicket = useMemo(() => ticketTypes.find(t => t.id === selectedTicketId), [ticketTypes, selectedTicketId])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* ── Header ── */}
            <div className="space-y-3">
                <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push('/paper')}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to My Papers
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Camera-Ready Submission</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {conference?.name} — Upload your final camera-ready manuscript
                    </p>
                </div>
            </div>

            {/* ── Progress Steps ── */}
            <div className="flex items-center gap-0 py-2">
                <StepIndicator
                    label="Register & Pay"
                    icon={<CreditCard className="w-4 h-4" />}
                    isComplete={currentStep === 'upload'}
                    isActive={currentStep === 'register' || currentStep === 'pending-payment'}
                />
                <div className={`flex-1 h-0.5 mx-3 rounded transition-colors ${currentStep === 'upload' ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                <StepIndicator
                    label="Upload Camera-Ready"
                    icon={<Upload className="w-4 h-4" />}
                    isComplete={papers.length > 0 && papers.every(p => (cameraReadyFiles[p.id] || []).length > 0)}
                    isActive={currentStep === 'upload'}
                />
            </div>

            {/* ── No eligible papers ── */}
            {papers.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="font-medium">No accepted papers found</p>
                        <p className="text-sm mt-1">You don&apos;t have any accepted papers in this conference.</p>
                    </CardContent>
                </Card>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* STEP 1: REGISTRATION & PAYMENT                */}
            {/* ═══════════════════════════════════════════════ */}
            {papers.length > 0 && (currentStep === 'register' || currentStep === 'pending-payment') && (
                <div className="space-y-5">
                    {/* Info banner */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Registration Required</p>
                            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                                To upload your camera-ready manuscript, you must register for the conference and complete payment first.
                            </p>
                        </div>
                    </div>

                    {/* Pending payment */}
                    {currentStep === 'pending-payment' && myTicket && (
                        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                            <CreditCard className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">Payment Pending</p>
                                            <p className="text-sm text-muted-foreground">
                                                {myTicket.ticketTypeName} · #{myTicket.registrationNumber}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                                        {myTicket.price > 0 ? `${myTicket.price.toLocaleString()} ${myTicket.currency}` : 'Free'}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Your payment is being processed. If completed, click refresh below.
                                </p>
                                <div className="flex items-center gap-3">
                                    <Button className="gap-2" onClick={handleRetryPayment} disabled={retrying}>
                                        {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                                        {retrying ? 'Processing...' : 'Retry Payment'}
                                    </Button>
                                    <Button variant="outline" className="gap-2" onClick={() => fetchData()}>
                                        <RefreshCw className="h-4 w-4" />
                                        Refresh Status
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Ticket selection — only show when not pending */}
                    {currentStep === 'register' && (
                        <>
                            {/* Paper multi-select */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Your Accepted Papers ({papers.length})
                                    </label>
                                    {papers.length > 1 && (
                                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={toggleAllPapers}>
                                            {selectedPaperIds.size === papers.length ? 'Deselect All' : 'Select All'}
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {papers.map(p => (
                                        <PaperSelectCard
                                            key={p.id}
                                            paper={p}
                                            selected={selectedPaperIds.has(p.id)}
                                            expanded={expandedPapers.has(p.id)}
                                            onToggleSelect={() => togglePaperSelection(p.id)}
                                            onToggleExpand={() => toggleExpand(p.id)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Author Tickets */}
                            {authorTickets.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Ticket className="h-4 w-4" />
                                        Author Registration Tickets
                                        <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-300 bg-indigo-50">Recommended</Badge>
                                    </h3>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {authorTickets.map(t => (
                                            <TicketCard
                                                key={t.id}
                                                ticket={t}
                                                selected={selectedTicketId === t.id}
                                                onSelect={() => setSelectedTicketId(t.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Other Tickets */}
                            {otherTickets.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Ticket className="h-4 w-4" />
                                        Other Ticket Types
                                    </h3>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {otherTickets.map(t => (
                                            <TicketCard
                                                key={t.id}
                                                ticket={t}
                                                selected={selectedTicketId === t.id}
                                                onSelect={() => setSelectedTicketId(t.id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {ticketTypes.length === 0 && (
                                <Card>
                                    <CardContent className="py-8 text-center text-muted-foreground">
                                        <Info className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                        <p className="font-medium">No ticket types available yet</p>
                                        <p className="text-sm mt-1">Please contact the conference organizers.</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Summary + Register */}
                            {selectedTicket && selectedPaperIds.size > 0 && (
                                <Card className="border-primary/30 bg-primary/5">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Registration Summary</p>
                                                <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedTicket.name}</p>
                                            </div>
                                            <p className="text-xl font-bold text-primary">
                                                {selectedTicket.price === 0 ? 'Free' : `${selectedTicket.price.toLocaleString()} ${selectedTicket.currency}`}
                                            </p>
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-0.5">
                                            <p>
                                                <span className="font-medium">{selectedPaperIds.size}</span> paper{selectedPaperIds.size > 1 ? 's' : ''} selected:
                                            </p>
                                            {papers.filter(p => selectedPaperIds.has(p.id)).map(p => (
                                                <p key={p.id} className="pl-3 truncate">• {p.title}</p>
                                            ))}
                                        </div>
                                        <Button
                                            size="lg"
                                            disabled={registering}
                                            className="w-full gap-2 text-base h-12"
                                            onClick={handleRegister}
                                        >
                                            {registering ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <CreditCard className="h-5 w-5" />
                                            )}
                                            {registering
                                                ? 'Processing...'
                                                : selectedTicket.price === 0
                                                    ? 'Register (Free)'
                                                    : `Register & Pay ${selectedTicket.price.toLocaleString()} ${selectedTicket.currency}`
                                            }
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* STEP 2: UPLOAD CAMERA-READY                   */}
            {/* ═══════════════════════════════════════════════ */}
            {papers.length > 0 && currentStep === 'upload' && (
                <div className="space-y-4">
                    {/* Success banner */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-4 flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Registration Complete</p>
                            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                                {myTicket && (
                                    <>
                                        <span className="font-medium">{myTicket.ticketTypeName}</span> ·
                                        Reg #{myTicket.registrationNumber} ·{' '}
                                    </>
                                )}
                                Upload your camera-ready manuscripts below.
                            </p>
                        </div>
                    </div>

                    {/* Paper upload cards with expandable details */}
                    {papers.map(p => {
                        const files = cameraReadyFiles[p.id] || []
                        const hasUploaded = files.length > 0
                        const isPublished = p.status === 'PUBLISHED'
                        const isExpanded = expandedPapers.has(p.id)

                        return (
                            <Card key={p.id} className={`overflow-hidden border-l-4 ${
                                isPublished ? 'border-l-emerald-500' : hasUploaded ? 'border-l-indigo-500' : 'border-l-amber-500'
                            }`}>
                                <CardContent className="p-5 space-y-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div className="flex items-start gap-2">
                                                <button
                                                    onClick={() => toggleExpand(p.id)}
                                                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </button>
                                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">{p.title}</h3>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap ml-6">
                                                <Badge className={
                                                    isPublished ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                                    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                                }>
                                                    {isPublished ? '✅ Published' : p.status}
                                                </Badge>
                                                {hasUploaded && !isPublished && (
                                                    <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                                                        <FileCheck className="h-3 w-3 mr-1" />
                                                        Uploaded
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Upload button */}
                                        <div className="shrink-0">
                                            {!isPublished ? (
                                                <Button
                                                    onClick={() => handleUpload(p.id)}
                                                    disabled={uploading === p.id}
                                                    variant={hasUploaded ? 'outline' : 'default'}
                                                    className="gap-2"
                                                >
                                                    {uploading === p.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Upload className="h-4 w-4" />
                                                    )}
                                                    {hasUploaded ? 'Re-upload' : 'Upload PDF'}
                                                </Button>
                                            ) : (
                                                <Badge className="bg-emerald-100 text-emerald-800 text-sm py-1.5 px-3">
                                                    ✅ Published
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expandable details */}
                                    {isExpanded && (
                                        <div className="mt-3 ml-6 pt-3 border-t space-y-3">
                                            {/* Abstract */}
                                            {p.abstractField && (
                                                <div>
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Abstract</p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{p.abstractField}</p>
                                                </div>
                                            )}
                                            {/* Meta */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Layers className="h-3.5 w-3.5" />
                                                    Track: {p.track?.name}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    Submitted: {new Date(p.submissionTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                            {/* Keywords */}
                                            {p.keywords && p.keywords.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Tag className="h-3 w-3 text-muted-foreground" />
                                                    {p.keywords.map((kw, i) => (
                                                        <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">{kw}</Badge>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Uploaded files */}
                                            {files.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uploaded Files</p>
                                                    {files.map(f => (
                                                        <a
                                                            key={f.id}
                                                            href={f.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                                                        >
                                                            <FileText className="h-3.5 w-3.5" />
                                                            Camera-ready file #{f.id}
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ── Step Indicator Component ──
function StepIndicator({ label, icon, isComplete, isActive }: {
    label: string; icon: React.ReactNode; isComplete: boolean; isActive: boolean
}) {
    return (
        <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                isComplete ? 'bg-emerald-500 text-white' :
                isActive ? 'bg-primary text-white ring-4 ring-primary/20' :
                'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}>
                {isComplete ? <CheckCircle2 className="w-4 h-4" /> : icon}
            </div>
            <span className={`text-sm font-medium whitespace-nowrap ${
                isActive ? 'text-primary' : isComplete ? 'text-emerald-600' : 'text-gray-400'
            }`}>
                {label}
            </span>
        </div>
    )
}

// ── Paper Selection Card (with expandable details) ──
function PaperSelectCard({ paper, selected, expanded, onToggleSelect, onToggleExpand }: {
    paper: PaperResponse; selected: boolean; expanded: boolean
    onToggleSelect: () => void; onToggleExpand: () => void
}) {
    return (
        <div className={`rounded-xl border-2 transition-all ${
            selected
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
        }`}>
            {/* Header row */}
            <div className="flex items-center gap-3 p-3">
                {/* Checkbox */}
                <button
                    onClick={onToggleSelect}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        selected ? 'bg-primary border-primary text-white' : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                    }`}
                >
                    {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>

                {/* Paper title + status */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{paper.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] h-5">{paper.status}</Badge>
                        <span className="text-[10px] text-muted-foreground">{paper.track?.name}</span>
                    </div>
                </div>

                {/* Expand toggle */}
                <button
                    onClick={onToggleExpand}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
            </div>

            {/* Expandable details */}
            {expanded && (
                <div className="px-3 pb-3 pt-0 ml-8 border-t space-y-2">
                    {paper.abstractField && (
                        <p className="text-xs text-muted-foreground leading-relaxed mt-2">{paper.abstractField}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(paper.submissionTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                    {paper.keywords && paper.keywords.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            {paper.keywords.map((kw, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 h-4">{kw}</Badge>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Ticket Card Component ──
function TicketCard({ ticket, selected, onSelect }: {
    ticket: TicketTypeResponse; selected: boolean; onSelect: () => void
}) {
    const disabled = ticket.isSoldOut || ticket.isDeadlinePassed

    return (
        <button
            onClick={() => !disabled && onSelect()}
            disabled={disabled}
            className={`text-left p-4 rounded-xl border-2 transition-all w-full ${
                disabled
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 opacity-60 cursor-not-allowed'
                    : selected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 hover:shadow-sm cursor-pointer'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{ticket.name}</p>
                    {ticket.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-5">{ticket.category}</Badge>
                        {ticket.deadline && (
                            <span className="text-[10px] text-muted-foreground">
                                Deadline: {new Date(ticket.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        )}
                        {ticket.availableSlots !== null && (
                            <span className={`text-[10px] ${ticket.availableSlots <= 5 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                                {ticket.availableSlots} slot{ticket.availableSlots !== 1 ? 's' : ''} left
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${selected ? 'text-primary' : 'text-gray-900 dark:text-gray-100'}`}>
                        {ticket.price === 0 ? 'Free' : `${ticket.price.toLocaleString()} ${ticket.currency}`}
                    </p>
                    {ticket.isSoldOut && <span className="text-xs text-red-500 font-medium">Sold Out</span>}
                    {ticket.isDeadlinePassed && !ticket.isSoldOut && <span className="text-xs text-red-500 font-medium">Expired</span>}
                </div>
            </div>
            {selected && !disabled && (
                <div className="mt-2.5 pt-2 border-t border-primary/20 flex items-center gap-1.5 text-xs text-primary font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Selected
                </div>
            )}
        </button>
    )
}
