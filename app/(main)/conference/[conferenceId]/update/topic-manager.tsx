"use client"

import { useEffect, useState } from "react"
import { getTracksByConference, getTopicsByTrack } from "@/app/api/track.api"
import { createTopic, updateTopic, deleteTopic } from "@/app/api/topic.api"
import type { TrackResponse } from "@/types/track"
import type { TopicResponse } from "@/types/topic"
import type { TopicData } from "@/types/conference-form"
import { Select } from "antd"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { AddTopic } from "./add-topic"
import { TopicList } from "./topic-list"

interface TopicManagerProps {
    conferenceId: number
}

export function TopicManager({ conferenceId }: TopicManagerProps) {
    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null)
    const [topics, setTopics] = useState<TopicResponse[]>([])
    
    const [loadingTracks, setLoadingTracks] = useState(true)
    const [loadingTopics, setLoadingTopics] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [topicRefreshKey, setTopicRefreshKey] = useState(0)

    useEffect(() => {
        const fetchTracks = async () => {
            try {
                setLoadingTracks(true)
                const data = await getTracksByConference(conferenceId)
                setTracks(data)
                if (data.length > 0) {
                    setSelectedTrackId(data[0].id)
                }
            } catch (err) {
                console.error("Failed to load tracks:", err)
                toast.error("Failed to load tracks")
            } finally {
                setLoadingTracks(false)
            }
        }
        fetchTracks()
    }, [conferenceId])

    const fetchTopics = async (trackId: number) => {
        try {
            setLoadingTopics(true)
            const data = await getTopicsByTrack(trackId)
            setTopics(data || [])
        } catch (err) {
            console.error("Failed to load topics:", err)
            toast.error("Failed to load topics")
            setTopics([])
        } finally {
            setLoadingTopics(false)
        }
    }

    useEffect(() => {
        if (!selectedTrackId) return
        fetchTopics(selectedTrackId)
    }, [selectedTrackId])

    const handleSaveTopics = async (submittedTopics: TopicData[]) => {
        if (!selectedTrackId) return
        setIsSaving(true)
        
        try {
            // submittedTopics is the full list from AddTopic
            // Find which ones to create/update
            const updates = []
            const creates = []
            
            for (const t of submittedTopics) {
                // If ID is negative, it's a new topic we created on the frontend
                if (t.id < 0) {
                    creates.push(createTopic({ trackId: selectedTrackId, title: t.title, description: t.description || "" }))
                } else {
                    // It's an existing topic
                    updates.push(updateTopic({ id: t.id, trackId: selectedTrackId, title: t.title, description: t.description || "" }))
                }
            }
            
            // Find which ones to delete
            const deletes = []
            for (const existingTopic of topics) {
                const stillExists = submittedTopics.find(t => t.id === existingTopic.id)
                if (!stillExists) {
                    deletes.push(deleteTopic(existingTopic.id))
                }
            }
            
            await Promise.all([...updates, ...creates, ...deletes])
            toast.success("Topics saved successfully!")
            
            // Refresh to get actual full objects from backend and update list
            setTopicRefreshKey(prev => prev + 1)
            await fetchTopics(selectedTrackId)
        } catch (err) {
            console.error("Failed to save topics:", err)
            toast.error("Failed to save some topics. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    if (loadingTracks) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (tracks.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
                <p className="text-muted-foreground text-lg mb-2">No tracks found.</p>
                <p className="text-sm text-muted-foreground">Please add a track in 'Config Tracks' first.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 relative">
            {/* Header / Track Selector */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
                <div className="flex-1 max-w-sm">
                    <h3 className="text-sm font-semibold mb-2">Select Track</h3>
                    <Select
                        className="w-full h-10"
                        placeholder="Select a track"
                        value={selectedTrackId ?? undefined}
                        onChange={(val) => setSelectedTrackId(val)}
                        options={tracks.map((t) => ({ label: t.name, value: t.id }))}
                    />
                </div>
            </div>

            {/* Main Content */}
            {loadingTopics ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="relative">
                    {/* Dim the form if it is saving */}
                    {isSaving && (
                        <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center rounded-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    
                    {/* Main Management Section */}
                    {selectedTrackId && (
                        <div className="space-y-12">
                            {/* 1. Existing Topics List (Display) */}
                            <TopicList trackId={selectedTrackId} refreshKey={topicRefreshKey} />
                            
                            {/* 2. Management Form (Edit/Add/Delete) */}
                            <div className="border-t pt-8">
                                <h3 className="text-lg font-semibold mb-4 text-foreground/80">Manage Track Topics</h3>
                                <AddTopic 
                                    key={`track-${selectedTrackId}-${topicRefreshKey}-${topics.length}`}
                                    initialTopics={(topics || []).map(t => ({ id: t.id, title: t.title, description: t.description }))} 
                                    onSubmit={handleSaveTopics} 
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
