"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getPapersByAuthor } from "@/app/api/paper.api"
import { PaperResponse } from "@/types/paper"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronUp, FileText, Search, ExternalLink } from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
    'DRAFT': { label: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-200', dotColor: 'bg-gray-500' },
    'SUBMITTED': { label: 'Submitted', color: 'bg-blue-100 text-blue-700 border-blue-200', dotColor: 'bg-blue-500' },
    'UNDER_REVIEW': { label: 'Under Review', color: 'bg-amber-100 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
    'ACCEPTED': { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
    'REJECTED': { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', dotColor: 'bg-red-500' },
    'WITHDRAWN': { label: 'Withdrawn', color: 'bg-rose-100 text-rose-700 border-rose-200', dotColor: 'bg-rose-500' },
    'CAMERA_READY': { label: 'Camera Ready', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', dotColor: 'bg-indigo-500' },
    'PUBLISHED': { label: 'Published', color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200', dotColor: 'bg-fuchsia-500' },
}

export default function MyAllPapersPage() {
    const router = useRouter()
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortKey, setSortKey] = useState<'id' | 'title' | 'status' | 'conference'>('id')
    const [sortAsc, setSortAsc] = useState(false) // Default newest first by ID

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const token = localStorage.getItem("accessToken")
            if (!token) return router.push("/auth/login")
            const payload = JSON.parse(atob(token.split(".")[1]))
            const email = payload.sub
            const userRes = await fetch(`/api/v1/users/email/${email}`)
            const user = await userRes.json()
            if (!user || !user.id) return
            
            const data = await getPapersByAuthor(user.id)
            setPapers(data || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const filtered = useMemo(() => {
        let r = papers
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            r = r.filter(p => 
                p.title.toLowerCase().includes(q) || 
                p.id.toString().includes(q) ||
                (p.track?.conference?.name || '').toLowerCase().includes(q)
            )
        }
        return [...r].sort((a, b) => {
            let cmp = 0
            if (sortKey === 'id') cmp = a.id - b.id
            if (sortKey === 'title') cmp = a.title.localeCompare(b.title)
            if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
            if (sortKey === 'conference') {
                const confA = a.track?.conference?.name || ''
                const confB = b.track?.conference?.name || ''
                cmp = confA.localeCompare(confB)
            }
            return sortAsc ? cmp : -cmp
        })
    }, [papers, searchQuery, sortKey, sortAsc])

    const handleSort = (key: typeof sortKey) => {
        if (sortKey === key) setSortAsc(v => !v)
        else { setSortKey(key); setSortAsc(true) }
    }

    const SortIcon = ({ k }: { k: typeof sortKey }) =>
        sortKey !== k ? <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" /> :
        sortAsc ? <ChevronUp className="h-3 w-3 text-indigo-600" /> : <ChevronDown className="h-3 w-3 text-indigo-600" />

    if (loading) return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Papers</h1>
                <p className="text-sm text-muted-foreground mt-1">All your manuscripts submitted across various conferences</p>
            </div>

            {papers.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9 h-9 text-sm" placeholder="Search by title, conference, or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-white border rounded-xl">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <h2 className="text-lg font-semibold text-gray-900">{searchQuery ? 'No matching papers' : 'No Papers Found'}</h2>
                    <p className="text-sm mt-1">{searchQuery ? 'Try adjusting your search query.' : 'You haven\'t submitted any papers yet.'}</p>
                </div>
            ) : (
                <div className="rounded-xl border overflow-hidden bg-white shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-16 text-center text-xs cursor-pointer group" onClick={() => handleSort('id')}>
                                    <span className="flex items-center justify-center gap-1"># <SortIcon k="id" /></span>
                                </TableHead>
                                <TableHead className="cursor-pointer group" onClick={() => handleSort('title')}>
                                    <span className="flex items-center gap-1">Paper Details <SortIcon k="title" /></span>
                                </TableHead>
                                <TableHead className="w-64 cursor-pointer group" onClick={() => handleSort('conference')}>
                                    <span className="flex items-center gap-1">Conference <SortIcon k="conference" /></span>
                                </TableHead>
                                <TableHead className="w-32 text-center cursor-pointer group" onClick={() => handleSort('status')}>
                                    <span className="flex items-center justify-center gap-1">Status <SortIcon k="status" /></span>
                                </TableHead>
                                <TableHead className="w-24 text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(paper => {
                                const sc = STATUS_CONFIG[paper.status] || { label: paper.status, color: 'bg-gray-100', dotColor: 'bg-gray-500' }
                                return (
                                    <TableRow key={paper.id} className="hover:bg-muted/30 group">
                                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                            {paper.id}
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-semibold text-sm line-clamp-1">{paper.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1 flex gap-2">
                                                <span>{new Date(paper.submissionTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                {paper.track?.name && <span>• {paper.track.name}</span>}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px] shrink-0">
                                                    {paper.track?.conference?.acronym || 'CONF'}
                                                </div>
                                                <span className="text-sm font-medium line-clamp-2">{paper.track?.conference?.name || '—'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={`text-[10px] px-2 py-0.5 border ${sc.color} shadow-sm justify-center`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dotColor} mr-1.5`} />
                                                {sc.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                onClick={() => paper.conferenceId && router.push(`/conference/${paper.conferenceId}/author?tab=my-papers`)}
                                            >
                                                Workspace <ExternalLink className="h-3 w-3" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
