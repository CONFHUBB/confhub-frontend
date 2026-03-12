"use client"

import { useState } from "react"
import type { TrackResponse } from "@/types/track"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Loader2, Copy } from "lucide-react"

interface ReviewQuestionsCopyDialogProps {
    open: boolean
    onClose: () => void
    tracks: TrackResponse[]
    currentTrackId: number | null
    onCopy: (targetTrackIds: number[]) => Promise<void>
}

export function ReviewQuestionsCopyDialog({
    open,
    onClose,
    tracks,
    currentTrackId,
    onCopy,
}: ReviewQuestionsCopyDialogProps) {
    const [selectedTrackIds, setSelectedTrackIds] = useState<number[]>([])
    const [isCopying, setIsCopying] = useState(false)

    if (!open) return null

    const otherTracks = tracks.filter((t) => t.id !== currentTrackId)

    const handleToggle = (trackId: number) => {
        setSelectedTrackIds((prev) =>
            prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
        )
    }

    const handleCopy = async () => {
        if (selectedTrackIds.length === 0) return
        setIsCopying(true)
        try {
            await onCopy(selectedTrackIds)
            onClose()
            setSelectedTrackIds([]) // Reset after success
        } finally {
            setIsCopying(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background rounded-xl border shadow-2xl p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold">Copy Questions</h4>
                    <Button variant="ghost" size="icon" onClick={onClose} disabled={isCopying}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                    Select target tracks. Copied questions will be appended to the end of any existing questions in the target track.
                </p>

                {otherTracks.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg bg-muted/20">
                        No other tracks available in this conference.
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 mb-6">
                        {otherTracks.map((track) => (
                            <div
                                key={track.id}
                                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => handleToggle(track.id)}
                            >
                                <Checkbox
                                    checked={selectedTrackIds.includes(track.id)}
                                    onCheckedChange={() => handleToggle(track.id)}
                                />
                                <div className="grid gap-0.5">
                                    <p className="text-sm font-medium leading-none">{track.name}</p>
                                    {track.description && (
                                        <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                                            {track.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t mt-4">
                    <Button variant="outline" onClick={onClose} disabled={isCopying}>
                        Cancel
                    </Button>
                    <Button
                        disabled={selectedTrackIds.length === 0 || isCopying}
                        onClick={handleCopy}
                    >
                        {isCopying ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Copy className="h-4 w-4 mr-2" />
                        )}
                        Copy to {selectedTrackIds.length} Track(s)
                    </Button>
                </div>
            </div>
        </div>
    )
}
