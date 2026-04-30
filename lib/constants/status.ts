// ═══════════════════════════════════════════════════════════════════════════════
// Centralized Status Constants — Single Source of Truth
// ═══════════════════════════════════════════════════════════════════════════════
//
// BEFORE: 15+ files each had their own copy of STATUS_CONFIG / STATUS_COLORS
// AFTER : Every component imports from this single file
//

// ── Paper Status ─────────────────────────────────────────────────────────────

export const PAPER_STATUS = {
    SUBMITTED: { label: 'Submitted', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-300', icon: 'Send' },
    UNDER_REVIEW: { label: 'Under Review', bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500', border: 'border-indigo-300', icon: 'Eye' },
    AWAITING_DECISION: { label: 'Awaiting Decision', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-300', icon: 'Clock' },
    ACCEPTED: { label: 'Accepted', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-300', icon: 'CheckCircle' },
    REJECTED: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-300', icon: 'XCircle' },
    AWAITING_REGISTRATION: { label: 'Awaiting Registration', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', border: 'border-orange-300', icon: 'CreditCard' },
    REGISTERED: { label: 'Registered', bg: 'bg-lime-100', text: 'text-lime-700', dot: 'bg-lime-500', border: 'border-lime-300', icon: 'BadgeCheck' },
    AWAITING_CAMERA_READY: { label: 'Awaiting Camera Ready', bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500', border: 'border-violet-300', icon: 'FileUp' },
    CAMERA_READY_SUBMITTED: { label: 'Camera Ready Submitted', bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500', border: 'border-teal-300', icon: 'FileCheck' },
    CAMERA_READY_REJECTED: { label: 'Camera Ready Rejected', bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500', border: 'border-pink-300', icon: 'FileX' },
    PUBLISHED: { label: 'Published', bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500', border: 'border-cyan-300', icon: 'Globe' },
    WITHDRAWN: { label: 'Withdrawn', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400', border: 'border-gray-300', icon: 'MinusCircle' },
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
    ASSIGNED: { label: 'Assigned', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
    IN_PROGRESS: { label: 'In Progress', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
    COMPLETED: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    DECLINED: { label: 'Declined', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
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
    PENDING: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
    COMPLETED: { label: 'Paid', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    FAILED: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    REFUNDED: { label: 'Refunded', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
    CANCELLED: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300' },
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
    PENDING_APPROVAL: { label: 'Pending Approval', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
    PENDING_PAYMENT: { label: 'Pending Payment', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
    SETUP: { label: 'Setup', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
    OPEN: { label: 'Open', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
    COMPLETED: { label: 'Completed', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-300' },
    CANCELLED: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-300' },
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

const CONFERENCE_STATUS_SORT_ORDER: Record<string, number> = {
    PENDING_APPROVAL: 0,
    PENDING_PAYMENT: 1,
    SETUP: 2,
    OPEN: 3,
    COMPLETED: 4,
    CANCELLED: 99,
}

export function getConferenceStatusSortRank(status?: string) {
    if (!status) return 50
    const key = status.toUpperCase()
    return CONFERENCE_STATUS_SORT_ORDER[key] ?? 50
}

// ── Decision Status ──────────────────────────────────────────────────────────

export const DECISION_CONFIG = {
    APPROVE: { label: 'Accepted', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    REJECT: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
} as const
