'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { getTrack, getTopicsByTrack } from '@/app/api/track.api'
import type { TrackResponse } from '@/types/track'
import type { TopicResponse } from '@/types/topic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CreatePaperRequest } from '@/types/paper'
import { createPaper, assignAuthorToPaper } from '@/app/api/paper.api'
import { getUserByEmail } from '@/app/api/user.api'

const getCurrentUserEmail = (): string | null => {
    if (typeof window === 'undefined') return null
    const token = localStorage.getItem('accessToken')
    if (!token) return null

    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.sub || null
    } catch (error) {
        console.error('Error decoding token:', error)
        return null
    }
}

export default function SubmitPaperPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const trackId = Number(params.trackId)
    const conferenceId = Number(searchParams.get('conferenceId'))

    const [track, setTrack] = useState<TrackResponse | null>(null)
    const [topics, setTopics] = useState<TopicResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState<CreatePaperRequest>({
        conferenceTrackId: trackId,
        topicId: 0,
        title: '',
        abstractField: '',
        keyword1: '',
        keyword2: '',
        keyword3: '',
        keyword4: '',
        submissionTime: new Date().toISOString(),
        isPassedPlagiarism: false,
        status: 'SUBMITTED'
    })

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const [trackData, topicsData] = await Promise.all([
                    getTrack(trackId),
                    getTopicsByTrack(trackId)
                ])
                setTrack(trackData)
                setTopics(topicsData)
            } catch (err: any) {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    setError('You must be logged in to submit a paper.')
                    setTimeout(() => {
                        router.push('/auth/login')
                    }, 2000)
                } else {
                    setError('Failed to load submission form. Please try again later.')
                }
                console.error('Error fetching data:', err)
            } finally {
                setLoading(false)
            }
        }

        if (trackId) {
            fetchData()
        }
    }, [trackId, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.topicId) {
            toast.error('Please select a topic')
            return
        }

        try {
            setSubmitting(true)
            const createdPaper = await createPaper(formData)

            if (createdPaper.id) {
                const userEmail = getCurrentUserEmail()
                if (userEmail) {
                    try {
                        const user = await getUserByEmail(userEmail)
                        if (user && user.id) {
                            await assignAuthorToPaper(createdPaper.id, user.id)
                        }
                    } catch (authorErr) {
                        console.error('Error assigning author:', authorErr)
                    }
                }
            }

            toast.success('Paper submitted successfully!')
            router.push(`/track?conferenceId=${conferenceId}`)
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to submit paper. Please try again.')
            console.error('Error submitting paper:', err)
        } finally {
            setSubmitting(false)
        }
    }

    const handleChange = (field: keyof CreatePaperRequest, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
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
        <div className="container mx-auto py-8 px-4 max-w-3xl">
            <Link href={`/track?conferenceId=${conferenceId}`}>
                <Button variant="ghost" className="mb-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Tracks
                </Button>
            </Link>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Submit Paper</CardTitle>
                    <CardDescription>
                        {track?.name} - {track?.description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="topic">Topic *</Label>
                            <Select
                                value={formData.topicId.toString()}
                                onValueChange={(value) => handleChange('topicId', Number(value))}
                            >
                                <SelectTrigger id="topic">
                                    <SelectValue placeholder="Select a topic" />
                                </SelectTrigger>
                                <SelectContent>
                                    {topics.map((topic) => (
                                        <SelectItem key={topic.id} value={topic.id.toString()}>
                                            {topic.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Paper Title *</Label>
                            <Input
                                id="title"
                                placeholder="Enter your paper title"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="abstract">Abstract *</Label>
                            <Textarea
                                id="abstract"
                                placeholder="Enter your paper abstract"
                                value={formData.abstractField}
                                onChange={(e) => handleChange('abstractField', e.target.value)}
                                rows={6}
                                required
                            />
                        </div>

                        <div className="space-y-4">
                            <Label>Keywords *</Label>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="keyword1" className="text-sm text-muted-foreground">
                                        Keyword 1
                                    </Label>
                                    <Input
                                        id="keyword1"
                                        placeholder="Keyword 1"
                                        value={formData.keyword1}
                                        onChange={(e) => handleChange('keyword1', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="keyword2" className="text-sm text-muted-foreground">
                                        Keyword 2
                                    </Label>
                                    <Input
                                        id="keyword2"
                                        placeholder="Keyword 2"
                                        value={formData.keyword2}
                                        onChange={(e) => handleChange('keyword2', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="keyword3" className="text-sm text-muted-foreground">
                                        Keyword 3
                                    </Label>
                                    <Input
                                        id="keyword3"
                                        placeholder="Keyword 3"
                                        value={formData.keyword3}
                                        onChange={(e) => handleChange('keyword3', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="keyword4" className="text-sm text-muted-foreground">
                                        Keyword 4
                                    </Label>
                                    <Input
                                        id="keyword4"
                                        placeholder="Keyword 4"
                                        value={formData.keyword4}
                                        onChange={(e) => handleChange('keyword4', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="flex-1"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Paper'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
