'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getConference } from '@/app/api/conference.api'
import type { ConferenceResponse } from '@/types/conference'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, ExternalLink, Loader2, ArrowLeft, Settings } from 'lucide-react'
import Link from 'next/link'

export default function ConferenceDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const conferenceId = Number(params.conferenceId)

    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const conferenceData = await getConference(conferenceId)
                setConference(conferenceData)
            } catch (err: any) {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    setError('You must be logged in to view this conference.')
                    setTimeout(() => {
                        router.push('/auth/login')
                    }, 2000)
                } else {
                    setError('Failed to load conference details. Please try again later.')
                }
                console.error('Error fetching conference:', err)
            } finally {
                setLoading(false)
            }
        }

        if (conferenceId) {
            fetchData()
        }
    }, [conferenceId, router])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
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
                {error.includes('logged in') ? (
                    <Link href="/auth/login">
                        <Button>Go to Login</Button>
                    </Link>
                ) : (
                    <Button onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                )}
            </div>
        )
    }

    if (!conference) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-muted-foreground text-lg">Conference not found</p>
                <Link href="/conference">
                    <Button>Back to Conferences</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <Link href="/conference">
                <Button variant="ghost" className="mb-6">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Conferences
                </Button>
            </Link>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="text-3xl mb-3">
                                    {conference.name}
                                </CardTitle>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-mono text-muted-foreground">
                                        {conference.acronym}
                                    </span>
                                    <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(conference.status)}`}>
                                        {conference.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Description</h3>
                            <p className="text-base">{conference.description}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Location</h3>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-base">{conference.location}</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Conference Dates</h3>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-base">
                                        {formatDate(conference.startDate)} - {formatDate(conference.endDate)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {conference.websiteUrl && (
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Website</h3>
                                <a
                                    href={conference.websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-primary hover:underline"
                                >
                                    <ExternalLink className="h-5 w-5" />
                                    <span>{conference.websiteUrl}</span>
                                </a>
                            </div>
                        )}

                        <div className="pt-4 flex gap-4">
                            <Link href={`/track?conferenceId=${conferenceId}`} className="flex-1">
                                <Button className="w-full" size="lg">
                                    View Tracks
                                </Button>
                            </Link>
                            <Link href={`/conference/${conferenceId}/update`}>
                                <Button variant="outline" size="lg" className="gap-2">
                                    <Settings className="h-4 w-4" />
                                    Manage
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
