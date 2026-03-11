'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getTracksByConference } from '@/app/api/track.api'
import { getConference } from '@/app/api/conference.api'
import type { TrackResponse } from '@/types/track'
import type { ConferenceResponse } from '@/types/conference'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TracksPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const conferenceId = Number(searchParams.get('conferenceId'))

    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [conference, setConference] = useState<ConferenceResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const [tracksData, conferenceData] = await Promise.all([
                    getTracksByConference(conferenceId),
                    getConference(conferenceId)
                ])
                setTracks(tracksData)
                setConference(conferenceData)
            } catch (err: any) {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    setError('You must be logged in to view tracks.')
                    setTimeout(() => {
                        router.push('/auth/login')
                    }, 2000)
                } else {
                    setError('Failed to load tracks. Please try again later.')
                }
                console.error('Error fetching tracks:', err)
            } finally {
                setLoading(false)
            }
        }

        if (conferenceId) {
            fetchData()
        }
    }, [conferenceId, router])

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

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <Link href={`/conference/${conferenceId}`}>
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Conference
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {conference?.name} - Tracks
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {conference?.description}
                    </p>
                </div>
            </div>

            {tracks.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No tracks available for this conference</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {tracks.map((track) => (
                        <Card key={track.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-xl">
                                        {track.name}
                                    </CardTitle>
                                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        Open
                                    </span>
                                </div>
                                <CardDescription className="line-clamp-2">
                                    {track.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="pt-2 border-t">
                                        <p className="text-sm text-muted-foreground">
                                            Max Submissions: <span className="font-semibold">{track.maxSubmissions}</span>
                                        </p>
                                    </div>

                                    <div className="pt-4">
                                        <Link href={`/track/${track.id}/submit?conferenceId=${conferenceId}`}>
                                            <Button className="w-full">
                                                <FileText className="h-4 w-4 mr-2" />
                                                Submit Paper
                                            </Button>
                                        </Link>
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
