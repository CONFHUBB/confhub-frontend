'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getConferences, approveConference } from '@/app/api/conference.api'
import { useUserRole } from '@/hooks/useUserRole'
import type { ConferenceListResponse } from '@/types/conference'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Loader2, CheckCircle, Search, Filter } from 'lucide-react'
import { StandardPagination } from '@/components/ui/standard-pagination'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

import { CardGridSkeleton, PageHeaderSkeleton } from '@/components/shared/skeletons'
import { toast } from 'sonner'
import { fmtDate } from '@/lib/utils'
import { filterConferences, type FilterValues } from './conference-filter-bar'

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
        location: 'all',
        area: 'all',
        status: statusParam !== 'all' ? statusParam : 'all',
        filterStartDate: '',
        filterEndDate: ''
    })
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(0)
    const PAGE_SIZE = 12

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

    // Admin/Staff: see all conferences including PENDING.
    // Regular users: PENDING conferences are hidden from listing.
    const visibleConferences = useMemo(() => {
        if (isStaff) return conferences
        return conferences.filter(c => c.status.toUpperCase() !== 'PENDING')
    }, [conferences, isStaff])

    const filtered = useMemo(() => {
        let list = filterConferences(visibleConferences, filters)
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
    }, [visibleConferences, filters, searchQuery])

    // Reset page when filters/search change
    React.useEffect(() => { setCurrentPage(0) }, [filters, searchQuery])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginatedList = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

    const formatDate = (dateString: string) => fmtDate(dateString)

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'ONGOING': return 'bg-green-100 text-green-800'
            case 'SCHEDULED': return 'bg-indigo-100 text-indigo-800'
            case 'PENDING': return 'bg-amber-100 text-amber-800'
            case 'BIDDING': return 'bg-indigo-100 text-indigo-800'
            case 'COMPLETED': return 'bg-gray-100 text-gray-600'
            case 'CANCELLED': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    if (loading) {
        return (
            <div className="page-wide">
                <PageHeaderSkeleton />
                <CardGridSkeleton count={12} />
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
        <div className="page-wide">
            {/* Eye-catching Page Header */}
            <div className="relative mb-8 p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800">
                {/* Decorative background blobs */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-secondary/10 dark:bg-secondary/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

                <div className="relative z-10 max-w-4xl">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                        {filters.status === 'ONGOING' ? (
                            <>Open for <span className="text-primary">Submissions</span></>
                        ) : (
                            <>All <span className="text-primary">Conferences</span></>
                        )}
                    </h1>

                    <div className="flex items-center flex-wrap gap-4 mt-2">
                        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
                            {pageSubtitle}
                        </p>
                        {filtered.length !== visibleConferences.length && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300 shadow-sm">
                                Showing {filtered.length} of {visibleConferences.length} matches
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 items-start">
                {/* Sidebar */}
                <aside className="w-full xl:w-72 shrink-0">
                    <div className="xl:sticky xl:top-24 space-y-6 bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
                        {/* Search Section */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Search className="h-4 w-4 text-indigo-500" />
                                Find Conferences
                            </h3>
                            <Input
                                className="pl-4 h-11 text-sm bg-white dark:bg-slate-950 border-slate-200/60 shadow-sm rounded-xl focus-visible:ring-indigo-500"
                                placeholder="Search by name, coords..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Exposed Filter Section */}
                        <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                            {/* Date Filter */}
                            <div>
                                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-3">Timeframe</h3>
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium text-slate-500">Starts after</label>
                                        <Input
                                            type="date"
                                            max="9999-12-31"
                                            className="h-10 text-sm bg-white dark:bg-slate-950 border-slate-200/60 shadow-sm rounded-xl focus-visible:ring-indigo-500"
                                            value={filters.filterStartDate || ''}
                                            onChange={(e) => setFilters({ ...filters, filterStartDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium text-slate-500">Starts before</label>
                                        <Input
                                            type="date"
                                            max="9999-12-31"
                                            className="h-10 text-sm bg-white dark:bg-slate-950 border-slate-200/60 shadow-sm rounded-xl focus-visible:ring-indigo-500"
                                            value={filters.filterEndDate || ''}
                                            onChange={(e) => setFilters({ ...filters, filterEndDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            {/* Location Filter */}
                            <div>
                                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-3">Location</h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="radio" name="location" checked={filters.location === 'all'} onChange={() => setFilters({ ...filters, location: 'all' })} className="w-4 h-4 accent-indigo-600" />
                                        <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">All locations</span>
                                    </label>
                                    {uniqueLocations.map(loc => (
                                        <label key={loc} className="flex items-center gap-3 cursor-pointer group">
                                            <input type="radio" name="location" checked={filters.location === loc} onChange={() => setFilters({ ...filters, location: loc })} className="w-4 h-4 accent-indigo-600" />
                                            <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">{loc}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Research Area Filter */}
                            <div>
                                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-3">Research Area</h3>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setFilters({ ...filters, area: 'all' })}
                                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors cursor-pointer ${filters.area === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600'}`}
                                    >
                                        All areas
                                    </button>
                                    {uniqueAreas.map(area => (
                                        <button
                                            key={area}
                                            onClick={() => setFilters({ ...filters, area: area })}
                                            className={`px-3 py-1.5 text-xs rounded-full border transition-colors cursor-pointer ${filters.area === area ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600'}`}
                                        >
                                            {area}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-3">Status</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(['all', 'ONGOING', 'SCHEDULED', 'PENDING', 'BIDDING', 'COMPLETED', 'CANCELLED'] as const).map(s => {
                                        const label = s === 'all' ? 'All statuses'
                                            : s === 'ONGOING' ? 'Open for Submissions'
                                                : s.charAt(0) + s.slice(1).toLowerCase()
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => setFilters({ ...filters, status: s })}
                                                className={`px-3 py-1.5 text-xs rounded-full border transition-colors cursor-pointer ${filters.status === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600'}`}
                                            >
                                                {label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {isStaff && (
                                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                    <div className="inline-flex items-center gap-1.5 text-xs py-1 px-2.5 border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-full font-medium mt-2">
                                        <CheckCircle className="h-3 w-3" /> Staff Viewer
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0">

                    {filtered.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground text-lg">
                                {visibleConferences.length === 0 ? 'No conferences found' : 'No conferences match your filters'}
                            </p>
                            {conferences.length === 0 ? (
                                <Link href="/conference/create">
                                    <Button className="mt-4">Create Your First Conference</Button>
                                </Link>
                            ) : (
                                <Button variant="outline" className="mt-4" onClick={() => {
                                    setFilters({ filterStartDate: '', filterEndDate: '', location: 'all', area: 'all', status: 'all' })
                                    setSearchQuery('')
                                }}>
                                    Clear all filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
                                {paginatedList.map((conference) => (
                                    <Link
                                        key={conference.id}
                                        href={`/conference/${conference.id}`}
                                        className="group block h-full"
                                    >
                                        <div className="h-full flex flex-col rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                                            {/* Banner Image */}
                                            <div className="relative w-full aspect-[16/9] bg-primary overflow-hidden shrink-0">
                                                {conference.bannerImageUrl && (
                                                    <img
                                                        src={conference.bannerImageUrl}
                                                        alt={conference.name}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 z-[1]"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none'
                                                        }}
                                                    />
                                                )}
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="text-white/60 text-4xl font-bold tracking-wider">
                                                        {conference.acronym}
                                                    </span>
                                                </div>
                                                <div className="absolute top-3 left-3">
                                                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold backdrop-blur-sm ${getStatusColor(conference.status)}`}>
                                                        {conference.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Card Body */}
                                            <div className="p-4 flex flex-col flex-grow">
                                                <div>
                                                    <h3 className="font-bold text-base leading-snug line-clamp-2 min-h-[2.75rem] group-hover:text-indigo-600 transition-colors">
                                                        {conference.name}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground font-mono mt-1.5 truncate">
                                                        {conference.acronym}
                                                    </p>
                                                </div>

                                                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] mt-3">
                                                    {conference.description}
                                                </p>

                                                <div className="mt-auto space-y-2 pt-5">
                                                    <div className="flex items-center gap-2.5 text-[0.7rem] font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-2 py-1.5 rounded-md border border-slate-100 dark:border-slate-800">
                                                        <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/50 shrink-0">
                                                            <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <span className="truncate whitespace-nowrap">{formatDate(conference.startDate)} – {formatDate(conference.endDate)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-2 py-1.5 rounded-md border border-slate-100 dark:border-slate-800">
                                                        <div className="p-1 rounded-md bg-teal-100 dark:bg-teal-900/50 shrink-0">
                                                            <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                                                        </div>
                                                        <span className="truncate">{conference.location}</span>
                                                    </div>
                                                </div>

                                                {isStaff && conference.status.toUpperCase() === 'PENDING' && (
                                                    <Button
                                                        className="w-full mt-4 gap-2 bg-green-600 hover:bg-green-700 text-white text-sm h-9 shrink-0"
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

                            <StandardPagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalElements={filtered.length}
                                entityName="conferences"
                                onPageChange={setCurrentPage}
                            />
                        </>
                    )}
                </main>
            </div>
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
