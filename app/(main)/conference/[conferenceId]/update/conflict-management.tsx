"use client"

import { useEffect, useState } from "react"
import { getConflictsByConference, createPaperConflict, deletePaperConflict } from "@/app/api/conflict.api"
import { getPapersByConference } from "@/app/api/paper.api"
import { getConferenceUsersWithRoles } from "@/app/api/conference-user-track.api"
import { getTracksByConference, getTrackReviewSettings, updateTrackReviewSettings } from "@/app/api/track.api"
import type { PaperConflictResponse, ConflictType } from "@/types/conflict"
import { CONFLICT_TYPE_LABELS } from "@/types/conflict"
import type { TrackResponse } from "@/types/track"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Loader2, Plus, Trash2, AlertTriangle, Shield, Lock, Globe, UserX, Settings2, ChevronLeft, ChevronRight, Search, Filter, Download } from "lucide-react"
import { Select } from "antd"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FilterPanel } from "@/components/ui/filter-panel"
import { toast } from 'sonner'

interface ConflictManagementProps {
    conferenceId: number
}

interface PaperOption {
    id: number
    title: string
}

interface UserOption {
    id: number
    name: string
    email: string
}

interface ConflictSettings {
    enableDomainConflict: boolean
    enableAuthorSelfConflict: boolean
    allowAuthorConfigureConflict: boolean
}

export function ConflictManagement({ conferenceId }: ConflictManagementProps) {
    const [conflicts, setConflicts] = useState<PaperConflictResponse[]>([])
    const [papers, setPapers] = useState<PaperOption[]>([])
    const [users, setUsers] = useState<UserOption[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [savingSettings, setSavingSettings] = useState(false)

    // Track + settings state
    const [tracks, setTracks] = useState<TrackResponse[]>([])
    const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null)
    const [settings, setSettings] = useState<ConflictSettings>({
        enableDomainConflict: true,
        enableAuthorSelfConflict: true,
        allowAuthorConfigureConflict: false,
    })

    // Form state
    const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null)
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
    const [selectedConflictType, setSelectedConflictType] = useState<ConflictType>("PERSONAL")
    const [currentPage, setCurrentPage] = useState(0)
    const [conflictSearch, setConflictSearch] = useState("")
    const [conflictTypeFilter, setConflictTypeFilter] = useState("all")
    const PAGE_SIZE = 10

    const fetchAll = async () => {
        try {
            setLoading(true)
            const [conflictsData, papersData, usersData, tracksData] = await Promise.all([
                getConflictsByConference(conferenceId),
                getPapersByConference(conferenceId),
                getConferenceUsersWithRoles(conferenceId, 0, 100),
                getTracksByConference(conferenceId),
            ])
            setConflicts(conflictsData)
            setPapers(papersData.map((p: any) => ({ id: p.id, title: p.title })))
            setTracks(tracksData)

            // Load settings from first track
            if (tracksData.length > 0) {
                const firstTrackId = tracksData[0].id
                setSelectedTrackId(firstTrackId)
                try {
                    const trackSettings = await getTrackReviewSettings(firstTrackId)
                    setSettings({
                        enableDomainConflict: trackSettings.enableDomainConflict ?? true,
                        enableAuthorSelfConflict: trackSettings.enableAuthorSelfConflict ?? true,
                        allowAuthorConfigureConflict: trackSettings.allowAuthorConfigureConflict ?? false,
                    })
                } catch {
                    // Use defaults if settings don't exist yet
                }
            }

            // Extract unique users
            const userMap = new Map<number, UserOption>()
            const usersContent = usersData.content || usersData
            if (Array.isArray(usersContent)) {
                usersContent.forEach((cut: any) => {
                    const u = cut.user || cut
                    if (u && u.id) {
                        userMap.set(u.id, {
                            id: u.id,
                            name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
                            email: u.email,
                        })
                    }
                })
            }
            setUsers(Array.from(userMap.values()))
        } catch (err) {
            console.error("Failed to load conflict data:", err)
            toast.error("Failed to load conflict data")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAll()
    }, [conferenceId])

    const handleTrackChange = async (trackId: number) => {
        setSelectedTrackId(trackId)
        try {
            const trackSettings = await getTrackReviewSettings(trackId)
            setSettings({
                enableDomainConflict: trackSettings.enableDomainConflict ?? true,
                enableAuthorSelfConflict: trackSettings.enableAuthorSelfConflict ?? true,
                allowAuthorConfigureConflict: trackSettings.allowAuthorConfigureConflict ?? false,
            })
        } catch {
            setSettings({
                enableDomainConflict: true,
                enableAuthorSelfConflict: true,
                allowAuthorConfigureConflict: false,
            })
        }
    }

    const handleSaveSettings = async () => {
        if (!selectedTrackId) return
        setSavingSettings(true)
        try {
            await updateTrackReviewSettings(selectedTrackId, settings)
            toast.success("Conflict settings saved!")
        } catch (err) {
            console.error("Failed to save settings:", err)
            toast.error("Failed to save settings")
        } finally {
            setSavingSettings(false)
        }
    }

    const handleAdd = async () => {
        if (!selectedPaperId || !selectedUserId) {
            toast.error("Please select both a paper and a user")
            return
        }

        const exists = conflicts.some(
            (c) => c.paper?.id === selectedPaperId && c.user?.id === selectedUserId
        )
        if (exists) {
            toast.error("This conflict already exists")
            return
        }

        setIsAdding(true)
        try {
            await createPaperConflict({
                paperId: selectedPaperId,
                userId: selectedUserId,
                conflictType: selectedConflictType,
            })
            toast.success("Conflict added successfully")
            setSelectedPaperId(null)
            setSelectedUserId(null)
            setShowAddForm(false)
            await fetchAll()
        } catch (err) {
            console.error("Failed to add conflict:", err)
            toast.error("Failed to add conflict")
        } finally {
            setIsAdding(false)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await deletePaperConflict(id)
            toast.success("Conflict removed")
            setConflicts((prev) => prev.filter((c) => c.id !== id))
        } catch (err) {
            console.error("Failed to delete conflict:", err)
            toast.error("Failed to delete conflict")
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const conflictTypeOptions = Object.entries(CONFLICT_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
    }))

    // Filtered conflicts for search/filter toolbar
    const filteredConflicts = conflicts.filter(c => {
        if (conflictTypeFilter !== 'all' && c.conflictType !== conflictTypeFilter) return false
        if (conflictSearch.trim()) {
            const q = conflictSearch.toLowerCase()
            const paperMatch = c.paper?.title?.toLowerCase().includes(q)
            const userMatch = c.user?.email?.toLowerCase().includes(q) ||
                `${c.user?.firstName} ${c.user?.lastName}`.toLowerCase().includes(q)
            if (!paperMatch && !userMatch) return false
        }
        return true
    })
    const conflictsTotalPages = Math.max(1, Math.ceil(filteredConflicts.length / PAGE_SIZE))
    const paginatedConflicts = filteredConflicts.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

    // Derived state
    const activeFilterCount = conflictTypeFilter !== 'all' ? 1 : 0

    return (
        <div className="space-y-6">
            {/* Conflict Settings */}
            <div className="rounded-lg border p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-violet-600" />
                        <h3 className="text-lg font-bold">Conflict Detection Settings</h3>
                    </div>
                    {tracks.length > 1 && (
                        <Select
                            className="w-48"
                            value={selectedTrackId ?? undefined}
                            onChange={handleTrackChange}
                            options={tracks.map((t) => ({ value: t.id, label: t.name }))}
                        />
                    )}
                </div>

                <div className="space-y-4">
                    {/* Author Self-Review Block — always on, locked */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border">
                        <div className="flex items-center gap-3">
                            <UserX className="h-5 w-5 text-red-500" />
                            <div>
                                <p className="font-medium text-sm flex items-center gap-1.5">
                                    Author Self-Review Block
                                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Authors cannot review or bid on their own papers. This is always enforced.
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={true}
                            disabled={true}
                            aria-label="Author self-review block (always on)"
                        />
                    </div>

                    {/* Domain Conflict Detection — toggleable */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border">
                        <div className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-indigo-500" />
                            <div>
                                <p className="font-medium text-sm">Domain Conflict Detection</p>
                                <p className="text-xs text-muted-foreground">
                                    Auto-detect conflicts when reviewer and author share the same institutional email domain.
                                    Turn off for internal conferences.
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={settings.enableDomainConflict}
                            onCheckedChange={(checked) =>
                                setSettings((prev) => ({ ...prev, enableDomainConflict: checked }))
                            }
                            aria-label="Toggle domain conflict detection"
                        />
                    </div>

                    {/* Allow Author Self-Config */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border">
                        <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-amber-500" />
                            <div>
                                <p className="font-medium text-sm">Allow Author to Declare Conflicts</p>
                                <p className="text-xs text-muted-foreground">
                                    Let authors declare their own conflicts of interest with reviewers when submitting papers.
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={settings.allowAuthorConfigureConflict}
                            onCheckedChange={(checked) =>
                                setSettings((prev) => ({ ...prev, allowAuthorConfigureConflict: checked }))
                            }
                            aria-label="Toggle author conflict declaration"
                        />
                    </div>
                </div>

                <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t py-4 -mx-8 px-8 md:-mx-12 md:px-12 flex justify-end">
                    <Button onClick={handleSaveSettings} disabled={savingSettings} size="sm">
                        {savingSettings ? (
                            <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving...</>
                        ) : (
                            "Save Settings"
                        )}
                    </Button>
                </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Manual Conflicts
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manually block specific reviewer–paper pairs. Select a conflict type for each entry.
                    </p>
                </div>
                <Button onClick={() => setShowAddForm(!showAddForm)} size="lg" className="text-base">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Conflict
                </Button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="rounded-lg border p-6 bg-muted/5 space-y-4">
                    <h3 className="text-base font-semibold">Add New Conflict</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium block mb-1.5">Paper</label>
                            <Select
                                className="w-full h-10"
                                placeholder="Select paper..."
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                                }
                                value={selectedPaperId ?? undefined}
                                onChange={(val) => setSelectedPaperId(val)}
                                options={papers.map((p) => ({
                                    value: p.id,
                                    label: `#${p.id} - ${p.title}`,
                                }))}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium block mb-1.5">Reviewer / User</label>
                            <Select
                                className="w-full h-10"
                                placeholder="Select user..."
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                                }
                                value={selectedUserId ?? undefined}
                                onChange={(val) => setSelectedUserId(val)}
                                options={users.map((u) => ({
                                    value: u.id,
                                    label: `${u.name} (${u.email})`,
                                }))}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium block mb-1.5">Conflict Type</label>
                            <Select
                                className="w-full h-10"
                                value={selectedConflictType}
                                onChange={(val) => setSelectedConflictType(val as ConflictType)}
                                options={conflictTypeOptions}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <Button onClick={handleAdd} disabled={isAdding || !selectedPaperId || !selectedUserId}>
                            {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Add Conflict
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddForm(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Conflicts List */}
            {conflicts.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/5">
                    <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-lg">No manual conflicts configured yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Add conflicts to prevent reviewers from being assigned to papers they have a conflict with.
                    </p>
                </div>
            ) : (
                <>
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by paper title or user email..."
                            className="pl-9 h-9 text-sm"
                            value={conflictSearch}
                            onChange={(e) => { setConflictSearch(e.target.value); setCurrentPage(0) }}
                        />
                    </div>
                    <FilterPanel
                        groups={[
                            {
                                label: 'Conflict Type',
                                type: 'radio',
                                options: [
                                    { value: 'all', label: 'All Types' },
                                    ...Object.entries(CONFLICT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v })),
                                ],
                                value: conflictTypeFilter,
                                onChange: (v) => { setConflictTypeFilter(v); setCurrentPage(0) },
                            },
                        ]}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs h-9"
                        disabled={conflicts.length === 0}
                        onClick={() => {
                            const headers = ['Paper ID', 'Paper Title', 'User', 'Email', 'Type']
                            const rows = conflicts.map(c => [
                                c.paper?.id, `"${c.paper?.title ?? ''}"`,
                                `"${c.user?.firstName ?? ''} ${c.user?.lastName ?? ''}"`,
                                c.user?.email, c.conflictType,
                            ])
                            const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
                            const blob = new Blob([csv], { type: 'text/csv' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url; a.download = `conflicts-conf-${conferenceId}.csv`; a.click()
                            URL.revokeObjectURL(url)
                        }}
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export CSV
                    </Button>
                </div>
                <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead className="min-w-[180px] max-w-[260px]">Paper</TableHead>
                                <TableHead className="min-w-[140px]">User</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedConflicts.map((conflict, idx) => (
                                <TableRow key={conflict.id}>
                                    <TableCell className="text-muted-foreground text-xs font-medium">{currentPage * PAGE_SIZE + idx + 1}</TableCell>
                                    <TableCell className="max-w-[260px]">
                                        <p className="font-medium text-xs truncate" title={`#${conflict.paper?.id} ${conflict.paper?.title}`}>#{conflict.paper?.id} {conflict.paper?.title}</p>
                                    </TableCell>
                                    <TableCell className="max-w-[160px]">
                                        <p className="font-medium text-sm truncate" title={`${conflict.user?.firstName} ${conflict.user?.lastName}`}>{conflict.user?.firstName} {conflict.user?.lastName}</p>
                                        <p className="text-muted-foreground text-xs truncate" title={conflict.user?.email}>{conflict.user?.email}</p>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                                            {CONFLICT_TYPE_LABELS[conflict.conflictType] || conflict.conflictType}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDelete(conflict.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                </div>
                {conflictsTotalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                        <div className="text-sm text-muted-foreground">
                            Page {currentPage + 1} of {conflictsTotalPages} · {filteredConflicts.length} conflicts
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            <Button variant="outline" size="sm" disabled={currentPage >= conflictsTotalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
                </>
            )}

            {/* Summary */}
            <div className="text-xs text-muted-foreground border-t pt-4">
                Total conflicts: <strong>{conflicts.length}</strong> |
                Papers involved: <strong>{new Set(conflicts.map((c) => c.paper?.id)).size}</strong> |
                Users involved: <strong>{new Set(conflicts.map((c) => c.user?.id)).size}</strong>
            </div>
        </div>
    )
}
