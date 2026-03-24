"use client"

import { useEffect, useState } from "react"
import { getTracksByConference } from "@/app/api/track.api"
import {
    getTrackReviewSettings,
    updateTrackReviewSettings,
    copyTrackReviewSettings,
} from "@/app/api/track.api"
import type { TrackResponse, TrackReviewSetting } from "@/types/track"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Loader2, Copy, Save } from "lucide-react"
import toast from "react-hot-toast"
import { Select } from "antd"

interface ReviewSettingsProps {
    conferenceId: number
}

const DEFAULT_SETTINGS: TrackReviewSetting = {
    isDoubleBlind: false,
    reviewerInstructions: "",
    allowReviewerQuota: false,
    reviewerInviteExpirationDays: 7,
    allowOthersReviewAccessAfterSubmit: false,
    allowReviewUpdateDuringDiscussion: false,
    showReviewerIdentityToOtherReviewer: false,
    showAggregateColumns: false,
    allowReviewerSeeStatusBeforeNotification: false,
    enableAllPapersForDiscussion: false,
    allowDiscussNonAssignedPapers: false,
    allowAuthorDiscuss: false,
    doNotShowWithdrawnPapers: false,
}

export function ReviewSettings({ conferenceId }: ReviewSettingsProps) {
    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null)
    const [settings, setSettings] = useState<TrackReviewSetting>(DEFAULT_SETTINGS)
    const [loadingTracks, setLoadingTracks] = useState(true)
    const [loadingSettings, setLoadingSettings] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [showCopyDialog, setShowCopyDialog] = useState(false)
    const [targetTrackIds, setTargetTrackIds] = useState<number[]>([])
    const [isCopying, setIsCopying] = useState(false)

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

    useEffect(() => {
        if (!selectedTrackId) return
        const fetchSettings = async () => {
            try {
                setLoadingSettings(true)
                const data = await getTrackReviewSettings(selectedTrackId)
                setSettings(data)
            } catch (err) {
                console.error("Failed to load review settings:", err)
                setSettings(DEFAULT_SETTINGS)
            } finally {
                setLoadingSettings(false)
            }
        }
        fetchSettings()
    }, [selectedTrackId])

    const handleSave = async () => {
        if (!selectedTrackId) return
        setIsSaving(true)
        try {
            const updated = await updateTrackReviewSettings(selectedTrackId, settings)
            setSettings(updated)
            toast.success("Review settings saved successfully!")
        } catch (err) {
            console.error("Failed to save review settings:", err)
            toast.error("Failed to save review settings")
        } finally {
            setIsSaving(false)
        }
    }

    const handleCopyToTracks = async () => {
        if (!selectedTrackId || targetTrackIds.length === 0) return
        setIsCopying(true)
        try {
            for (const targetId of targetTrackIds) {
                await copyTrackReviewSettings(targetId, selectedTrackId)
            }
            setShowCopyDialog(false)
            setTargetTrackIds([])
            toast.success(`Settings copied to ${targetTrackIds.length} track(s) successfully!`)
        } catch (err: any) {
            console.error("Failed to copy settings:", err)
            const status = err?.response?.status
            if (status === 400) {
                toast.error("Current track does not have review settings configured yet. Please save settings first.")
            } else {
                toast.error("Failed to copy settings. Please try again.")
            }
        } finally {
            setIsCopying(false)
        }
    }

    const toggleField = (field: keyof TrackReviewSetting) => {
        setSettings((prev) => ({ ...prev, [field]: !prev[field] }))
    }

    if (loadingTracks) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (tracks.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                    No tracks found. Please create a track first.
                </p>
            </div>
        )
    }

    const SWITCH_FIELDS: { key: keyof TrackReviewSetting; label: string; description: string }[] = [
        {
            key: "isDoubleBlind",
            label: "Double-Blind Review",
            description: "Hide author identities from reviewers and vice versa.",
        },
        {
            key: "allowReviewerQuota",
            label: "Allow Reviewer Quota",
            description: "Allow setting a quota limit on the number of papers assigned per reviewer.",
        },
        {
            key: "allowOthersReviewAccessAfterSubmit",
            label: "Allow Others Review Access After Submit",
            description: "Reviewers can see other reviews after submitting their own.",
        },
        {
            key: "allowReviewUpdateDuringDiscussion",
            label: "Allow Review Update During Discussion",
            description: "Reviewers can update their review during the discussion phase.",
        },
        {
            key: "showReviewerIdentityToOtherReviewer",
            label: "Show Reviewer Identity to Other Reviewers",
            description: "Reviewers can see the names of other reviewers in discussion.",
        },
        {
            key: "showAggregateColumns",
            label: "Show Aggregate Columns",
            description: "Display average score columns on the Chair Console.",
        },
        {
            key: "allowReviewerSeeStatusBeforeNotification",
            label: "Allow Reviewer See Status Before Notification",
            description: "Reviewers can see paper status before Author Notification is sent.",
        },
        {
            key: "enableAllPapersForDiscussion",
            label: "Enable All Papers for Discussion",
            description: "Automatically enable discussion for all papers when Discussion activity is enabled.",
        },
        {
            key: "allowDiscussNonAssignedPapers",
            label: "Allow Discuss Non-Assigned Papers",
            description: "Reviewers can discuss papers they are not assigned to (if no conflict).",
        },
        {
            key: "allowAuthorDiscuss",
            label: "Allow Author Discuss",
            description: "Authors can participate in discussion (only after PC posts first).",
        },
        {
            key: "doNotShowWithdrawnPapers",
            label: "Do Not Show Withdrawn Papers",
            description: "Hide withdrawn papers from the Reviewer Console.",
        },
    ]

    return (
        <div className="space-y-8">
            {/* Track Selector */}
            <div>
                <h3 className="text-lg font-semibold mb-3">Select Track</h3>
                <Select
                    className="w-full h-12"
                    placeholder="Select a track"
                    value={selectedTrackId ?? undefined}
                    onChange={(val) => setSelectedTrackId(val)}
                    options={tracks.map((t) => ({ label: t.name, value: t.id }))}
                />
            </div>

            {loadingSettings ? (
                <div className="flex items-center justify-center min-h-[200px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Boolean Switches */}
                    <div className="space-y-6">
                        {SWITCH_FIELDS.map(({ key, label, description }) => (
                            <div
                                key={key}
                                className="flex items-center justify-between rounded-lg border p-4"
                            >
                                <div className="space-y-0.5 pr-4">
                                    <p className="text-sm font-semibold">{label}</p>
                                    <p className="text-sm text-muted-foreground">{description}</p>
                                </div>
                                <Switch
                                    checked={settings[key] as boolean}
                                    onCheckedChange={() => toggleField(key)}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Reviewer Invite Expiration Days */}
                    <div>
                        <label className="text-sm font-semibold block mb-2">
                            Reviewer Invite Expiration (days)
                        </label>
                        <Input
                            type="number"
                            className="h-12 text-base max-w-xs"
                            min={1}
                            value={settings.reviewerInviteExpirationDays ?? 0}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    reviewerInviteExpirationDays: Number(e.target.value),
                                }))
                            }
                        />
                    </div>

                    {/* Reviewer Instructions */}
                    <div>
                        <label className="text-sm font-semibold block mb-2">
                            Reviewer Instructions
                        </label>
                        <Textarea
                            className="min-h-[150px] text-base"
                            placeholder="Provide detailed instructions for reviewers..."
                            value={settings.reviewerInstructions ?? ""}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    reviewerInstructions: e.target.value,
                                }))
                            }
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t py-4 -mx-8 px-8 md:-mx-12 md:px-12 flex items-center gap-4">
                        <Button onClick={handleSave} disabled={isSaving} size="lg" className="text-base px-6">
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="text-base px-6"
                            onClick={() => setShowCopyDialog(true)}
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Settings To Other Tracks
                        </Button>
                    </div>

                    {/* Copy To Dialog */}
                    {showCopyDialog && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                            <div className="bg-background rounded-xl border shadow-2xl p-6 w-full max-w-md mx-4">
                                <h4 className="text-lg font-semibold mb-2">Copy Settings To Other Tracks</h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Select the tracks you want to copy the current track&apos;s review settings to.
                                </p>
                                <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
                                    {tracks
                                        .filter((t) => t.id !== selectedTrackId)
                                        .map((t) => (
                                            <label
                                                key={t.id}
                                                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300"
                                                    checked={targetTrackIds.includes(t.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setTargetTrackIds((prev) => [...prev, t.id])
                                                        } else {
                                                            setTargetTrackIds((prev) => prev.filter((id) => id !== t.id))
                                                        }
                                                    }}
                                                />
                                                <span className="text-sm font-medium">{t.name}</span>
                                            </label>
                                        ))}
                                    {tracks.filter((t) => t.id !== selectedTrackId).length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4">No other tracks available.</p>
                                    )}
                                </div>
                                <div className="flex items-center justify-end gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowCopyDialog(false)
                                            setTargetTrackIds([])
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        disabled={targetTrackIds.length === 0 || isCopying}
                                        onClick={handleCopyToTracks}
                                    >
                                        {isCopying ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Copy className="h-4 w-4 mr-2" />
                                        )}
                                        Copy to {targetTrackIds.length} Track{targetTrackIds.length !== 1 ? "s" : ""}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
