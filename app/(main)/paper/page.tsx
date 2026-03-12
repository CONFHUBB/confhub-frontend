'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPapersByAuthor } from '@/app/api/paper.api'
import { getUserByEmail } from '@/app/api/user.api'
import type { PaperResponse } from '@/types/paper'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Edit } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

export default function UserSubmissionsPage() {
    const router = useRouter()
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchPapers()
    }, [])

    const fetchPapers = async () => {
        try {
            setLoading(true)

            // Get email from token
            const token = localStorage.getItem('accessToken')
            if (!token) {
                setError('You must be logged in to view your submissions.')
                setTimeout(() => router.push('/auth/login'), 2000)
                return
            }

            const payload = JSON.parse(atob(token.split('.')[1]))
            const userEmail = payload.sub

            console.log('User email from token:', userEmail)

            if (!userEmail) {
                setError('Invalid token. Please log in again.')
                setTimeout(() => router.push('/auth/login'), 2000)
                return
            }

            // Get user info by email to get the user ID
            console.log('Fetching user by email:', userEmail)
            const user = await getUserByEmail(userEmail)
            console.log('User found:', user)

            if (!user || !user.id) {
                setError('User not found. Unable to load papers.')
                setLoading(false)
                return
            }

            console.log('User object:', user)
            const userId = user.id
            console.log('Extracted user ID:', userId, 'Type:', typeof userId)

            console.log('About to fetch papers for user ID:', userId)
            const data = await getPapersByAuthor(userId)
            console.log('Papers loaded:', data)
            setPapers(data)
        } catch (err: any) {
            console.error('Error fetching papers:', err)
            console.error('Error response:', err.response)
            console.error('Error message:', err.message)

            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Session expired. Please log in again.')
                setTimeout(() => {
                    router.push('/auth/login')
                }, 2000)
            } else {
                setError(`Failed to load submissions: ${err.message || 'Unknown error'}`)
            }
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    // Group papers by conference
    const groupedPapers = papers.reduce<Record<number, { conferenceName: string; conferenceAcronym: string; submissionDeadline: string; papers: PaperResponse[] }>>(
        (acc, paper) => {
            const conf = paper.track.conference
            if (!acc[conf.id]) {
                acc[conf.id] = {
                    conferenceName: conf.name,
                    conferenceAcronym: conf.acronym,
                    submissionDeadline: conf.endDate,
                    papers: [],
                }
            }
            acc[conf.id].papers.push(paper)
            return acc
        },
        {}
    )

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
                {error.includes('logged in') && (
                    <Button onClick={() => router.push('/auth/login')}>
                        Go to Login
                    </Button>
                )}
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 px-4 max-w-8xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">My Paper Submissions</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Review your submissions and open the edit page to manage paper details and authors
                </p>
            </div>

            {papers.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">You haven&apos;t submitted any papers yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {Object.values(groupedPapers).map((group) => (
                        <div key={group.conferenceName}>
                            {/* Conference group header */}
                            <div className="flex items-center justify-between mb-3 pb-2 border-b">
                                <div>
                                    <h2 className="text-base font-semibold">
                                        {group.conferenceName}
                                        <span className="ml-2 text-sm font-normal text-muted-foreground">({group.conferenceAcronym})</span>
                                    </h2>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <span className="font-medium">Submission Deadline:</span>{' '}
                                    <span className={new Date(group.submissionDeadline) < new Date() ? 'text-destructive font-medium' : 'text-foreground'}>
                                        {formatDate(group.submissionDeadline)}
                                    </span>
                                </div>
                            </div>

                            {/* Papers table */}
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[280px]">Title</TableHead>
                                            <TableHead>Track</TableHead>
                                            <TableHead>Keywords</TableHead>
                                            <TableHead>Submitted</TableHead>
                                            <TableHead>Plagiarism</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.papers.map((paper) => (
                                            <TableRow key={paper.id}>
                                                <TableCell className="max-w-[280px]">
                                                    <p className="font-medium text-sm leading-snug line-clamp-2 whitespace-normal">{paper.title}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 whitespace-normal">{paper.abstractField}</p>
                                                </TableCell>
                                                <TableCell className="text-sm">{paper.track.name}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {[paper.keyword1, paper.keyword2, paper.keyword3, paper.keyword4]
                                                            .filter(Boolean)
                                                            .map((kw, i) => (
                                                                <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                                                            ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(paper.submissionTime)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={paper.isPassedPlagiarism ? 'default' : 'secondary'} className="text-xs">
                                                        {paper.isPassedPlagiarism ? 'Passed' : 'Pending'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={paper.status === 'SUBMITTED' ? 'default' : 'secondary'} className="text-xs">
                                                        {paper.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs h-7 px-2"
                                                        onClick={() => router.push(`/paper/${paper.id}`)}
                                                    >
                                                        <Edit className="h-3 w-3 mr-1" />
                                                        Edit
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
