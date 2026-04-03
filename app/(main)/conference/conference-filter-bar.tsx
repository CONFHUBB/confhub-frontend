'use client'

export interface FilterValues {
    filterStartDate?: string
    filterEndDate?: string
    location: string
    area: string
    status: string
}

export function filterConferences<T extends {
    startDate: string; endDate: string; location: string; area: string; status: string
}>(items: T[], filters: FilterValues): T[] {
    let result = items

    if (filters.filterStartDate) {
        const queryStart = new Date(filters.filterStartDate).getTime()
        result = result.filter(c => new Date(c.startDate).getTime() >= queryStart)
    }
    
    if (filters.filterEndDate) {
        const queryEnd = new Date(filters.filterEndDate).getTime()
        // we can filter such that the conference's start date is <= queryEnd 
        // to show conferences that start before the "End Date" chosen
        result = result.filter(c => new Date(c.startDate).getTime() <= queryEnd)
    }

    if (filters.location !== 'all') result = result.filter(c => c.location === filters.location)
    if (filters.area !== 'all') result = result.filter(c => c.area === filters.area)
    if (filters.status !== 'all') result = result.filter(c => c.status?.toUpperCase() === filters.status.toUpperCase())

    return result
}
