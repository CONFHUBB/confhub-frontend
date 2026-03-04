'use client'

import { useEffect, useState } from 'react'
import { getConferences } from '@/app/api/conference.api'
import type { ConferenceListResponse } from '@/types/conference'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, ExternalLink, Loader2, Eye } from 'lucide-react'
import Link from 'next/link'

export default function ConferencesPage() {
    const [conferences, setConferences] = useState<ConferenceListResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchConferences = async () => {
            try {
                setLoading(true)
                const data = await getConferences()
                setConferences(data)
            } catch (err) {
                setError('Failed to load conferences. Please try again later.')
                console.error('Error fetching conferences:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchConferences()
    }, [])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            case 'upcoming':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            case 'completed':
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
                        Browse and manage all conferences
                    </p>
                </div>
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
                                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(conference.status)}`}>
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="pt-4">
                                            <Link href={`/conference/${conference.id}`}>
                                                <Button className="w-full" variant="outline">
                                                    View Details
                                                </Button>
                                            </Link>
                                        </div>
                                        <div className="pt-4">
                                            <Link href={`/track?conferenceId=${conference.id}`}>
                                                <Button className="w-full" variant="outline">
                                                    View Tracks
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
