'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getConference } from '@/app/api/conference.api'
import { getPaperById, deletePaperFile } from '@/app/api/paper.api'
import { uploadCameraReady, uploadCopyrightSubmission, getFilesByPaper, type CameraReadyFile } from '@/app/api/camera-ready.api'
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
import { toast } from 'sonner'
import { BackButton } from '@/components/shared/back-button'
import {
    Loader2, ArrowLeft, Upload, FileCheck, ExternalLink, Ticket, CreditCard,
    CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Layers, Eye, Trash2, FileText, Check, Scale
} from 'lucide-react'
import { getCurrentUserEmail } from '@/lib/auth'

// ── Types ──
type Step = 'loading' | 'register' | 'pending-payment' | 'upload'

function Stepper({ currentStep }: { currentStep: number }) {
    const steps = [
        { label: 'Register & Payment', icon: Ticket },
        { label: 'Upload Submissions', icon: Upload },
    ]

    return (
        <div className="flex items-center justify-between mb-8 mt-6">
            {steps.map((step, index) => {
                const stepNumber = index + 1
                const isActive = stepNumber === currentStep
                const isCompleted = stepNumber < currentStep
                const Icon = step.icon

                return (
                    <div key={step.label} className="flex items-center flex-1 last:flex-initial">
                        <div className="flex flex-col items-center gap-2">
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                                    ${isCompleted
                                        ? 'bg-primary border-primary text-primary-foreground'
                                        : isActive
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                                    }`}
                            >
                                {isCompleted ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    <Icon className="h-5 w-5" />
                                )}
                            </div>
                            <span className={`text-xs font-medium whitespace-nowrap ${isActive ? 'text-primary' : isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
                                {step.label}
                            </span>
                        </div>

                        {index < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-3 mt-[-1.5rem] transition-colors duration-300 ${isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default function DedicatedCameraReadyPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)
    const paperId = Number(params.paperId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [paper, setPaper] = useState<PaperResponse | null>(null)
    const [cameraReadyFiles, setCameraReadyFiles] = useState<CameraReadyFile[]>([])
    const [copyrightFiles, setCopyrightFiles] = useState<CameraReadyFile[]>([])
    const [loading, setLoading] = useState(true)
    const [uploadingCR, setUploadingCR] = useState(false)
    const [uploadingCopyright, setUploadingCopyright] = useState(false)

    // Registration state
    const [userId, setUserId] = useState<number | null>(null)
    const [myTicket, setMyTicket] = useState<TicketResponse | null>(null)
    const [ticketTypes, setTicketTypes] = useState<TicketTypeResponse[]>([])
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
    const [registering, setRegistering] = useState(false)
    const [retrying, setRetrying] = useState(false)
    const [currentStep, setCurrentStep] = useState<Step>('loading')

    useEffect(() => {
        if (!conferenceId || !paperId) return
        fetchData()
    }, [conferenceId, paperId])

    const fetchData = async () => {
        try {
            setLoading(true)
            const email = getCurrentUserEmail()
            if (!email) { router.push('/auth/login'); return }

            const user = await getUserByEmail(email)
            if (!user?.id) { router.push('/auth/login'); return }
            setUserId(user.id)

            const [conf, targetPaper, tickets] = await Promise.all([
                getConference(conferenceId),
                getPaperById(paperId),
                getTicketTypes(conferenceId, true).catch(() => []),
            ])
            
            setConference(conf)
            setPaper(targetPaper)
            setTicketTypes(tickets)

            if (targetPaper.conferenceId !== conferenceId && targetPaper.track?.conference?.id !== conferenceId) {
                toast.error('Paper does not belong to this conference')
                router.back()
                return
            }

            // Load all files and separate them
            const files = await getFilesByPaper(paperId).catch(() => [])
            setCameraReadyFiles(files.filter(f => f.isCameraReady))
            setCopyrightFiles(files.filter(f => f.isCopyrightSubmission))

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
            toast.error('Failed to load paper details')
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async () => {
        if (!selectedTicketId || !userId || !paperId) return
        try {
            setRegistering(true)
            const result = await registerForConference(conferenceId, userId, {
                ticketTypeId: selectedTicketId,
                paperId: paperId,
            })
            setMyTicket(result.ticket)

            if (result.paymentUrl) {
                toast.success('Redirecting to payment gateway...')
                window.location.href = result.paymentUrl
            } else if (result.ticket.paymentStatus === 'COMPLETED') {
                toast.success('Registration complete! You can now upload files.')
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

    const handleUploadCameraReady = async () => {
        if (!userId || !paperId) return
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.pdf,.doc,.docx'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
            try {
                setUploadingCR(true)
                const uploaded = await uploadCameraReady(conferenceId, paperId, userId, file)
                setCameraReadyFiles(prev => [...prev, uploaded])
                toast.success('Camera-ready file uploaded successfully!')
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Upload failed. Please try again.')
            } finally {
                setUploadingCR(false)
            }
        }
        input.click()
    }

    const handleUploadCopyright = async () => {
        if (!userId || !paperId) return
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
            try {
                setUploadingCopyright(true)
                const uploaded = await uploadCopyrightSubmission(conferenceId, paperId, userId, file)
                setCopyrightFiles(prev => [...prev, uploaded])
                toast.success('Copyright submission uploaded successfully!')
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Upload failed. Please try again.')
            } finally {
                setUploadingCopyright(false)
            }
        }
        input.click()
    }

    const handleDeleteFile = async (fileId: number, type: 'cr' | 'copyright') => {
        if (!confirm('Are you sure you want to delete this file?')) return;
        try {
            await deletePaperFile(fileId);
            if (type === 'cr') {
                setCameraReadyFiles((prev) => prev.filter((f) => f.id !== fileId));
            } else {
                setCopyrightFiles((prev) => prev.filter((f) => f.id !== fileId));
            }
            toast.success('File deleted successfully.');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete file.');
        }
    }

    // ── Derived data ──
    const authorTickets = useMemo(() => ticketTypes.filter(t => t.category === 'AUTHOR'), [ticketTypes])
    const otherTickets = useMemo(() => ticketTypes.filter(t => t.category !== 'AUTHOR'), [ticketTypes])
    const selectedTicket = useMemo(() => ticketTypes.find(t => t.id === selectedTicketId), [ticketTypes, selectedTicketId])

    if (loading || currentStep === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!paper) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <p className="text-muted-foreground">Paper not found.</p>
                <Button variant="outline" onClick={() => router.back()}>
                    Back to Workspace
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* ── Header ── */}
            <div className="space-y-3">
                <Button variant="ghost" className="gap-2 -ml-2 text-indigo-700 hover:text-indigo-900" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Submission Wizard</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {conference?.name} — Complete registration, then upload Camera-Ready & Copyright documents
                    </p>
                </div>
            </div>

            {/* Target Paper Banner */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase text-emerald-600 mb-1 tracking-wider">Target Paper</h3>
                <p className="text-lg font-semibold text-emerald-950 line-clamp-2">{paper.title}</p>
                <p className="text-sm text-emerald-700 mt-1 flex items-center gap-1.5"><Layers className="w-4 h-4"/> Track: {paper.track?.name}</p>
            </div>

            <Stepper currentStep={(currentStep === 'register' || currentStep === 'pending-payment') ? 1 : 2} />

            {/* ── STEP 1: REGISTRATION ── */}
            {currentStep === 'register' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <Card className="border-indigo-100 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-100 rounded-lg"><Ticket className="h-5 w-5 text-indigo-600" /></div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Select Registration Ticket</h3>
                                    <p className="text-sm text-muted-foreground">You must have an active Registration to submit camera-ready and copyright files.</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {authorTickets.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600"/> Author Admission</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {authorTickets.map(ticket => (
                                                <div
                                                    key={ticket.id}
                                                    onClick={() => setSelectedTicketId(ticket.id)}
                                                    className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                                        selectedTicketId === ticket.id
                                                            ? 'border-indigo-600 bg-indigo-50/50 shadow-md transform scale-[1.02]'
                                                            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {selectedTicketId === ticket.id && (
                                                        <div className="absolute -top-3 -right-3 bg-indigo-600 text-white rounded-full p-1 shadow-md">
                                                            <CheckCircle2 className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-semibold text-slate-900">{ticket.name}</h4>
                                                        <span className="font-bold text-lg text-indigo-700">${ticket.price}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-500 mb-4 h-10 line-clamp-2">{ticket.description}</p>
                                                    <Badge variant="outline" className="bg-white">{ticket.category}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {otherTickets.length > 0 && (
                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        <h4 className="text-sm font-semibold text-slate-900">Other Available Tickets</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70 hover:opacity-100 transition-opacity">
                                            {otherTickets.map(ticket => (
                                                <div
                                                    key={ticket.id}
                                                    onClick={() => setSelectedTicketId(ticket.id)}
                                                    className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                                        selectedTicketId === ticket.id
                                                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                                                            : 'border-slate-200 hover:border-indigo-300'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-medium text-slate-900">{ticket.name}</h4>
                                                        <span className="font-bold text-indigo-700">${ticket.price}</span>
                                                    </div>
                                                    <Badge variant="secondary" className="text-xs">{ticket.category}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end pt-4">
                        <Button 
                            size="lg" 
                            className="w-full sm:w-auto px-8 gap-2 shadow-md bg-indigo-600 hover:bg-indigo-700" 
                            disabled={!selectedTicketId || registering} 
                            onClick={handleRegister}
                        >
                            {registering ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                            Proceed to Payment
                        </Button>
                    </div>
                </div>
            )}

            {/* ── STEP 1.5: PENDING PAYMENT ── */}
            {currentStep === 'pending-payment' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="p-8 text-center flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                                <AlertTriangle className="h-8 w-8 text-amber-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-amber-900">Payment Pending</h3>
                            <p className="text-amber-800 max-w-md">
                                We found an incomplete payment for your ticket. You must complete the payment before you can upload files.
                            </p>
                            
                            <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                <Button size="lg" className="gap-2 bg-amber-600 hover:bg-amber-700" onClick={handleRetryPayment} disabled={retrying}>
                                    {retrying ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                                    Retry Payment Now
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── STEP 2: UPLOAD CAMERA-READY + COPYRIGHT ── */}
            {currentStep === 'upload' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    {/* Registration Verified Banner */}
                    <Card className="border-emerald-200 bg-emerald-50/30 overflow-hidden shadow-sm">
                        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between text-white">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5" /> Registration Verified
                            </h3>
                            <Badge className="bg-white/20 hover:bg-white/30 text-white font-mono shadow-none">
                                TICKET #{myTicket?.id}
                            </Badge>
                        </div>
                    </Card>

                    {/* Two Upload Cards Side by Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* ── Camera-Ready Card ── */}
                        <div className="space-y-4">
                            <Card className="border-emerald-200 overflow-hidden shadow-sm">
                                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3 flex items-center gap-2 text-white">
                                    <Upload className="h-4 w-4" />
                                    <h3 className="font-semibold text-sm">Camera-Ready Manuscript</h3>
                                </div>
                                <CardContent className="p-5">
                                    <div
                                        className="flex flex-col border-2 border-dashed border-emerald-300 bg-emerald-50/30 rounded-xl py-10 px-4 hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer text-center"
                                        onClick={handleUploadCameraReady}
                                    >
                                        {uploadingCR ? (
                                            <>
                                                <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto mb-3" />
                                                <p className="font-medium text-emerald-900 text-sm">Uploading manuscript...</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Upload className="h-7 w-7 text-emerald-600" />
                                                </div>
                                                <h4 className="text-base font-bold text-gray-900 mb-1">Upload Camera-Ready PDF</h4>
                                                <p className="text-muted-foreground text-xs max-w-xs mx-auto">
                                                    Final prepared manuscript aligned with conference templates.
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {/* Camera-Ready File List */}
                                    {cameraReadyFiles.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                                                <FileCheck className="h-3.5 w-3.5" /> Uploaded ({cameraReadyFiles.length})
                                            </h4>
                                            {cameraReadyFiles.map((file, idx) => (
                                                <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-emerald-300 transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-1.5 bg-emerald-50 rounded-md shrink-0">
                                                            <FileText className="h-4 w-4 text-emerald-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-slate-900 text-sm truncate" title={decodeURIComponent(file.url.split('/').pop() || '')}>
                                                                {decodeURIComponent(file.url.split('/').pop() || 'camera-ready.pdf')}
                                                            </p>
                                                            <Badge variant="outline" className="font-normal border-emerald-200 bg-emerald-50/50 text-emerald-700 text-[10px] mt-0.5">Ver. {idx + 1}</Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteFile(file.id, 'cr')}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                                                            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs border-slate-200">
                                                                <ExternalLink className="h-3 w-3 text-emerald-600" /> View
                                                            </Button>
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* ── Copyright Submission Card ── */}
                        <div className="space-y-4">
                            <Card className="border-indigo-200 overflow-hidden shadow-sm">
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-3 flex items-center gap-2 text-white">
                                    <Scale className="h-4 w-4" />
                                    <h3 className="font-semibold text-sm">Copyright Submission</h3>
                                </div>
                                <CardContent className="p-5">
                                    <div
                                        className="flex flex-col border-2 border-dashed border-indigo-300 bg-indigo-50/30 rounded-xl py-10 px-4 hover:border-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer text-center"
                                        onClick={handleUploadCopyright}
                                    >
                                        {uploadingCopyright ? (
                                            <>
                                                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto mb-3" />
                                                <p className="font-medium text-indigo-900 text-sm">Uploading copyright form...</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Scale className="h-7 w-7 text-indigo-600" />
                                                </div>
                                                <h4 className="text-base font-bold text-gray-900 mb-1">Upload Copyright Form</h4>
                                                <p className="text-muted-foreground text-xs max-w-xs mx-auto">
                                                    Signed copyright transfer agreement or license form.
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {/* Copyright File List */}
                                    {copyrightFiles.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                                                <FileCheck className="h-3.5 w-3.5" /> Uploaded ({copyrightFiles.length})
                                            </h4>
                                            {copyrightFiles.map((file, idx) => (
                                                <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-1.5 bg-indigo-50 rounded-md shrink-0">
                                                            <Scale className="h-4 w-4 text-indigo-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-slate-900 text-sm truncate" title={decodeURIComponent(file.url.split('/').pop() || '')}>
                                                                {decodeURIComponent(file.url.split('/').pop() || 'copyright.pdf')}
                                                            </p>
                                                            <Badge variant="outline" className="font-normal border-indigo-200 bg-indigo-50/50 text-indigo-700 text-[10px] mt-0.5">Ver. {idx + 1}</Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteFile(file.id, 'copyright')}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                                                            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs border-slate-200">
                                                                <ExternalLink className="h-3 w-3 text-indigo-600" /> View
                                                            </Button>
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Submit & Complete Button */}
                    <div className="flex justify-end pt-4">
                        <Button 
                            size="lg" 
                            className="w-full sm:w-auto px-8 gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700" 
                            disabled={cameraReadyFiles.length === 0}
                            onClick={() => {
                                toast.success('Camera-Ready submission completed!');
                                router.push(`/conference/${conferenceId}/paper/${paperId}?tab=camera-ready`);
                            }}
                        >
                            <CheckCircle2 className="h-5 w-5" />
                            Submit & Complete
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
