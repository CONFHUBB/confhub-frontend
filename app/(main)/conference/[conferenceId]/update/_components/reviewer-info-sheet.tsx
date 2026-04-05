"use client"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Loader2, AlertTriangle, User2, Building2, Phone, GraduationCap } from "lucide-react"
import type { UserProfile } from "@/types/user"
import type { AssignmentPreviewItem } from "@/app/api/assignment.api"
import type { PaperResponse } from "@/types/paper"

interface SimpleReviewer {
    id: number
    name: string
    email: string
    quota: number | null
    trackIds: number[]
}

interface ReviewerInfoSheetProps {
    reviewerInfoId: number | null
    reviewerProfile: UserProfile | null
    reviewerProfileLoading: boolean
    reviewers: SimpleReviewer[]
    assignmentCountPerReviewer: Record<number, number>
    currentAssignments: AssignmentPreviewItem[]
    fullPapers: PaperResponse[]
    editingPaperId: number | null
    bidMapForPaper: Record<number, string>
    onClose: () => void
}

const BID_LABELS: Record<string, { label: string; color: string }> = {
    EAGER: { label: 'Eager', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    WILLING: { label: 'Willing', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
    IN_A_PINCH: { label: 'In a pinch', color: 'bg-amber-100 text-amber-700 border-amber-300' },
    NOT_WILLING: { label: 'Not willing', color: 'bg-red-100 text-red-700 border-red-300' },
}

export function ReviewerInfoSheet({
    reviewerInfoId,
    reviewerProfile,
    reviewerProfileLoading,
    reviewers,
    assignmentCountPerReviewer,
    currentAssignments,
    fullPapers,
    editingPaperId,
    bidMapForPaper,
    onClose,
}: ReviewerInfoSheetProps) {
    const rev = reviewers.find(r => r.id === reviewerInfoId)

    return (
        <Sheet open={reviewerInfoId !== null} onOpenChange={v => { if (!v) onClose() }}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
                {(() => {
                    if (!rev) return (
                        <div className="p-6 text-center text-muted-foreground">
                            <User2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p>Reviewer not found.</p>
                        </div>
                    )
                    const totalAssign = assignmentCountPerReviewer[rev.id] || 0
                    const revAssignments = currentAssignments.filter(a => a.reviewerId === rev.id)
                    const bidForCurrentPaper = editingPaperId ? bidMapForPaper[rev.id] : null
                    const p = reviewerProfile
                    return (
                        <>
                            {/* Header */}
                            <SheetHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white z-10">
                                <div className="flex items-center gap-3">
                                    {p?.avatarUrl ? (
                                        <img src={p.avatarUrl} alt={rev.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                            {rev.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <SheetTitle className="text-lg truncate">{rev.name}</SheetTitle>
                                        <p className="text-sm text-muted-foreground">{rev.email}</p>
                                        {p?.jobTitle && <p className="text-xs text-muted-foreground">{p.jobTitle}{p.institution ? ` at ${p.institution}` : ''}</p>}
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="p-6 space-y-5">
                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="rounded-lg border p-3 text-center">
                                        <p className="text-lg font-bold">{totalAssign}</p>
                                        <p className="text-[10px] text-muted-foreground">Assignments</p>
                                    </div>
                                    <div className="rounded-lg border p-3 text-center">
                                        <p className="text-lg font-bold">{rev.quota !== null ? rev.quota : '∞'}</p>
                                        <p className="text-[10px] text-muted-foreground">Quota</p>
                                    </div>
                                    <div className="rounded-lg border p-3 text-center">
                                        <p className="text-lg font-bold">{rev.trackIds.length}</p>
                                        <p className="text-[10px] text-muted-foreground">Tracks</p>
                                    </div>
                                </div>

                                {/* Bid for current paper */}
                                {editingPaperId && (
                                    <div className="rounded-lg border p-3">
                                        <p className="text-xs font-semibold text-muted-foreground mb-2">Bid for current paper (#{editingPaperId})</p>
                                        {bidForCurrentPaper ? (
                                            <Badge className={`text-xs ${BID_LABELS[bidForCurrentPaper]?.color || ''}`}>
                                                {BID_LABELS[bidForCurrentPaper]?.label || bidForCurrentPaper}
                                            </Badge>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">No bid submitted</span>
                                        )}
                                    </div>
                                )}

                                {/* Full Profile */}
                                <div className="rounded-lg border bg-gray-50/50 p-4 space-y-4">
                                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wide">
                                        <User2 className="h-3.5 w-3.5" /> Reviewer Profile
                                    </p>

                                    {reviewerProfileLoading ? (
                                        <div className="flex items-center justify-center py-6">
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                            <span className="ml-2 text-sm text-muted-foreground">Loading profile…</span>
                                        </div>
                                    ) : p ? (
                                        <div className="space-y-3">
                                            {/* Personal */}
                                            <div className="rounded-lg border bg-white p-3 space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground">Personal Information</p>
                                                {p.userType && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-20">Type:</span>
                                                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">{p.userType}</span>
                                                    </div>
                                                )}
                                                {p.jobTitle && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-20">Job Title:</span>
                                                        <span className="text-sm">{p.jobTitle}</span>
                                                    </div>
                                                )}
                                                {p.biography && (
                                                    <div>
                                                        <span className="text-xs text-muted-foreground">Biography:</span>
                                                        <p className="text-sm mt-1 text-foreground leading-relaxed whitespace-pre-wrap">{p.biography}</p>
                                                    </div>
                                                )}
                                                {!p.userType && !p.jobTitle && !p.biography && (
                                                    <p className="text-xs text-muted-foreground italic">No personal info provided.</p>
                                                )}
                                            </div>

                                            {/* Affiliation */}
                                            <div className="rounded-lg border bg-white p-3 space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                                    <Building2 className="h-3 w-3" /> Affiliation
                                                </p>
                                                {p.institution && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-24 shrink-0">Institution:</span>
                                                        <span className="text-sm font-medium">{p.institution}</span>
                                                    </div>
                                                )}
                                                {p.department && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-24 shrink-0">Department:</span>
                                                        <span className="text-sm">{p.department}</span>
                                                    </div>
                                                )}
                                                {p.institutionCountry && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-24 shrink-0">Country:</span>
                                                        <span className="text-sm">{p.institutionCountry}</span>
                                                    </div>
                                                )}
                                                {p.institutionUrl && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-24 shrink-0">Website:</span>
                                                        <a href={p.institutionUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate">{p.institutionUrl}</a>
                                                    </div>
                                                )}
                                                {p.secondaryInstitution && (
                                                    <>
                                                        <div className="border-t pt-2 mt-2" />
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground w-24 shrink-0">Secondary:</span>
                                                            <span className="text-sm">{p.secondaryInstitution}{p.secondaryCountry ? ` (${p.secondaryCountry})` : ''}</span>
                                                        </div>
                                                    </>
                                                )}
                                                {!p.institution && !p.department && !p.secondaryInstitution && (
                                                    <p className="text-xs text-muted-foreground italic">No affiliation provided.</p>
                                                )}
                                            </div>

                                            {/* Contact */}
                                            <div className="rounded-lg border bg-white p-3 space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                                    <Phone className="h-3 w-3" /> Contact
                                                </p>
                                                {p.phoneOffice && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-24 shrink-0">Office:</span>
                                                        <span className="text-sm">{p.phoneOffice}</span>
                                                    </div>
                                                )}
                                                {p.phoneMobile && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-24 shrink-0">Mobile:</span>
                                                        <span className="text-sm">{p.phoneMobile}</span>
                                                    </div>
                                                )}
                                                {p.websiteUrl && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-24 shrink-0">Website:</span>
                                                        <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate">{p.websiteUrl}</a>
                                                    </div>
                                                )}
                                                {!p.phoneOffice && !p.phoneMobile && !p.websiteUrl && (
                                                    <p className="text-xs text-muted-foreground italic">No contact info provided.</p>
                                                )}
                                            </div>

                                            {/* Academic Profiles */}
                                            <div className="rounded-lg border bg-white p-3 space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                                    <GraduationCap className="h-3 w-3" /> Academic Profiles
                                                </p>
                                                {p.orcid && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-32 shrink-0">ORCID:</span>
                                                        <a href={`https://orcid.org/${p.orcid}`} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">{p.orcid}</a>
                                                    </div>
                                                )}
                                                {p.googleScholarLink && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-32 shrink-0">Google Scholar:</span>
                                                        <a href={p.googleScholarLink} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate">View Profile</a>
                                                    </div>
                                                )}
                                                {p.dblpId && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-32 shrink-0">DBLP:</span>
                                                        <span className="text-sm">{p.dblpId}</span>
                                                    </div>
                                                )}
                                                {p.semanticScholarId && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-32 shrink-0">Semantic Scholar:</span>
                                                        <span className="text-sm">{p.semanticScholarId}</span>
                                                    </div>
                                                )}
                                                {!p.orcid && !p.googleScholarLink && !p.dblpId && !p.semanticScholarId && (
                                                    <p className="text-xs text-muted-foreground italic">No academic profiles linked.</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border bg-white p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-amber-600">
                                                <AlertTriangle className="h-4 w-4" />
                                                <span className="text-sm font-medium">Profile not set up</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">This reviewer has not created their profile yet. Basic information is shown above.</p>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-xs text-muted-foreground">Name</span>
                                                    <p className="font-medium">{rev.name}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground">Email</span>
                                                    <p className="font-medium truncate">{rev.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Assigned papers */}
                                <div>
                                    <p className="text-sm font-semibold mb-2">Assigned Papers ({revAssignments.length})</p>
                                    {revAssignments.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No papers assigned yet.</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                            {revAssignments.map(a => {
                                                const paper = fullPapers.find(p => p.id === a.paperId)
                                                return (
                                                    <div key={a.paperId} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-white text-sm hover:bg-gray-50">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium truncate">#{a.paperId} — {paper?.title || 'Unknown'}</p>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                                                            {(a.relevanceScore * 100).toFixed(0)}%
                                                        </Badge>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )
                })()}
            </SheetContent>
        </Sheet>
    )
}
