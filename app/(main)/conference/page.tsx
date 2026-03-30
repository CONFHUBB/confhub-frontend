'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getConferences, approveConference } from '@/app/api/conference.api'
import { useUserRole } from '@/hooks/useUserRole'
import type { ConferenceListResponse } from '@/types/conference'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Loader2, CheckCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ConferenceFilterBar, filterConferences, type FilterValues } from './conference-filter-bar'

// Inner component that uses useSearchParams (must be inside Suspense)
function ConferencesPageInner() {
    const searchParams = useSearchParams()
    const [conferences, setConferences] = useState<ConferenceListResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [approvingId, setApprovingId] = useState<number | null>(null)
    const { roles } = useUserRole()
    const isStaff = roles.some(r => r === 'ROLE_STAFF' || r === 'ROLE_ADMIN')

    // Read ?status from URL — used by "Submit Paper" nav link
    const statusParam = searchParams.get('status') ?? 'all'

    const [filters, setFilters] = useState<FilterValues>({
        datePreset: 'all',
        location: 'all',
        area: 'all',
        status: statusParam !== 'all' ? statusParam : 'all',
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(0)
    const PAGE_SIZE = 8

    // Sync status filter when URL param changes (user navigates via nav)
    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            status: statusParam !== 'all' ? statusParam : 'all',
        }))
        setCurrentPage(0)
    }, [statusParam])

    useEffect(() => { fetchConferences() }, [])

    const fetchConferences = async () => {
        try {
            setLoading(true)
            // Sort by newest (the API returns all; we sort client-side)
            const data = await getConferences()
            // Sort by id DESC as proxy for createdAt DESC
            const sorted = [...data].sort((a, b) => b.id - a.id)
            setConferences(sorted)
        } catch (err: any) {
            setError('Failed to load conferences. Please try again later.')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id: number) => {
        try {
            setApprovingId(id)
            await approveConference(id)
            toast.success('Conference approved successfully!')
            await fetchConferences()
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to approve conference')
        } finally {
            setApprovingId(null)
        }
    }

    const uniqueLocations = useMemo(() => {
        return [...new Set(conferences.map(c => c.location).filter(Boolean))].sort()
    }, [conferences])

    const uniqueAreas = useMemo(() => {
        return [...new Set(conferences.map(c => c.area).filter(Boolean))].sort()
    }, [conferences])

    const filtered = useMemo(() => {
        let list = filterConferences(conferences, filters)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            list = list.filter(c =>
                c.name.toLowerCase().includes(q) ||
                (c.acronym && c.acronym.toLowerCase().includes(q)) ||
                (c.description && c.description.toLowerCase().includes(q)) ||
                (c.location && c.location.toLowerCase().includes(q))
            )
        }
        return list
    }, [conferences, filters, searchQuery])

    // Reset page when filters/search change
    React.useEffect(() => { setCurrentPage(0) }, [filters, searchQuery])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginatedList = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'ONGOING': return 'bg-green-100 text-green-800'
            case 'SCHEDULED': return 'bg-indigo-100 text-indigo-800'
            case 'PENDING': return 'bg-amber-100 text-amber-800'
            case 'BIDDING': return 'bg-purple-100 text-purple-800'
            case 'COMPLETED': return 'bg-gray-100 text-gray-600'
            case 'CANCELLED': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
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
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        )
    }

    // Page title changes when filtering by status
    const pageTitle = filters.status === 'ONGOING'
        ? 'Open for Submissions'
        : 'All Conferences'
    const pageSubtitle = filters.status === 'ONGOING'
        ? 'Conferences currently accepting paper submissions'
        : isStaff ? 'Manage and approve conferences' : 'Browse and discover conferences'

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
                    <p className="text-muted-foreground mt-1">
                        {pageSubtitle}
                        {filtered.length !== conferences.length && (
                            <span className="ml-1">
                                · Showing <strong>{filtered.length}</strong> of {conferences.length}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            className="pl-10 h-10 text-sm"
                            placeholder="Search conferences..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <ConferenceFilterBar
                        locations={uniqueLocations}
                        areas={uniqueAreas}
                        isStaff={isStaff}
                        filters={filters}
                        onFiltersChange={setFilters}
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">
                        {conferences.length === 0 ? 'No conferences found' : 'No conferences match your filters'}
                    </p>
                    {conferences.length === 0 ? (
                        <Link href="/conference/create">
                            <Button className="mt-4">Create Your First Conference</Button>
                        </Link>
                    ) : (
                        <Button variant="outline" className="mt-4" onClick={() => {
                            setFilters({ datePreset: 'all', location: 'all', area: 'all', status: 'all' })
                            setSearchQuery('')
                        }}>
                            Clear all filters
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {paginatedList.map((conference) => (
                            <Link
                                key={conference.id}
                                href={`/conference/${conference.id}`}
                                className="group block"
                            >
                                <div className="rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                                    {/* Banner Image */}
                                    <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden">
                                        {conference.bannerImageUrl ? (
                                            <img
                                                src={conference.bannerImageUrl}
                                                alt={conference.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-white/60 text-4xl font-bold tracking-wider">
                                                    {conference.acronym}
                                                </span>
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold backdrop-blur-sm ${getStatusColor(conference.status)}`}>
                                                {conference.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-4 space-y-3">
                                        <div>
                                            <h3 className="font-bold text-base leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                                {conference.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground font-mono mt-1">
                                                {conference.acronym}
                                            </p>
                                        </div>

                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {conference.description}
                                        </p>

                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                                <span>{formatDate(conference.startDate)} – {formatDate(conference.endDate)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{conference.location}</span>
                                            </div>
                                        </div>

                                        {isStaff && conference.status.toUpperCase() === 'PENDING' && (
                                            <Button
                                                className="w-full mt-1 gap-2 bg-green-600 hover:bg-green-700 text-white text-sm h-9"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleApprove(conference.id) }}
                                                disabled={approvingId === conference.id}
                                            >
                                                {approvingId === conference.id ? (
                                                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Approving...</>
                                                ) : (
                                                    <><CheckCircle className="h-3.5 w-3.5" /> Approve</>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-8 pt-6 border-t gap-4">
                        <p className="text-sm text-muted-foreground font-medium">
                            Showing <span className="text-foreground">{currentPage * PAGE_SIZE + 1}</span> to <span className="text-foreground">{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)}</span> of <span className="text-foreground">{filtered.length}</span> conferences
                        </p>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    disabled={currentPage === 0}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    title="Previous page"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <Button
                                        key={i}
                                        variant={currentPage === i ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 w-8 p-0 text-xs"
                                        onClick={() => setCurrentPage(i)}
                                    >
                                        {i + 1}
                                    </Button>
                                )).slice(
                                    Math.max(0, currentPage - 2),
                                    Math.min(totalPages, currentPage + 3)
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    disabled={currentPage >= totalPages - 1}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    title="Next page"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

// Root export: wrapped in Suspense because useSearchParams requires it
export default function ConferencesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <ConferencesPageInner />
        </Suspense>
    )
}
