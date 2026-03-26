// ─── Question types (CMT3-aligned) ───────────────────────────────────────────
export enum QuestionType {
    COMMENT           = "COMMENT",           // Free-text input
    AGREEMENT         = "AGREEMENT",         // Checkbox (author agrees)
    OPTIONS           = "OPTIONS",           // Radio / checkbox list / dropdown
    OPTIONS_WITH_VALUE = "OPTIONS_WITH_VALUE", // Options where each choice has a numeric value
    // Legacy aliases kept for backward compatibility
    TEXT     = "text",
    TEXTAREA = "textarea",
    CHECKBOX = "checkbox",
    SELECT   = "select",
}

// Keep old enum name as alias for backward compat
export const DynamicFieldType = QuestionType
export type DynamicFieldType = QuestionType

export type QuestionShowAs =
    | "RADIO"        // List with single choice
    | "CHECKBOX_LIST" // List with multiple choice
    | "DROPDOWN"     // Drop-down list with single choice
    | "LISTBOX"      // List box with multiple choice

export interface QuestionChoice {
    id: string
    label: string
    numericValue?: number | null  // Only for OPTIONS_WITH_VALUE
}

// ─── Fixed Field Config (Title / Abstract / Keywords / Subject Areas) ─────────
export interface FixedFieldConfig {
    required: boolean
    enabled: boolean
    // Keywords-specific
    minCount?: number
    maxCount?: number
}

export interface FixedFields {
    title:        FixedFieldConfig
    abstract:     FixedFieldConfig
    keywords:     FixedFieldConfig
    subjectAreas: FixedFieldConfig
}

// ─── Custom Question ──────────────────────────────────────────────────────────
export interface DynamicField {
    id: string
    type: QuestionType
    title: string   // Short title (shown in chair console column header)
    label: string   // Question body shown to author (backward compat: was label)
    required: boolean
    visibleToReviewers?: boolean
    visibleToMetaReviewers?: boolean
    maxLength?: number               // For COMMENT type
    showAs?: QuestionShowAs          // For OPTIONS / OPTIONS_WITH_VALUE
    choices?: QuestionChoice[]       // For OPTIONS / OPTIONS_WITH_VALUE
    displayOrder?: number
    // Legacy options array (backward compat)
    options?: Array<{ id: string; value: string; label: string }>
}

// ─── Form Definition (stored as definitionJson) ───────────────────────────────
export interface FormDefinition {
    fixedFields?: FixedFields    // If absent, all fixed fields are required+enabled
    fields: DynamicField[]       // Custom questions
}

// Defaults applied when fixedFields is missing (backward compat)
export const DEFAULT_FIXED_FIELDS: FixedFields = {
    title:        { required: true,  enabled: true },
    abstract:     { required: true,  enabled: true },
    keywords:     { required: true,  enabled: true, minCount: 1, maxCount: 10 },
    subjectAreas: { required: true,  enabled: true },
}

// ─── API Contracts ────────────────────────────────────────────────────────────
export interface ConferenceSubmissionFormRequest {
    conferenceId: number
    definitionJson: string // JSON.stringify(FormDefinition)
}

export interface PaperSubmissionRequest {
    conferenceTrackId: number
    primarySubjectAreaId: number
    secondarySubjectAreaIds: number[]
    submissionFormId?: number
    title: string
    abstractField: string
    keywords: string[]
    extraAnswersJson: string // JSON.stringify({ [fieldId]: value })
    submissionTime: string
    status?: string
}
