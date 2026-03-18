"use client"

import { useEffect, useState } from "react"
import { getConflictsByConference, createPaperConflict, deletePaperConflict } from "@/app/api/conflict.api"
import { getPapersByConference } from "@/app/api/paper.api"
import { getConferenceUsersWithRoles } from "@/app/api/conference-user-track.api"
import type { PaperConflictResponse, ConflictType } from "@/types/conflict"
import { CONFLICT_TYPE_LABELS } from "@/types/conflict"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, Trash2, AlertTriangle, Shield } from "lucide-react"
import { Select } from "antd"
import toast from "react-hot-toast"

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

export function ConflictManagement({ conferenceId }: ConflictManagementProps) {
    const [conflicts, setConflicts] = useState<PaperConflictResponse[]>([])
    const [papers, setPapers] = useState<PaperOption[]>([])
    const [users, setUsers] = useState<UserOption[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)

    // Form state
    const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null)
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
    const [selectedConflictType, setSelectedConflictType] = useState<ConflictType>("PERSONAL")

    const fetchAll = async () => {
        try {
            setLoading(true)
            const [conflictsData, papersData, usersData] = await Promise.all([
                getConflictsByConference(conferenceId),
                getPapersByConference(conferenceId),
                getConferenceUsersWithRoles(conferenceId, 0, 100),
            ])
            setConflicts(conflictsData)
            setPapers(papersData.map((p: any) => ({ id: p.id, title: p.title })))

            // Extract unique users from conference user tracks
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

    const handleAdd = async () => {
        if (!selectedPaperId || !selectedUserId) {
            toast.error("Please select both a paper and a user")
            return
        }

        // Check duplicate
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Conflict Management
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage conflicts of interest between papers and reviewers.
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
                    <p className="text-muted-foreground text-lg">No conflicts configured yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Add conflicts to prevent reviewers from being assigned to papers they have a conflict with.
                    </p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold">Paper</th>
                                <th className="text-left px-4 py-3 font-semibold">User</th>
                                <th className="text-left px-4 py-3 font-semibold">Type</th>
                                <th className="text-right px-4 py-3 font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {conflicts.map((conflict) => (
                                <tr key={conflict.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-medium">#{conflict.paper?.id}</span>{" "}
                                        <span className="text-muted-foreground">{conflict.paper?.title}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <span className="font-medium">
                                                {conflict.user?.firstName} {conflict.user?.lastName}
                                            </span>
                                            <span className="text-muted-foreground text-xs block">
                                                {conflict.user?.email}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                                            {CONFLICT_TYPE_LABELS[conflict.conflictType] || conflict.conflictType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDelete(conflict.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
