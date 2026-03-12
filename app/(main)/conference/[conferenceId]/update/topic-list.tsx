"use client"

import { useEffect, useState } from "react"
import { getTopicsByTrack } from "@/app/api/track.api"
import type { TopicResponse } from "@/types/topic"
import { Loader2, BookOpen } from "lucide-react"

interface TopicListProps {
    trackId: number
    refreshKey: number
}

export function TopicList({ trackId, refreshKey }: TopicListProps) {
    const [topics, setTopics] = useState<TopicResponse[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTopics = async () => {
            if (!trackId) return
            try {
                setLoading(true)
                const data = await getTopicsByTrack(trackId)
                setTopics(data || [])
            } catch (err) {
                console.error("Failed to load topics:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchTopics()
    }, [trackId, refreshKey])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        )
    }

    if (topics.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center bg-muted/10">
                <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground italic text-sm">No topics created for this track yet.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h3 className="text-base font-semibold ">Existing Topics ({topics.length})</h3>
            <div className="rounded-lg border divide-y overflow-hidden bg-background">
                {topics.map((topic, index) => (
                    <div key={topic.id} className="flex flex-col px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">{index + 1}</span>
                            <p className="font-medium text-sm">{topic.title}</p>
                        </div>
                        {topic.description && (
                            <p className="text-xs text-muted-foreground mt-1 ml-9">
                                {topic.description}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
