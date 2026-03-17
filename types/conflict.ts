// ── Conflict Types ──

export type ConflictType =
    | "CO_AUTHOR"
    | "PERSONAL"
    | "DOMAIN"
    | "COLLEAGUE"
    | "COLLABORATOR"
    | "THESIS_ADVISOR"
    | "RELATIVE_FRIEND"

export interface PaperConflictRequest {
    paperId: number
    userId: number
    conflictType: ConflictType
}

export interface PaperConflictResponse {
    id: number
    paper: {
        id: number
        title: string
    }
    user: {
        id: number
        firstName: string
        lastName: string
        email: string
    }
    conflictType: ConflictType
}

export interface UserConflictRequest {
    conflictEmail: string
    conflictName: string
    reason: string
}

export interface UserConflictResponse {
    id: number
    userId: number
    conflictEmail: string
    conflictName: string
    reason: string
    isActive: boolean
    createdAt: string
}

export const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
    CO_AUTHOR: "Co-Author",
    PERSONAL: "Personal",
    DOMAIN: "Domain",
    COLLEAGUE: "Colleague",
    COLLABORATOR: "Collaborator",
    THESIS_ADVISOR: "Thesis Advisor",
    RELATIVE_FRIEND: "Relative / Friend",
}
