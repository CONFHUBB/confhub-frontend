'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getConference } from '@/app/api/conference.api'
import { getSessionBookmarks } from '@/app/api/session-bookmark.api'
import { getMyTicket, type TicketResponse } from '@/app/api/registration.api'
import { getProgram } from '@/app/api/program.api'
import type { ConferenceResponse } from '@/types/conference'
import type { AdvancedProgram, ProgramSession } from '@/types/program'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Calendar, MapPin, Ticket, Bookmark, BookmarkCheck,
    User, Loader2, QrCode, CreditCard, Clock, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

function formatTime12(t: string): string {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'pm' : 'am'
    const h12 = h % 12 || 12
    return `${h12}:${m.toString().padStart(2, '0')}${ampm}`
}

export default function AttendeeWorkspacePage() {
    const params = useParams()
    const conferenceId = Number(params.conferenceId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [ticket, setTicket] = useState<TicketResponse | null>(null)
    const [bookmarks, setBookmarks] = useState<string[]>([])
    const [program, setProgram] = useState<AdvancedProgram | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('program')

    useEffect(() => {
        const load = async () => {
            try {
                const confData = await getConference(conferenceId)
                setConference(confData)

                // Get user ID from JWT
                const token = localStorage.getItem('accessToken')
                let userId: number | null = null
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]))
                        userId = payload.id
                    } catch {}
                }

                // Load ticket
                if (userId) {
                    try {
                        const t = await getMyTicket(conferenceId, userId)
                        setTicket(t)
                    } catch {}
                }

                // Load bookmarks
                try {
                    const bm = await getSessionBookmarks(conferenceId)
                    setBookmarks(bm)
                } catch {}

                // Load program
                try {
                    const prog = await getProgram(conferenceId)
                    const parsed = (typeof prog === 'string' && prog.trim() !== '') ? JSON.parse(prog.trim()) : prog
                    if (parsed?.settings && parsed?.schedule) {
                        setProgram(parsed)
                    }
                } catch {}
            } catch {}
            setLoading(false)
        }
        load()
    }, [conferenceId])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Bookmarked sessions from program
    const bookmarkedSessions: ProgramSession[] = []
    if (program?.schedule?.days) {
        for (const day of program.schedule.days) {
            for (const s of (day as any).sessions || []) {
                if (bookmarks.includes(s.id)) {
                    bookmarkedSessions.push({ ...s, _date: day.date } as any)
                }
            }
        }
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            {/* Header */}
            <div className="mb-8">
                <Link href={`/conference/${conferenceId}`} className="text-sm text-muted-foreground hover:text-primary mb-2 inline-flex items-center gap-1">
                    ← Back to Conference
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 mt-2">
                    {conference?.name || 'Conference'}
                </h1>
                <p className="text-gray-500 mt-1">Your attendee workspace — manage your schedule, bookmarks, and ticket.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 h-auto p-1 bg-gray-100 rounded-xl">
                    <TabsTrigger value="program" className="rounded-lg px-4 py-2 text-sm font-semibold gap-2">
                        <Calendar className="h-4 w-4" /> Program
                    </TabsTrigger>
                    <TabsTrigger value="bookmarks" className="rounded-lg px-4 py-2 text-sm font-semibold gap-2">
                        <Bookmark className="h-4 w-4" /> My Schedule
                        {bookmarks.length > 0 && (
                            <Badge className="ml-1 bg-amber-100 text-amber-700 border-amber-200 text-xs">{bookmarks.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="ticket" className="rounded-lg px-4 py-2 text-sm font-semibold gap-2">
                        <Ticket className="h-4 w-4" /> My Ticket
                    </TabsTrigger>
                </TabsList>

                {/* Program Tab */}
                <TabsContent value="program" className="focus-visible:outline-none">
                    <Card>
                        <CardContent className="p-6">
                            {program?.published ? (
                                <div className="text-center space-y-4">
                                    <Calendar className="h-12 w-12 mx-auto text-indigo-400" />
                                    <div>
                                        <h3 className="text-lg font-bold">Conference Program Available</h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Browse the full schedule, bookmark sessions, and build your personal agenda.
                                        </p>
                                    </div>
                                    <Link href={`/conference/${conferenceId}/program`}>
                                        <Button className="gap-2">
                                            <ExternalLink className="h-4 w-4" /> View Full Program
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">Program not yet published</p>
                                    <p className="text-sm mt-1">Check back later for the full conference schedule.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Bookmarks Tab */}
                <TabsContent value="bookmarks" className="focus-visible:outline-none">
                    {bookmarkedSessions.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center text-gray-400">
                                <Bookmark className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">No bookmarked sessions</p>
                                <p className="text-sm mt-1">Go to the program page to bookmark sessions you want to attend.</p>
                                <Link href={`/conference/${conferenceId}/program`}>
                                    <Button variant="outline" className="mt-4 gap-2">
                                        <ExternalLink className="h-4 w-4" /> Browse Program
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {bookmarkedSessions.map((session: any) => {
                                const type = program?.settings?.presentationTypes?.find(t => t.id === session.typeId)
                                const loc = program?.settings?.locations?.find(l => l.id === session.locationId)
                                return (
                                    <Card key={session.id} className="overflow-hidden"
                                        style={{ borderLeft: `4px solid ${type?.color || '#6366f1'}` }}>
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="text-xs text-gray-500 font-medium">
                                                            {session._date && new Date(session._date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            {' · '}
                                                            {formatTime12(session.startTime)} – {formatTime12(session.endTime)}
                                                        </span>
                                                        {type && (
                                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white"
                                                                style={{ backgroundColor: type.color }}>
                                                                {type.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="font-bold text-gray-900">{session.title}</h4>
                                                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                                        {loc && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{loc.name}</span>}
                                                        {session.chairNames && <span className="flex items-center gap-1"><User className="w-3 h-3" />{session.chairNames}</span>}
                                                    </div>
                                                </div>
                                                <BookmarkCheck className="h-5 w-5 text-amber-500 shrink-0" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* Ticket Tab */}
                <TabsContent value="ticket" className="focus-visible:outline-none">
                    {ticket ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Ticket className="h-5 w-5 text-indigo-500" />
                                    Your Ticket
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Registration #</span>
                                                <span className="font-mono font-bold text-sm">{ticket.registrationNumber}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Ticket Type</span>
                                                <span className="font-semibold text-sm">{ticket.ticketTypeName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Amount</span>
                                                <span className="font-semibold text-sm">
                                                    {ticket.price === 0 ? 'Free' : `${ticket.price.toLocaleString()} ${ticket.currency}`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Payment Status</span>
                                                <Badge className={
                                                    ticket.paymentStatus === 'COMPLETED'
                                                        ? 'bg-green-100 text-green-700 border-green-200'
                                                        : ticket.paymentStatus === 'PENDING'
                                                            ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                            : 'bg-red-100 text-red-700 border-red-200'
                                                }>{ticket.paymentStatus}</Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Check-in</span>
                                                {ticket.isCheckedIn ? (
                                                    <Badge className="bg-green-100 text-green-700 border-green-200">Checked In ✓</Badge>
                                                ) : (
                                                    <Badge className="bg-gray-100 text-gray-500">Not Yet</Badge>
                                                )}
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Registered</span>
                                                <span className="text-sm text-gray-600">
                                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* QR Code */}
                                    <div className="flex flex-col items-center justify-center bg-white rounded-xl border-2 border-dashed border-gray-200 p-6">
                                        {ticket.qrCode ? (
                                            <>
                                                <img src={ticket.qrCode} alt="QR Code" className="w-48 h-48 rounded-lg" />
                                                <p className="text-sm text-gray-400 mt-3">Show this QR code at check-in</p>
                                            </>
                                        ) : (
                                            <>
                                                <QrCode className="h-16 w-16 text-gray-300 mb-3" />
                                                <p className="text-sm text-gray-400">QR code will be available after payment</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <Ticket className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <h3 className="font-bold text-lg mb-1">No Ticket Found</h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    You haven't registered for this conference yet.
                                </p>
                                <Link href={`/conference/${conferenceId}/register`}>
                                    <Button className="gap-2">
                                        <CreditCard className="h-4 w-4" /> Register Now
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
