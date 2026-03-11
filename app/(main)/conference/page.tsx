'use client'

import { useEffect, useState } from 'react'
import { getConferences, approveConference } from '@/app/api/conference.api'
import { useUserRole } from '@/hooks/useUserRole'
import type { ConferenceListResponse } from '@/types/conference'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function ConferencesPage() {
    const [conferences, setConferences] = useState<ConferenceListResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [approvingId, setApprovingId] = useState<number | null>(null)
    const { roles } = useUserRole()

    const isStaff = roles.some(r => r === 'ROLE_STAFF' || r === 'ROLE_ADMIN')

    useEffect(() => {
        fetchConferences()
    }, [])

    const fetchConferences = async () => {
        try {
            setLoading(true)
            const data = await getConferences()
            setConferences(data)
        } catch (err: any) {
            setError('Failed to load conferences. Please try again later.')
            console.error('Error fetching conferences:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id: number) => {
        try {
            setApprovingId(id)
            await approveConference(id)
            toast.success('Conference approved successfully!')
            // Refresh the list
            await fetchConferences()
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to approve conference')
            console.error('Error approving conference:', err)
        } finally {
            setApprovingId(null)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'ACTIVE':
            case 'APPROVED':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            case 'UPCOMING':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            case 'PENDING':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
            case 'REJECTED':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            case 'COMPLETED':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-destructive text-lg">{error}</p>
                <Button onClick={() => window.location.reload()}>
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Conferences</h1>
                    <p className="text-muted-foreground mt-2">
                        {isStaff
                            ? 'Manage and approve conferences'
                            : 'Browse and manage all conferences'}
                    </p>
                </div>
                {isStaff && (
                    <Badge variant="outline" className="text-sm gap-1.5 py-1.5 px-3 border-indigo-300 text-indigo-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Staff Mode
                    </Badge>
                )}
            </div>

            {conferences.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No conferences found</p>
                    <Link href="/conference/create">
                        <Button className="mt-4">Create Your First Conference</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {conferences.map((conference) => (
                        <Card key={conference.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <CardTitle className="text-xl mb-2">
                                            {conference.name}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-sm font-mono text-muted-foreground">
                                                {conference.acronym}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(conference.status)}`}>
                                                {conference.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <CardDescription className="line-clamp-2">
                                    {conference.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">{conference.location}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">
                                            {formatDate(conference.startDate)} - {formatDate(conference.endDate)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <Link href={`/conference/${conference.id}`}>
                                            <Button className="w-full" variant="outline">
                                                View Details
                                            </Button>
                                        </Link>
                                        <Link href={`/track?conferenceId=${conference.id}`}>
                                            <Button className="w-full" variant="outline">
                                                View Tracks
                                            </Button>
                                        </Link>
                                    </div>

                                    {/* STAFF: Approve button for PENDING conferences */}
                                    {isStaff && conference.status.toUpperCase() === 'PENDING' && (
                                        <Button
                                            className="w-full mt-2 gap-2 bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleApprove(conference.id)}
                                            disabled={approvingId === conference.id}
                                        >
                                            {approvingId === conference.id ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Approving...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-4 w-4" />
                                                    Approve Conference
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
