// ═══════════════════════════════════════════════════════════════════════════════
// Centralized Status Constants — Single Source of Truth
// ═══════════════════════════════════════════════════════════════════════════════
//
// BEFORE: 15+ files each had their own copy of STATUS_CONFIG / STATUS_COLORS
// AFTER : Every component imports from this single file
//

// ── Paper Status ─────────────────────────────────────────────────────────────

export const PAPER_STATUS = {
    DRAFT:        { label: 'Draft',        bg: 'bg-slate-100',   text: 'text-slate-700',   dot: 'bg-slate-500',   border: 'border-slate-300',   icon: 'FileEdit' },
    SUBMITTED:    { label: 'Submitted',    bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-300',    icon: 'Send' },
    UNDER_REVIEW: { label: 'Under Review', bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500',  border: 'border-purple-300',  icon: 'Eye' },
    AWAITING_DECISION: { label: 'Awaiting Decision', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-300', icon: 'Clock' },
    ACCEPTED:     { label: 'Accepted',     bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-300', icon: 'CheckCircle' },
    REJECTED:     { label: 'Rejected',     bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     border: 'border-red-300',     icon: 'XCircle' },
    WITHDRAWN:    { label: 'Withdrawn',    bg: 'bg-gray-100',    text: 'text-gray-500',    dot: 'bg-gray-400',    border: 'border-gray-300',    icon: 'MinusCircle' },
    CAMERA_READY: { label: 'Camera Ready', bg: 'bg-teal-100',    text: 'text-teal-700',    dot: 'bg-teal-500',    border: 'border-teal-300',    icon: 'FileCheck' },
    PUBLISHED:    { label: 'Published',    bg: 'bg-cyan-100',    text: 'text-cyan-700',    dot: 'bg-cyan-500',    border: 'border-cyan-300',    icon: 'Globe' },
} as const

export type PaperStatusKey = keyof typeof PAPER_STATUS

export function getPaperStatus(status: string) {
    const cfg = PAPER_STATUS[status as PaperStatusKey]
    return cfg ?? { label: status?.replace(/_/g, ' ') || status, bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400', border: 'border-gray-300' }
}

/** Combined class string for Badge: `"bg-xxx text-xxx"` */
export function paperStatusClass(status: string) {
    const s = getPaperStatus(status)
    return `${s.bg} ${s.text}`
}

// ── Review Status ────────────────────────────────────────────────────────────

export const REVIEW_STATUS = {
    ASSIGNED:    { label: 'Assigned',    bg: 'bg-indigo-100',  text: 'text-indigo-800',  border: 'border-indigo-200' },
    IN_PROGRESS: { label: 'In Progress', bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-200' },
    COMPLETED:   { label: 'Completed',   bg: 'bg-green-100',   text: 'text-green-800',   border: 'border-green-200' },
    DECLINED:    { label: 'Declined',    bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-red-200' },
} as const

export type ReviewStatusKey = keyof typeof REVIEW_STATUS

export function getReviewStatus(status: string) {
    const cfg = REVIEW_STATUS[status as ReviewStatusKey]
    return cfg ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
}

export function reviewStatusClass(status: string) {
    const s = getReviewStatus(status)
    return `${s.bg} ${s.text}`
}

// ── Payment / Ticket Status ──────────────────────────────────────────────────

export const PAYMENT_STATUS = {
    PENDING:   { label: 'Pending',   bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300' },
    COMPLETED: { label: 'Paid',      bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    FAILED:    { label: 'Failed',    bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300' },
    REFUNDED:  { label: 'Refunded',  bg: 'bg-slate-100',   text: 'text-slate-600',   border: 'border-slate-300' },
    CANCELLED: { label: 'Cancelled', bg: 'bg-gray-100',    text: 'text-gray-500',    border: 'border-gray-300' },
} as const

export type PaymentStatusKey = keyof typeof PAYMENT_STATUS

export function getPaymentStatus(status: string) {
    const cfg = PAYMENT_STATUS[status as PaymentStatusKey]
    return cfg ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' }
}

export function paymentStatusClass(status: string) {
    const s = getPaymentStatus(status)
    return `${s.bg} ${s.text}`
}

// ── Conference Status ────────────────────────────────────────────────────────

export const CONFERENCE_STATUS = {
    PENDING:   { label: 'Pending',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-300' },
    SCHEDULED: { label: 'Scheduled', bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-300' },
    ONGOING:   { label: 'Ongoing',   bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
    COMPLETED: { label: 'Completed', bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-300' },
    CANCELLED: { label: 'Cancelled', bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-300' },
} as const

export type ConferenceStatusKey = keyof typeof CONFERENCE_STATUS

export function getConferenceStatus(status: string) {
    const cfg = CONFERENCE_STATUS[status as ConferenceStatusKey]
    return cfg ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' }
}

export function conferenceStatusClass(status: string) {
    const s = getConferenceStatus(status)
    return `${s.bg} ${s.text} ${s.border}`
}

// ── Decision Status ──────────────────────────────────────────────────────────

export const DECISION_CONFIG = {
    APPROVE: { label: 'Accepted', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    REJECT:  { label: 'Rejected', bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300' },
} as const
