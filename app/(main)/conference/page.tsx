'use client'

import { useEffect, useState, useMemo } from 'react'
import { getConferences, approveConference } from '@/app/api/conference.api'
import { useUserRole } from '@/hooks/useUserRole'
import type { ConferenceListResponse } from '@/types/conference'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ConferenceFilterBar, filterConferences, type FilterValues } from './conference-filter-bar'

export default function ConferencesPage() {
    const [conferences, setConferences] = useState<ConferenceListResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [approvingId, setApprovingId] = useState<number | null>(null)
    const { roles } = useUserRole()
    const isStaff = roles.some(r => r === 'ROLE_STAFF' || r === 'ROLE_ADMIN')

    const [filters, setFilters] = useState<FilterValues>({
        datePreset: 'all',
        location: 'all',
        area: 'all',
    })

    useEffect(() => { fetchConferences() }, [])

    const fetchConferences = async () => {
        try {
            setLoading(true)
            const data = await getConferences()
            setConferences(data)
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

    const filtered = useMemo(() => filterConferences(conferences, filters), [conferences, filters])

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'ACTIVE': case 'APPROVED': return 'bg-green-100 text-green-800'
            case 'UPCOMING': return 'bg-blue-100 text-blue-800'
            case 'PENDING': return 'bg-amber-100 text-amber-800'
            case 'REJECTED': return 'bg-red-100 text-red-800'
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

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            {/* Header + Filter Bar inline */}
            <div className="flex items-start justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Conferences</h1>
                    <p className="text-muted-foreground mt-2">
                        {isStaff ? 'Manage and approve conferences' : 'Browse and discover conferences'}
                        {filtered.length !== conferences.length && (
                            <span className="ml-1">
                                · Showing <strong>{filtered.length}</strong> of {conferences.length}
                            </span>
                        )}
                    </p>
                </div>
                <ConferenceFilterBar
                    locations={uniqueLocations}
                    areas={uniqueAreas}
                    isStaff={isStaff}
                    filters={filters}
                    onFiltersChange={setFilters}
                />
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
                        <Button variant="outline" className="mt-4" onClick={() => setFilters({ datePreset: 'all', location: 'all', area: 'all' })}>
                            Clear all filters
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((conference) => (
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
                                        <h3 className="font-bold text-base leading-tight line-clamp-2 group-hover:text-[#34c6eb] transition-colors">
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
            )}
        </div>
    )
}
