"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getPapersByAuthor } from "@/app/api/paper.api"
import { getUserByEmail } from "@/app/api/user.api"
import { PaperResponse } from "@/types/paper"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { toast } from 'sonner'
import { getPaperStatus } from '@/lib/constants/status'
import { getCurrentUserEmail } from '@/lib/auth'
import { fmtDate } from '@/lib/utils'
import { UnifiedDataTable, DataTableColumn } from "@/components/ui/unified-data-table"

export default function MyAllPapersPage() {
    const router = useRouter()
    const [papers, setPapers] = useState<PaperResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const email = getCurrentUserEmail()
            if (!email) return router.push("/auth/login")
            
            const user = await getUserByEmail(email)
            if (!user || !user.id) return
            
            const data = await getPapersByAuthor(user.id)
            setPapers(data || [])
        } catch (error) {
            console.error(error)
            toast.error("Failed to load papers. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return papers
        const q = searchQuery.toLowerCase()
        return papers.filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.id.toString().includes(q) ||
            (p.track?.conference?.name || '').toLowerCase().includes(q)
        )
    }, [papers, searchQuery])

    const columns: DataTableColumn<PaperResponse>[] = [
        {
            header: "#",
            className: "w-16 text-center",
            cell: (paper) => (
                <span className="font-mono text-xs text-muted-foreground">{paper.id}</span>
            ),
        },
        {
            header: "Paper Details",
            cell: (paper) => (
                <div>
                    <p className="font-semibold text-sm line-clamp-1">{paper.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex gap-2">
                        <span>{fmtDate(paper.submissionTime)}</span>
                        {paper.track?.name && <span>• {paper.track.name}</span>}
                    </p>
                </div>
            ),
        },
        {
            header: "Conference",
            className: "w-64",
            cell: (paper) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px] shrink-0">
                        {paper.track?.conference?.acronym || 'CONF'}
                    </div>
                    <span className="text-sm font-medium line-clamp-2">{paper.track?.conference?.name || '—'}</span>
                </div>
            ),
        },
        {
            header: "Status",
            className: "w-32 text-center",
            cell: (paper) => {
                const sc = getPaperStatus(paper.status)
                return (
                    <Badge className={`text-[10px] px-2 py-0.5 border ${sc.bg} ${sc.text} ${sc.border} shadow-sm justify-center`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} mr-1.5`} />
                        {sc.label}
                    </Badge>
                )
            },
        },
        {
            header: "Action",
            className: "w-24 text-right",
            cell: (paper) => (
                <Button
                    size="sm"
                    className="gap-1.5 h-8 text-[11px] font-semibold tracking-wide bg-indigo-600 hover:bg-indigo-700 text-white border-0 shrink-0"
                    onClick={() => paper.track?.conference?.id && router.push(`/conference/${paper.track.conference.id}/author?tab=my-papers`)}
                >
                    Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                </Button>
            ),
        },
    ]

    return (
        <UnifiedDataTable<PaperResponse>
            title="My Papers"
            description="All your manuscripts submitted across various conferences"
            columns={columns}
            data={filtered}
            isLoading={loading}
            keyExtractor={(paper) => paper.id}
            searchPlaceholder="Search by title, conference, or ID..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
        />
    )
}
