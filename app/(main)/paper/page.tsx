'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPapersByAuthor, assignAuthorToPaper, getAuthorsByPaper } from '@/app/api/paper.api'
import { getUsers, getUserByEmail } from '@/app/api/user.api'
import type { PaperResponse } from '@/types/paper'
import type { User } from '@/types/user'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, UserPlus, Users, Edit } from 'lucide-react'
import toast from 'react-hot-toast'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export default function UserSubmissionsPage() {
    const router = useRouter()
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [users, setUsers] = useState<User[]>([])
    const [selectedPaper, setSelectedPaper] = useState<number | null>(null)
    const [selectedUser, setSelectedUser] = useState<string>('')
    const [authors, setAuthors] = useState<{ [paperId: number]: User[] }>({})
    const [isAssigning, setIsAssigning] = useState(false)
    const [openDialog, setOpenDialog] = useState(false)
    const [viewAuthorsDialog, setViewAuthorsDialog] = useState<number | null>(null)

    useEffect(() => {
        fetchPapers()
        fetchUsers()
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

    const fetchUsers = async () => {
        try {
            const data = await getUsers()
            setUsers(data)
        } catch (err) {
            console.error('Error fetching users:', err)
        }
    }

    const fetchAuthors = async (paperId: number) => {
        try {
            const data = await getAuthorsByPaper(paperId)
            setAuthors(prev => ({ ...prev, [paperId]: data }))
        } catch (err) {
            console.error('Error fetching authors:', err)
            toast.error('Failed to load authors')
        }
    }

    const handleAssignAuthor = async () => {
        if (!selectedPaper || !selectedUser) {
            toast.error('Please select a user')
            return
        }

        try {
            setIsAssigning(true)
            await assignAuthorToPaper(selectedPaper, Number(selectedUser))
            toast.success('Author assigned successfully!')
            setOpenDialog(false)
            setSelectedUser('')
            // Refresh authors list for this paper
            await fetchAuthors(selectedPaper)
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to assign author')
            console.error('Error assigning author:', err)
        } finally {
            setIsAssigning(false)
        }
    }

    const handleViewAuthors = async (paperId: number) => {
        setViewAuthorsDialog(paperId)
        if (!authors[paperId]) {
            await fetchAuthors(paperId)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
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
                {error.includes('logged in') && (
                    <Button onClick={() => router.push('/auth/login')}>
                        Go to Login
                    </Button>
                )}
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 px-4 max-w-5xl">
            <div className="mb-4">
                <h1 className="text-2xl font-bold">My Paper Submissions</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your paper submissions and co-authors
                </p>
            </div>

            {papers.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">You haven&apos;t submitted any papers yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {papers.map((paper) => (
                        <Card key={paper.id} className="shadow-sm gap-2">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg leading-tight">{paper.title}</CardTitle>
                                        <CardDescription className="mt-1.5 text-xs">
                                            <div className="space-y-0.5">
                                                <p><strong>Conference:</strong> {paper.track.conference.name} ({paper.track.conference.acronym})</p>
                                                <p><strong>Track:</strong> {paper.track.name}</p>
                                            </div>
                                        </CardDescription>
                                    </div>
                                    <Badge variant={paper.status === 'SUBMITTED' ? 'default' : 'secondary'} className="text-xs shrink-0">
                                        {paper.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-3">
                                <div>
                                    <h4 className="text-sm font-semibold mb-1">Abstract</h4>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{paper.abstractField}</p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold mb-1">Keywords</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        <Badge variant="outline" className="text-xs">{paper.keyword1}</Badge>
                                        <Badge variant="outline" className="text-xs">{paper.keyword2}</Badge>
                                        <Badge variant="outline" className="text-xs">{paper.keyword3}</Badge>
                                        <Badge variant="outline" className="text-xs">{paper.keyword4}</Badge>
                                    </div>
                                </div>

                                <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                                    <span>
                                        <strong>Submitted:</strong> {formatDate(paper.submissionTime)}
                                    </span>
                                    <span>
                                        <strong>Plagiarism:</strong> {paper.isPassedPlagiarism ? 'Passed' : 'Pending'}
                                    </span>
                                </div>

                                <div className="flex gap-2 pt-2 flex-wrap">
                                    <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => router.push(`/paper/${paper.id}`)}>
                                        <Edit className="h-3 w-3 mr-1.5" />
                                        Edit Paper
                                    </Button>

                                    <Dialog open={openDialog && selectedPaper === paper.id} onOpenChange={(open) => {
                                        setOpenDialog(open)
                                        if (open) setSelectedPaper(paper.id)
                                        else {
                                            setSelectedPaper(null)
                                            setSelectedUser('')
                                        }
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="text-xs h-8">
                                                <UserPlus className="h-3 w-3 mr-1.5" />
                                                Add Co-Author
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Add Co-Author</DialogTitle>
                                                <DialogDescription>
                                                    Select a user to add as a co-author to this paper.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="user-select">Select User</Label>
                                                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                                                        <SelectTrigger id="user-select">
                                                            <SelectValue placeholder="Choose a user" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {users.map((user) => (
                                                                <SelectItem key={user.id} value={user.id.toString()}>
                                                                    {user.fullName} ({user.email})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Button
                                                    onClick={handleAssignAuthor}
                                                    disabled={isAssigning || !selectedUser}
                                                    className="w-full"
                                                >
                                                    {isAssigning ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Assigning...
                                                        </>
                                                    ) : (
                                                        'Assign Author'
                                                    )}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    <Dialog open={viewAuthorsDialog === paper.id} onOpenChange={(open) => {
                                        if (!open) setViewAuthorsDialog(null)
                                        else handleViewAuthors(paper.id)
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="text-xs h-8">
                                                <Users className="h-3 w-3 mr-1.5" />
                                                View Authors
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle className="text-lg">Paper Authors</DialogTitle>
                                                <DialogDescription className="text-sm">
                                                    List of all authors for this paper
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-3">
                                                {!authors[paper.id] ? (
                                                    <div className="flex justify-center py-6">
                                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                    </div>
                                                ) : authors[paper.id].length === 0 ? (
                                                    <p className="text-center text-sm text-muted-foreground py-6">
                                                        No co-authors added yet
                                                    </p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {authors[paper.id].map((author) => (
                                                            <Card key={author.id} className="shadow-sm">
                                                                <CardContent className="py-2.5 px-3">
                                                                    <p className="text-sm font-medium">{author.fullName}</p>
                                                                    <p className="text-xs text-muted-foreground">{author.email}</p>
                                                                    {author.phoneNumber && (
                                                                        <p className="text-xs text-muted-foreground">{author.phoneNumber}</p>
                                                                    )}
                                                                    {author.country && (
                                                                        <p className="text-xs text-muted-foreground">{author.country}</p>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
