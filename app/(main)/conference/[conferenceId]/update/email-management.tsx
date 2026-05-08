"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { getConference } from "@/app/api/conference.api"
import { getConferenceUsersWithRoles } from "@/app/api/conference-user-track.api"
import { resendInvitation } from "@/app/api/conference-user-track.api"
import { sendInvitationEmail, sendBulkEmail, getEmailHistory } from "@/app/api/email.api"
import type { ConferenceResponse } from "@/types/conference"
import type { BulkEmailRequest, EmailHistoryResponse } from "@/types/email"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Loader2, Mail, Users, History, Send, RefreshCw,
    Clock, CheckCircle2, XCircle, AlertCircle
} from "lucide-react"
import { toast } from 'sonner'
import { V } from "@/lib/validation"
import { safeDate } from '@/lib/utils'

const ROLE_OPTIONS = [
    { value: "ALL", label: "All Roles" },
    { value: "AUTHOR", label: "Author" },
    { value: "REVIEWER", label: "Reviewer" },
    { value: "CONFERENCE_CHAIR", label: "Conference Chair" },
    { value: "PROGRAM_CHAIR", label: "PC Chair" },
    { value: "TRACK_CHAIR", label: "Track Chair" },
]

const ROLE_LABELS: Record<string, string> = {
    AUTHOR: "Author",
    REVIEWER: "Reviewer",
    CONFERENCE_CHAIR: "Conference Chair",
    PROGRAM_CHAIR: "PC Chair",
    TRACK_CHAIR: "Track Chair",
    ATTENDEE: "Attendee",
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: "Pending", color: "bg-amber-100 text-amber-800", icon: <Clock className="h-3.5 w-3.5" /> },
    accepted: { label: "Accepted", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    declined: { label: "Declined", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3.5 w-3.5" /> },
}

function getInvitationStatus(isAccepted: boolean | null): string {
    if (isAccepted === null) return "pending"
    return isAccepted ? "accepted" : "declined"
}

interface EmailManagementInlineProps {
    conferenceId: number
}

interface ConferenceRoleItem {
    id: number
    assignedRole: string
    trackName?: string | null
    conferenceTrackName?: string | null
    isAccepted: boolean | null
    invitedAt: string | null
    invitationToken: string | null
    tokenExpiresAt: string | null
}

interface ConferenceUserRoleData {
    user?: {
        id?: number
        firstName?: string
        lastName?: string
        fullName?: string
        email?: string
    }
    roles?: ConferenceRoleItem[]
}

interface InvitationRow {
    cutId: number
    userName: string
    userEmail: string
    role: string
    trackName: string | null
    isAccepted: boolean | null
    invitedAt: string | null
    invitationToken: string | null
    tokenExpiresAt: string | null
}

interface PagedResponse<T> {
    content?: T[]
}

let optimisticEmailHistoryId = -1

function createOptimisticEmailHistory({
    conferenceId,
    conferenceName,
    toEmail,
    subject,
    body,
    emailType,
    ccEmails = null,
}: {
    conferenceId: number
    conferenceName?: string | null
    toEmail: string
    subject: string
    body: string
    emailType: EmailHistoryResponse["emailType"]
    ccEmails?: string | null
}): EmailHistoryResponse {
    const now = new Date().toISOString()
    return {
        id: optimisticEmailHistoryId--,
        fromEmail: "",
        toEmail,
        ccEmails,
        subject,
        body,
        emailType,
        status: "SENDING",
        errorMessage: null,
        conferenceId,
        conferenceName: conferenceName ?? null,
        sentAt: now,
        createdAt: now,
    }
}

export function EmailManagementInline({ conferenceId }: EmailManagementInlineProps) {
    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [usersData, setUsersData] = useState<ConferenceUserRoleData[]>([])
    const [emailHistory, setEmailHistory] = useState<EmailHistoryResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [sendingIds, setSendingIds] = useState<Set<number>>(new Set())
    const [bulkSending, setBulkSending] = useState(false)
    const [activeTab, setActiveTab] = useState("invitations")

    // Bulk email form state
    const [bulkSubject, setBulkSubject] = useState("")
    const [bulkBody, setBulkBody] = useState("")
    const [bulkRecipientGroup, setBulkRecipientGroup] = useState("REVIEWER")
    const [historyRoleFilter, setHistoryRoleFilter] = useState("ALL")
    const [currentHistoryPage, setCurrentHistoryPage] = useState(0)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const [conf, users, history] = await Promise.all([
                getConference(conferenceId),
                getConferenceUsersWithRoles(conferenceId, 0, 100).catch(() => ({ content: [] })),
                getEmailHistory(conferenceId, 0, 50).catch(() => ({ content: [] })),
            ])
            setConference(conf)
            setUsersData(Array.isArray(users) ? users : ((users as PagedResponse<ConferenceUserRoleData>).content ?? []))
            setEmailHistory(Array.isArray(history) ? history : ((history as PagedResponse<EmailHistoryResponse>).content ?? []))
        } catch (err) {
            console.error("Failed to load email management data:", err)
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    const fetchEmailHistory = useCallback(async () => {
        try {
            const history = await getEmailHistory(conferenceId, 0, 50).catch(() => ({ content: [] }))
            setEmailHistory(Array.isArray(history) ? history : ((history as PagedResponse<EmailHistoryResponse>).content ?? []))
        } catch (err) {
            console.error("Failed to load email history:", err)
        }
    }, [conferenceId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    useEffect(() => {
        if (activeTab !== "history") return
        fetchEmailHistory()
        const intervalId = window.setInterval(fetchEmailHistory, 2000)
        return () => window.clearInterval(intervalId)
    }, [activeTab, fetchEmailHistory])

    // Reset page when filter changes
    useEffect(() => {
        setCurrentHistoryPage(0)
    }, [historyRoleFilter])

    const markOptimisticHistory = useCallback((ids: number[], status: EmailHistoryResponse["status"], errorMessage: string | null = null) => {
        const idSet = new Set(ids)
        setEmailHistory(prev => prev.map(email => (
            idSet.has(email.id)
                ? { ...email, status, errorMessage, sentAt: new Date().toISOString() }
                : email
        )))
    }, [])

    const getErrorMessage = (err: unknown) => {
        if (err instanceof Error && err.message) return err.message
        return "Email sending failed."
    }

    const handleResendInvitation = async (cutId: number, userEmail: string, userName: string, role: string, trackName?: string) => {
        setSendingIds(prev => new Set(prev).add(cutId))
        let optimisticIds: number[] = []
        try {
            const updated = await resendInvitation(cutId)
            const newToken = updated.invitationToken

            const roleLabel = role.replace("_", " ")
            const trackLabel = trackName ? ` — ${trackName}` : ""

            const formData = new FormData()
            formData.append("to", userEmail)
            formData.append("recipientName", userName)
            formData.append("subject", `Invitation to ${conference?.name || "Conference"} as ${roleLabel}${trackLabel}`)
            formData.append("conferenceName", conference?.name || "")
            formData.append("conferenceId", String(conferenceId))
            formData.append("role", roleLabel)
            if (trackName) {
                formData.append("trackName", trackName)
            }
            formData.append("invitationToken", newToken)

            const optimisticHistory = createOptimisticEmailHistory({
                conferenceId,
                conferenceName: conference?.name,
                toEmail: userEmail,
                subject: String(formData.get("subject") || ""),
                body: `Invitation email for ${roleLabel}${trackLabel}`,
                emailType: "INVITATION",
            })
            optimisticIds = [optimisticHistory.id]
            setEmailHistory(prev => [optimisticHistory, ...prev])
            await sendInvitationEmail(formData)
            markOptimisticHistory(optimisticIds, "SENT")
            toast.success(`Invitation resent to ${userEmail}`)
            await fetchData()
        } catch (err) {
            console.error("Resend failed:", err)
            if (optimisticIds.length > 0) {
                markOptimisticHistory(optimisticIds, "ERROR", getErrorMessage(err))
            }
            toast.error("Failed to resend invitation")
        } finally {
            setSendingIds(prev => {
                const next = new Set(prev)
                next.delete(cutId)
                return next
            })
        }
    }

    const handleSendBulkEmail = async () => {
        const subjErr = V.maxLen(bulkSubject, 200)
        if (subjErr) {
            toast.error(`Subject: ${subjErr}`)
            return
        }
        const bodyErr = V.maxLen(bulkBody, 5000)
        if (bodyErr) {
            toast.error(`Body: ${bodyErr}`)
            return
        }
        if (!bulkSubject.trim() || !bulkBody.trim()) {
            toast.error("Please fill in both subject and body")
            return
        }
        setBulkSending(true)
        const recipientEmails = new Map<string, string>()
        for (const userWithRoles of usersData) {
            const email = userWithRoles.user?.email
            if (!email) continue
            const hasRecipientRole = (userWithRoles.roles || []).some(role => role.assignedRole === bulkRecipientGroup)
            if (!hasRecipientRole) continue
            recipientEmails.set(email.toLowerCase(), email)
        }
        const optimisticHistory = Array.from(recipientEmails.values()).map(email => createOptimisticEmailHistory({
            conferenceId,
            conferenceName: conference?.name,
            toEmail: email,
            subject: bulkSubject,
            body: bulkBody,
            emailType: "BULK",
        }))
        const optimisticIds = optimisticHistory.map(email => email.id)
        if (optimisticHistory.length > 0) {
            setEmailHistory(prev => [...optimisticHistory, ...prev])
        }
        try {
            const req: BulkEmailRequest = {
                conferenceId,
                recipientGroup: bulkRecipientGroup,
                subject: bulkSubject,
                body: bulkBody,
            }
            await sendBulkEmail(req)
            markOptimisticHistory(optimisticIds, "SENT")
            toast.success(`Bulk email sent to all ${bulkRecipientGroup.toLowerCase().replace("_", " ")}s`)
            setBulkSubject("")
            setBulkBody("")
            await fetchData()
        } catch (err) {
            console.error("Bulk email failed:", err)
            markOptimisticHistory(optimisticIds, "ERROR", getErrorMessage(err))
            toast.error("Failed to send bulk email")
        } finally {
            setBulkSending(false)
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—"
        const d = safeDate(dateStr)
        if (!d || isNaN(d.getTime())) return "—"
        return d.toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
        })
    }

    const isTokenExpired = (expiresAt: string | null) => {
        if (!expiresAt) return false
        return new Date(expiresAt) < new Date()
    }

    const recipientRolesByEmail = useMemo(() => {
        const map = new Map<string, Set<string>>()
        for (const userWithRoles of usersData) {
            const email = userWithRoles.user?.email
            if (!email) continue
            const key = String(email).toLowerCase()
            const roleSet = map.get(key) ?? new Set<string>()
            for (const role of userWithRoles.roles || []) {
                if (role?.assignedRole) roleSet.add(role.assignedRole)
            }
            map.set(key, roleSet)
        }
        return map
    }, [usersData])

    const getRecipientRoleLabels = useCallback((email: string) => {
        const roles = recipientRolesByEmail.get(email.toLowerCase())
        if (!roles || roles.size === 0) return "Unknown"
        return Array.from(roles).map(role => ROLE_LABELS[role] || role.replaceAll("_", " ")).join(", ")
    }, [recipientRolesByEmail])

    const filteredEmailHistory = useMemo(() => {
        if (historyRoleFilter === "ALL") return emailHistory
        return emailHistory.filter(email => {
            const roles = recipientRolesByEmail.get(email.toEmail.toLowerCase())
            return roles?.has(historyRoleFilter)
        })
    }, [emailHistory, historyRoleFilter, recipientRolesByEmail])

    const sentCount = filteredEmailHistory.filter(email => email.status === "SENT").length
    const failedCount = filteredEmailHistory.filter(email => email.status === "ERROR").length
    const sendingCount = filteredEmailHistory.filter(email => email.status === "SENDING").length

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Flatten for invitation list
    const allInvitations: InvitationRow[] = usersData.flatMap((uwr) =>
        (uwr.roles || []).map((role) => ({
            cutId: role.id,
            userName: `${uwr.user?.firstName || ""} ${uwr.user?.lastName || ""}`.trim() || uwr.user?.fullName || "Unknown",
            userEmail: uwr.user?.email || "",
            role: role.assignedRole,
            trackName: role.trackName || role.conferenceTrackName || null,
            isAccepted: role.isAccepted,
            invitedAt: role.invitedAt,
            invitationToken: role.invitationToken,
            tokenExpiresAt: role.tokenExpiresAt,
        }))
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Mail className="h-5 w-5 text-indigo-600" />
                    Invitation Management
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage invitations, monitor sent email status, and filter recipients by role.
                </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="invitations" className="gap-2 text-xs sm:text-sm">
                        <Users className="h-4 w-4" /> Invitations
                    </TabsTrigger>
                    <TabsTrigger value="bulk" className="gap-2 text-xs sm:text-sm">
                        <Send className="h-4 w-4" /> Bulk Email
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2 text-xs sm:text-sm">
                        <History className="h-4 w-4" /> History
                    </TabsTrigger>
                </TabsList>

                {/* ── Tab 1: Invitations ── */}
                <TabsContent value="invitations">
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <h3 className="text-base font-semibold">Invitation Status</h3>
                            <div className="flex gap-2">
                                <Badge variant="secondary">{allInvitations.filter((i) => i.isAccepted === null).length} pending</Badge>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">{allInvitations.filter((i) => i.isAccepted === true).length} accepted</Badge>
                                <Badge variant="secondary" className="bg-red-100 text-red-800">{allInvitations.filter((i) => i.isAccepted === false).length} declined</Badge>
                            </div>
                        </div>

                        {allInvitations.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                <p>No invitations sent yet.</p>
                                <p className="text-sm mt-1">Assign roles in Config Members to create invitations.</p>
                            </div>
                        ) : (
                            <div className="overflow-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-gray-50">
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">Track</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-600">Expires</th>
                                            <th className="px-4 py-3 text-right font-medium text-gray-600">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allInvitations.map((inv) => {
                                            const status = getInvitationStatus(inv.isAccepted)
                                            const config = STATUS_CONFIG[status]
                                            const expired = isTokenExpired(inv.tokenExpiresAt)
                                            return (
                                                <tr key={inv.cutId} className="border-b last:border-0 hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium">{inv.userName}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{inv.userEmail}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline">{inv.role.replace("_", " ")}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                                        {inv.trackName || "—"}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge className={`${config.color} gap-1`}>
                                                            {config.icon} {config.label}
                                                        </Badge>
                                                        {expired && status === "pending" && (
                                                            <Badge variant="destructive" className="ml-1 text-xs">Expired</Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(inv.tokenExpiresAt)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        {(status === "pending" || expired) && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="gap-1"
                                                                disabled={sendingIds.has(inv.cutId)}
                                                                onClick={() => handleResendInvitation(
                                                                    inv.cutId, inv.userEmail, inv.userName, inv.role, inv.trackName ?? undefined
                                                                )}
                                                            >
                                                                {sendingIds.has(inv.cutId) ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                                )}
                                                                Resend
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ── Tab 2: Bulk Email ── */}
                <TabsContent value="bulk">
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <h3 className="text-base font-semibold">Compose Bulk Email</h3>

                        {/* Recipient Group */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Recipient Group</label>
                            <Select value={bulkRecipientGroup} onValueChange={setBulkRecipientGroup}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="REVIEWER">All Reviewers</SelectItem>
                                    <SelectItem value="AUTHOR">All Authors</SelectItem>
                                    <SelectItem value="PROGRAM_CHAIR">All Program Chairs</SelectItem>
                                    <SelectItem value="CONFERENCE_CHAIR">All Conference Chairs</SelectItem>
                                    <SelectItem value="TRACK_CHAIR">All Track Chairs</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Subject */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Subject</label>
                            <input
                                type="text"
                                value={bulkSubject}
                                onChange={(e) => setBulkSubject(e.target.value)}
                                placeholder="Enter email subject..."
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>

                        {/* Body */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                Body
                                <span className="text-muted-foreground font-normal ml-2">(supports placeholders)</span>
                            </label>
                            <textarea
                                value={bulkBody}
                                onChange={(e) => setBulkBody(e.target.value)}
                                placeholder={`Dear {Recipient.Name},\n\nThank you for participating in {Conference.Name}...\n\nBest regards`}
                                rows={6}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                            />
                        </div>

                        {/* Placeholders Help */}
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-indigo-800 mb-1">Available Placeholders</p>
                            <div className="flex flex-wrap gap-2">
                                {["{Conference.Name}", "{Conference.StartDate}", "{Conference.EndDate}", "{Conference.Location}",
                                  "{Recipient.Name}", "{Recipient.Email}", "{Sender.Email}"].map(ph => (
                                    <code key={ph} className="text-xs bg-white border border-indigo-200 rounded px-1.5 py-0.5 text-indigo-700 cursor-pointer hover:bg-indigo-100"
                                          onClick={() => setBulkBody(prev => prev + ph)}>
                                        {ph}
                                    </code>
                                ))}
                            </div>
                        </div>

                        <Button
                            className="w-full gap-2"
                            disabled={bulkSending || !bulkSubject.trim() || !bulkBody.trim()}
                            onClick={handleSendBulkEmail}
                        >
                            {bulkSending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            Send to All {bulkRecipientGroup.replace("_", " ").toLowerCase()}s
                        </Button>
                    </div>
                </TabsContent>

                {/* ── Tab 3: Email History ── */}
                <TabsContent value="history">
                    <div className="rounded-xl border bg-card p-6 space-y-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                                <h3 className="text-base font-semibold">Sent Email Status</h3>
                                <p className="text-xs text-muted-foreground mt-1">Track all sent emails and delivery errors for this conference.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={fetchEmailHistory}>
                                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                            </Button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-4">
                            <div className="rounded-lg border bg-blue-50 p-4">
                                <p className="text-xs font-medium text-blue-700">Sending</p>
                                <p className="text-2xl font-bold text-blue-800">{sendingCount}</p>
                            </div>
                            <div className="rounded-lg border bg-green-50 p-4">
                                <p className="text-xs font-medium text-green-700">Sent</p>
                                <p className="text-2xl font-bold text-green-800">{sentCount}</p>
                            </div>
                            <div className="rounded-lg border bg-red-50 p-4">
                                <p className="text-xs font-medium text-red-700">Failed</p>
                                <p className="text-2xl font-bold text-red-800">{failedCount}</p>
                            </div>
                            <div className="rounded-lg border bg-slate-50 p-4">
                                <p className="text-xs font-medium text-slate-600">Total shown</p>
                                <p className="text-2xl font-bold text-slate-800">{filteredEmailHistory.length}</p>
                            </div>
                        </div>

                        <div className="rounded-lg border bg-muted/20 p-4">
                            <div className="grid gap-3 sm:grid-cols-[220px_1fr] sm:items-end">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Filter by Role</label>
                                    <Select value={historyRoleFilter} onValueChange={setHistoryRoleFilter}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLE_OPTIONS.map(role => (
                                                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Filter section narrows email history by recipient role such as Author, Reviewer, Conference Chair, or PC Chair.
                                </p>
                            </div>
                        </div>

                        {filteredEmailHistory.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                <p>No emails match the current filter.</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-gray-50">
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">To</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Subject</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Sent At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredEmailHistory.slice(currentHistoryPage * 10, (currentHistoryPage + 1) * 10).map((email) => (
                                                <tr key={email.id} className="border-b last:border-0 hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium">{email.toEmail}</td>
                                                    <td className="px-4 py-3 text-muted-foreground min-w-[9rem]">{getRecipientRoleLabels(email.toEmail)}</td>
                                                    <td className="px-4 py-3 max-w-xs truncate">{email.subject}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline">{email.emailType}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {email.status === "SENDING" ? (
                                                            <Badge className="bg-blue-100 text-blue-800 gap-1">
                                                                <Loader2 className="h-3 w-3 animate-spin" /> Sending
                                                            </Badge>
                                                        ) : email.status === "SENT" ? (
                                                            <Badge className="bg-green-100 text-green-800 gap-1">
                                                                <CheckCircle2 className="h-3 w-3" /> Sent
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive" className="gap-1">
                                                                <AlertCircle className="h-3 w-3" /> Failed
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(email.sentAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Pagination */}
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        Showing {currentHistoryPage * 10 + 1} to {Math.min((currentHistoryPage + 1) * 10, filteredEmailHistory.length)} of {filteredEmailHistory.length} emails
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentHistoryPage(Math.max(0, currentHistoryPage - 1))}
                                            disabled={currentHistoryPage === 0}
                                        >
                                            Previous
                                        </Button>
                                        <div className="flex items-center px-3 py-2 text-sm bg-muted rounded-md">
                                            Page {currentHistoryPage + 1} of {Math.ceil(filteredEmailHistory.length / 10)}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentHistoryPage(currentHistoryPage + 1)}
                                            disabled={(currentHistoryPage + 1) * 10 >= filteredEmailHistory.length}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
