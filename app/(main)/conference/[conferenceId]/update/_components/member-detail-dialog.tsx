"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Globe,
    Mail,
    Calendar,
    User as UserIcon,
    Settings2,
} from "lucide-react"
import type { MemberWithRoles, ConferenceUserTrack } from "@/types/user"
import type { TrackResponse } from "@/types/track"
import { UserLink } from '@/components/shared/user-link'
import { fmtDate } from '@/lib/utils'

const ROLE_DISPLAY: Record<string, string> = {
    CONFERENCE_CHAIR: "Conference Chair",
    PROGRAM_CHAIR: "Program Chair",
    REVIEWER: "Reviewer",
    AUTHOR: "Author",
    ATTENDEE: "Attendee",
}

const ROLE_COLORS: Record<string, string> = {
    CONFERENCE_CHAIR: "bg-violet-500/15 text-violet-700 border-violet-500/25 dark:text-violet-400",
    PROGRAM_CHAIR: "bg-sky-500/15 text-sky-700 border-sky-500/25 dark:text-sky-400",
    REVIEWER: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
    AUTHOR: "bg-amber-500/15 text-amber-700 border-amber-500/25 dark:text-amber-400",
    ATTENDEE: "bg-gray-500/15 text-gray-700 border-gray-500/25 dark:text-gray-400",
}

interface MemberDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    member: MemberWithRoles | null
    tracks: TrackResponse[]
    formatRoles: (roles: ConferenceUserTrack[]) => Map<string, string[]>
    getAcceptanceStatus: (roles: ConferenceUserTrack[]) => string
    onManageRoles: () => void
}

export function MemberDetailDialog({
    open,
    onOpenChange,
    member,
    tracks,
    formatRoles,
    getAcceptanceStatus,
    onManageRoles,
}: MemberDetailDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-primary" />
                        Member Details
                    </DialogTitle>
                    <DialogDescription>
                        Detailed information about this conference member.
                    </DialogDescription>
                </DialogHeader>
                {member && (
                    <div className="space-y-5 py-2">
                        {/* User Info */}
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-lg font-bold text-primary">
                                {(member.user.fullName ?? "?")[0]?.toUpperCase()}
                            </div>
                            <div>
                                <UserLink userId={member.user.id} name={member.user.fullName ?? ''} className="font-semibold text-base" />
                                <p className="text-sm text-muted-foreground">{member.user.email}</p>
                            </div>
                        </div>

                        {/* Detail Info */}
                        <div className="rounded-lg border bg-muted/20 divide-y">
                            {member.user.country && (
                                <div className="flex items-center gap-3 px-4 py-2.5">
                                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Country</p>
                                        <p className="text-sm font-medium">{member.user.country}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-3 px-4 py-2.5">
                                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Joined Conference</p>
                                    <p className="text-sm font-medium">
                                        {member.roles[0]?.createdAt
                                            ? fmtDate(member.roles[0].createdAt)
                                            : 'N/A'
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-2.5">
                                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Invitation Status</p>
                                    <p className="text-sm font-medium">
                                        {(() => {
                                            const s = getAcceptanceStatus(member.roles)
                                            if (s === 'accepted') return '✅ Accepted'
                                            if (s === 'declined') return '❌ Declined'
                                            return '⏳ Pending'
                                        })()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Roles Breakdown */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Assigned Roles</h4>
                            <div className="space-y-2">
                                {[...formatRoles(member.roles).entries()].map(([role, trackNames]) => (
                                    <div key={role} className="rounded-lg border p-3">
                                        <Badge
                                            variant="outline"
                                            className={`text-xs font-semibold ${ROLE_COLORS[role] ?? ""}`}
                                        >
                                            {ROLE_DISPLAY[role] ?? role}
                                        </Badge>
                                        {trackNames.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {trackNames.map((tn) => (
                                                    <span key={tn} className="text-xs bg-muted px-2 py-0.5 rounded-md">
                                                        {tn}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Activity History */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Activity History</h4>
                            <div className="rounded-lg border bg-muted/10 divide-y">
                                {member.roles
                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                    .map((role) => (
                                        <div key={role.id} className="px-4 py-2.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${role.isAccepted === true ? 'bg-green-500'
                                                        : role.isAccepted === false ? 'bg-red-500'
                                                            : 'bg-amber-500'
                                                    }`} />
                                                <span className="text-sm font-medium">
                                                    {ROLE_DISPLAY[role.assignedRole] ?? role.assignedRole}
                                                </span>
                                                {role.conferenceTrackId && (
                                                    <span className="text-xs text-muted-foreground">
                                                        — {tracks.find(t => t.id === role.conferenceTrackId)?.name ?? `Track #${role.conferenceTrackId}`}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-muted-foreground">
                                                {fmtDate(role.createdAt)}
                                            </span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    {member && (
                        <Button onClick={onManageRoles}>
                            <Settings2 className="h-4 w-4 mr-1.5" />
                            Manage Roles
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
