'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getConference } from '@/app/api/conference.api'
import { getConferenceUsersWithRoles } from '@/app/api/conference-user-track.api'
import { resendInvitation } from '@/app/api/conference-user-track.api'
import { sendInvitationEmail, sendBulkEmail, getEmailHistory } from '@/app/api/email.api'
import type { ConferenceResponse } from '@/types/conference'
import type { BulkEmailRequest, EmailHistoryResponse } from '@/types/email'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Loader2, ArrowLeft, Mail, Users, History, Send, RefreshCw,
    Clock, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { safeDate } from '@/lib/utils'

interface UserWithRoles {
    user: { id: number; firstName: string; lastName: string; email: string }
    roles: Array<{
        id: number
        assignedRole: string
        isAccepted: boolean | null
        invitedAt: string | null
        invitationToken: string | null
        tokenExpiresAt: string | null
    }>
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3.5 w-3.5" /> },
    accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    declined: { label: 'Declined', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3.5 w-3.5" /> },
}

function getInvitationStatus(isAccepted: boolean | null): string {
    if (isAccepted === null) return 'pending'
    return isAccepted ? 'accepted' : 'declined'
}

export default function EmailManagementPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [usersWithRoles, setUsersWithRoles] = useState<UserWithRoles[]>([])
    const [emailHistory, setEmailHistory] = useState<EmailHistoryResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [sendingIds, setSendingIds] = useState<Set<number>>(new Set())
    const [bulkSending, setBulkSending] = useState(false)

    // Bulk email form state
    const [bulkSubject, setBulkSubject] = useState('')
    const [bulkBody, setBulkBody] = useState('')
    const [bulkRecipientGroup, setBulkRecipientGroup] = useState('REVIEWER')

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const [conf, users, history] = await Promise.all([
                getConference(conferenceId),
                getConferenceUsersWithRoles(conferenceId, 0, 100).catch(() => ({ content: [] })),
                getEmailHistory(conferenceId, 0, 50).catch(() => ({ content: [] })),
            ])
            setConference(conf)
            setUsersWithRoles((users as any).content || [])
            setEmailHistory((history as any).content || history || [])
        } catch (err) {
            console.error('Failed to load email management data:', err)
        } finally {
            setLoading(false)
        }
    }, [conferenceId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleResendInvitation = async (cutId: number, userEmail: string, userName: string, role: string, token: string | null) => {
        setSendingIds(prev => new Set(prev).add(cutId))
        try {
            // First regenerate the token
            const updated = await resendInvitation(cutId)
            const newToken = updated.invitationToken

            // Then send the email with new token
            const formData = new FormData()
            formData.append('to', userEmail)
            formData.append('recipientName', userName)
            formData.append('subject', `Invitation to ${conference?.name || 'Conference'} as ${role}`)
            formData.append('conferenceName', conference?.name || '')
            formData.append('conferenceId', String(conferenceId))
            formData.append('role', role)
            formData.append('invitationToken', newToken)

            await sendInvitationEmail(formData)
            toast.success(`Invitation resent to ${userEmail}`)
            await fetchData()
        } catch (err) {
            console.error('Resend failed:', err)
            toast.error('Failed to resend invitation')
        } finally {
            setSendingIds(prev => {
                const next = new Set(prev)
                next.delete(cutId)
                return next
            })
        }
    }

    const handleSendBulkEmail = async () => {
        if (!bulkSubject.trim() || !bulkBody.trim()) {
            toast.error('Please fill in both subject and body')
            return
        }
        setBulkSending(true)
        try {
            const req: BulkEmailRequest = {
                conferenceId,
                recipientGroup: bulkRecipientGroup,
                subject: bulkSubject,
                body: bulkBody,
            }
            await sendBulkEmail(req)
            toast.success(`Bulk email sent to all ${bulkRecipientGroup.toLowerCase().replace('_', ' ')}s`)
            setBulkSubject('')
            setBulkBody('')
            await fetchData()
        } catch (err) {
            console.error('Bulk email failed:', err)
            toast.error('Failed to send bulk email')
        } finally {
            setBulkSending(false)
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—'
        const d = safeDate(dateStr)
        if (!d || isNaN(d.getTime())) return '—'
        return d!.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const isTokenExpired = (expiresAt: string | null) => {
        if (!expiresAt) return false
        return new Date(expiresAt) < new Date()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Flatten all roles from all users for the invitation list
    const allInvitations = usersWithRoles.flatMap(uwr =>
        uwr.roles.map(role => ({
            cutId: role.id,
            userName: `${uwr.user.firstName} ${uwr.user.lastName}`,
            userEmail: uwr.user.email,
            role: role.assignedRole,
            isAccepted: role.isAccepted,
            invitedAt: role.invitedAt,
            invitationToken: role.invitationToken,
            tokenExpiresAt: role.tokenExpiresAt,
        }))
    )

    return (
        <div className="page-base space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <Button variant="ghost" className="gap-2 -ml-2" onClick={() => router.push(`/conference/${conferenceId}/update`)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back to Conference
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Mail className="h-6 w-6 text-indigo-600" />
                        Email Management
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {conference?.name || 'Conference'} — Manage invitations, send emails, and view history
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="invitations" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="invitations" className="gap-2">
                        <Users className="h-4 w-4" /> Invitations
                    </TabsTrigger>
                    <TabsTrigger value="bulk" className="gap-2">
                        <Send className="h-4 w-4" /> Bulk Email
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="h-4 w-4" /> History
                    </TabsTrigger>
                </TabsList>

                {/* ── Tab 1: Invitations ── */}
                <TabsContent value="invitations">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span>Invitation Status</span>
                                <div className="flex gap-2">
                                    <Badge variant="secondary">{allInvitations.filter(i => i.isAccepted === null).length} pending</Badge>
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">{allInvitations.filter(i => i.isAccepted === true).length} accepted</Badge>
                                    <Badge variant="secondary" className="bg-red-100 text-red-800">{allInvitations.filter(i => i.isAccepted === false).length} declined</Badge>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {allInvitations.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                    <p>No invitations sent yet.</p>
                                    <p className="text-sm mt-1">Assign roles in the conference update page to create invitations.</p>
                                </div>
                            ) : (
                                <div className="overflow-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-gray-50">
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Invited</th>
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
                                                            <Badge variant="outline">{inv.role.replace('_', ' ')}</Badge>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Badge className={`${config.color} gap-1`}>
                                                                {config.icon} {config.label}
                                                            </Badge>
                                                            {expired && status === 'pending' && (
                                                                <Badge variant="destructive" className="ml-1 text-xs">Expired</Badge>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(inv.invitedAt)}</td>
                                                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(inv.tokenExpiresAt)}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            {(status === 'pending' || expired) && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="gap-1"
                                                                    disabled={sendingIds.has(inv.cutId)}
                                                                    onClick={() => handleResendInvitation(
                                                                        inv.cutId, inv.userEmail, inv.userName, inv.role, inv.invitationToken
                                                                    )}
                                                                >
                                                                    {sendingIds.has(inv.cutId) ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    ) : (
                                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                                    )}
                                                                    {expired ? 'Resend' : 'Resend'}
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
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Tab 2: Bulk Email ── */}
                <TabsContent value="bulk">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Compose Bulk Email</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Recipient Group */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Recipient Group</label>
                                <select
                                    value={bulkRecipientGroup}
                                    onChange={(e) => setBulkRecipientGroup(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                >
                                    <option value="REVIEWER">All Reviewers</option>
                                    <option value="AUTHOR">All Authors</option>
                                    <option value="PROGRAM_CHAIR">All Program Chairs</option>
                                    <option value="CONFERENCE_CHAIR">All Conference Chairs</option>
                                    <option value="TRACK_CHAIR">All Track Chairs</option>
                                </select>
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
                                    rows={8}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                                />
                            </div>

                            {/* Placeholders Help */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                <p className="text-sm font-medium text-indigo-800 mb-1">Available Placeholders</p>
                                <div className="flex flex-wrap gap-2">
                                    {['{Conference.Name}', '{Conference.StartDate}', '{Conference.EndDate}', '{Conference.Location}',
                                      '{Conference.Country}', '{Recipient.Name}', '{Recipient.Email}', '{Sender.Email}'].map(ph => (
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
                                Send to All {bulkRecipientGroup.replace('_', ' ').toLowerCase()}s
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Tab 3: Email History ── */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span>Email History</span>
                                <Button variant="outline" size="sm" onClick={fetchData}>
                                    <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {emailHistory.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                    <p>No emails have been sent for this conference yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-gray-50">
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">To</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Subject</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                                                <th className="px-4 py-3 text-left font-medium text-gray-600">Sent At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {emailHistory.map((email) => (
                                                <tr key={email.id} className="border-b last:border-0 hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium">{email.toEmail}</td>
                                                    <td className="px-4 py-3 max-w-xs truncate">{email.subject}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline">{email.emailType}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {email.status === 'SENT' ? (
                                                            <Badge className="bg-green-100 text-green-800 gap-1">
                                                                <CheckCircle2 className="h-3 w-3" /> Sent
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive" className="gap-1">
                                                                <AlertCircle className="h-3 w-3" /> Error
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(email.sentAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
