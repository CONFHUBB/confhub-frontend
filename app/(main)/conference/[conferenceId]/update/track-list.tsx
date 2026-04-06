"use client"

import { useEffect, useState } from "react"
import { getTracksByConference } from "@/app/api/track.api"
import type { TrackResponse } from "@/types/track"
import { Loader2, Layers } from "lucide-react"
import { StandardPagination } from "@/components/ui/standard-pagination"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface TrackListProps {
    conferenceId: number
    refreshKey: number
}

const PAGE_SIZE = 10

export function TrackList({ conferenceId, refreshKey }: TrackListProps) {
    const [allTracks, setAllTracks] = useState<TrackResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(0)

    useEffect(() => {
        const fetchTracks = async () => {
            try {
                setLoading(true)
                const data = await getTracksByConference(conferenceId)
                setAllTracks(data)
            } catch (err) {
                console.error("Failed to load tracks:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchTracks()
    }, [conferenceId, refreshKey])

    // Reset to page 0 when data changes
    useEffect(() => {
        setCurrentPage(0)
    }, [allTracks.length])

    const totalElements = allTracks.length
    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))
    const paginatedTracks = allTracks.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

    return (
        <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Conference Tracks
                    {!loading && (
                        <span className="text-xs font-normal text-muted-foreground">
                            ({totalElements})
                        </span>
                    )}
                </h3>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : allTracks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                    <Layers className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    No tracks created yet. Use the Add Tracks section above to create tracks.
                </div>
            ) : (
                <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-12 text-center">#</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedTracks.map((track, idx) => (
                                <TableRow key={track.id}>
                                    <TableCell className="text-center text-xs text-muted-foreground font-medium">
                                        {currentPage * PAGE_SIZE + idx + 1}
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium text-sm">{track.name}</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm text-muted-foreground truncate max-w-md">
                                            {track.description || "—"}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                </div>
            )}

            <StandardPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalElements={totalElements}
                entityName="tracks"
                onPageChange={setCurrentPage}
            />
        </div>
    )
}
