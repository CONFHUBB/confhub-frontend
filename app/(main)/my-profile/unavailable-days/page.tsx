'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUserRoles } from '@/hooks/useUserConferenceRoles'
import {
    getUnavailableDays,
    addUnavailableDay,
    deleteUnavailableDay,
    updateUnavailableDay,
    type UnavailableDayResponse,
} from '@/app/api/unavailable-day.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Loader2, Plus, Trash2, CalendarOff, CalendarDays, Info, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'

export default function UnavailableDaysPage() {
    const { userId } = useUserRoles()
    const [days, setDays] = useState<UnavailableDayResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)

    // Form state — shared between Add and Edit
    const [editingId, setEditingId] = useState<number | null>(null)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [reason, setReason] = useState('')

    const isEditing = editingId !== null

    const fetchDays = useCallback(async () => {
        if (!userId) return
        try {
            setLoading(true)
            const data = await getUnavailableDays(userId)
            setDays(data)
        } catch (err) {
            console.error('Failed to fetch unavailable days:', err)
        } finally {
            setLoading(false)
        }
    }, [userId])

    useEffect(() => {
        fetchDays()
    }, [fetchDays])

    const resetForm = () => {
        setEditingId(null)
        setStartDate('')
        setEndDate('')
        setReason('')
    }

    const openAddDialog = () => {
        resetForm()
        setDialogOpen(true)
    }

    const openEditDialog = (day: UnavailableDayResponse) => {
        setEditingId(day.id)
        setStartDate(day.startDate)
        setEndDate(day.endDate)
        setReason(day.reason || '')
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!userId || !startDate || !endDate) {
            toast.error('Please fill in both start and end dates')
            return
        }
        if (new Date(endDate) < new Date(startDate)) {
            toast.error('End date must be on or after start date')
            return
        }

        try {
            setSaving(true)
            const payload = {
                startDate,
                endDate,
                reason: reason.trim() || undefined,
            }

            if (isEditing) {
                await updateUnavailableDay(userId, editingId!, payload)
                toast.success('Unavailable period updated')
            } else {
                await addUnavailableDay(userId, payload)
                toast.success('Unavailable period added')
            }

            resetForm()
            setDialogOpen(false)
            fetchDays()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || `Failed to ${isEditing ? 'update' : 'add'} unavailable period`)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!userId) return
        try {
            await deleteUnavailableDay(userId, id)
            toast.success('Unavailable period removed')
            fetchDays()
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to remove unavailable period')
        }
    }

    const isCurrentlyActive = (start: string, end: string) => {
        const today = new Date().toISOString().split('T')[0]
        return start <= today && end >= today
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <CalendarOff className="h-6 w-6 text-red-500" />
                        Unavailable Days
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Mark the periods when you are unavailable. Conference chairs will not be able to invite you during these dates.
                    </p>
                </div>

                <Button className="gap-2 shrink-0" onClick={openAddDialog}>
                    <Plus className="h-4 w-4" />
                    Add Period
                </Button>
            </div>

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-primary" />
                            {isEditing ? 'Edit Unavailable Period' : 'Add Unavailable Period'}
                        </DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? 'Update the date range and reason for this unavailable period.'
                                : 'You will not receive conference role invitations during this period.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">Start Date</Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-date">End Date</Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason (optional)</Label>
                            <Textarea
                                id="reason"
                                placeholder="e.g., On vacation, Personal leave, Busy with other commitments..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving || !startDate || !endDate}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {isEditing ? 'Save Changes' : 'Add Period'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
                <Info className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="text-sm">
                    <p className="font-semibold">How it works</p>
                    <p className="mt-0.5 text-blue-700">
                        When a conference chair tries to invite you as a member (Reviewer, Program Chair, etc.) and today's date falls within one of your unavailable periods, 
                        the system will block the invitation and notify the chair that you are unavailable.
                    </p>
                </div>
            </div>

            {/* Table */}
            {days.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
                    <CalendarDays className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">No unavailable periods</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        You are currently available for conference invitations at all times.
                    </p>
                    <Button
                        variant="outline"
                        className="mt-4 gap-2"
                        onClick={openAddDialog}
                    >
                        <Plus className="h-4 w-4" />
                        Add your first period
                    </Button>
                </div>
            ) : (
                <div className="rounded-xl border overflow-hidden bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-12 text-center">#</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead className="w-28 text-center">Status</TableHead>
                                <TableHead className="w-24 text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {days.map((day, idx) => {
                                const active = isCurrentlyActive(day.startDate, day.endDate)
                                const isPast = new Date(day.endDate + 'T23:59:59') < new Date()
                                return (
                                    <TableRow key={day.id} className={active ? 'bg-red-50/50' : ''}>
                                        <TableCell className="text-center text-xs text-muted-foreground font-medium">
                                            {idx + 1}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className={`h-4 w-4 shrink-0 ${active ? 'text-red-500' : 'text-muted-foreground'}`} />
                                                <span className={`text-sm font-medium ${isPast ? 'text-muted-foreground line-through' : ''}`}>
                                                    {formatDate(day.startDate)} — {formatDate(day.endDate)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {day.reason || '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {active ? (
                                                <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] font-bold">
                                                    ACTIVE
                                                </Badge>
                                            ) : isPast ? (
                                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                    PAST
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold">
                                                    UPCOMING
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Edit button */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                    onClick={() => openEditDialog(day)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                {/* Delete button */}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete unavailable period?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will remove the unavailable period from {formatDate(day.startDate)} to {formatDate(day.endDate)}.
                                                                You will become available for invitations during this time.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="bg-red-600 hover:bg-red-700"
                                                                onClick={() => handleDelete(day.id)}
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
