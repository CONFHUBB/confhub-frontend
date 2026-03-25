// ─────────────────────────────────────────────────────────────────────────────
// Program Types — Simplified schema (Oxford Abstracts style)
// ─────────────────────────────────────────────────────────────────────────────

export type TrackColor = 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'indigo' | 'pink' | 'slate' | 'amber' | 'teal'

// ---------- Settings ----------

export interface ProgramLocation {
    id: string
    name: string
    description?: string
}

export interface ProgramPresentationType {
    id: string
    name: string      // e.g. "Oral", "Keynote", "Poster"
    color: string     // hex color, e.g. "#e05b2e"
}

export interface ProgramSettings {
    locations: ProgramLocation[]
    presentationTypes: ProgramPresentationType[]
}

// ---------- Schedule ----------

export interface SessionPaper {
    paperId: number
    title: string
    authors: string
    order: number
}

export interface ProgramSession {
    id: string
    startTime: string        // "HH:mm"
    endTime: string          // "HH:mm"
    title: string
    isGlobal: boolean        // true → full-width navy row (break, opening, etc.)
    locationId?: string | null  // only when isGlobal = false
    typeId?: string          // links to ProgramPresentationType.id
    chairNames?: string      // free-text, e.g. "Dr. Nguyen Van A, Dr. Tran Thi B"
    papers?: SessionPaper[]
}

export interface ProgramDay {
    date: string             // "YYYY-MM-DD"
    sessions: ProgramSession[]
}

// ---------- Root ----------

export interface AdvancedProgram {
    published: boolean
    settings: ProgramSettings
    schedule: {
        days: ProgramDay[]
    }
}

// ---------- Default ----------

export const DEFAULT_PROGRAM: AdvancedProgram = {
    published: false,
    settings: {
        locations: [],
        presentationTypes: [
            { id: 'oral',     name: 'Oral Presentation', color: '#e05b2e' },
            { id: 'keynote',  name: 'Keynote',           color: '#3b4fa8' },
            { id: 'poster',   name: 'Poster',             color: '#10a37f' },
            { id: 'workshop', name: 'Workshop',           color: '#7c3aed' },
        ]
    },
    schedule: {
        days: []
    }
}

// Legacy aliases kept for compatibility
export type ProgramTrack = ProgramPresentationType

