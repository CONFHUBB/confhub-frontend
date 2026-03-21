"use client"

import { useEffect, useState } from "react"
import { getTracksByConference } from "@/app/api/track.api"
import type { TrackResponse } from "@/types/track"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Layers } from "lucide-react"

interface TrackListProps {
    conferenceId: number
    refreshKey: number
}

export function TrackList({ conferenceId, refreshKey }: TrackListProps) {
    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTracks = async () => {
            try {
                setLoading(true)
                const data = await getTracksByConference(conferenceId)
                setTracks(data)
            } catch (err) {
                console.error("Failed to load tracks:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchTracks()
    }, [conferenceId, refreshKey])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        )
    }

    if (tracks.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <Layers className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No tracks created yet. Add a track manually or import from Excel using the buttons below.</p>
            </div>
        )
    }

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Existing Tracks ({tracks.length})</h3>
            <div className="rounded-lg border divide-y">
                {tracks.map((track, index) => (
                    <div key={track.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">{index + 1}</span>
                            <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{track.name}</p>
                                {track.description && (
                                    <p className="text-xs text-muted-foreground truncate max-w-md">{track.description}</p>
                                )}
                            </div>
                    </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
