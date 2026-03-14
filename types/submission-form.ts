export enum DynamicFieldType {
    TEXT = "text",
    TEXTAREA = "textarea",
    CHECKBOX = "checkbox",
    SELECT = "select",
}

export interface DynamicFieldOption {
    id: string
    value: string
    label: string
}

export interface DynamicField {
    id: string
    type: DynamicFieldType
    label: string
    required: boolean
    options?: DynamicFieldOption[] // Only used for SELECT type
}

// Represents the parsed definitionJson
export interface FormDefinition {
    fields: DynamicField[]
}

// API: POST /api/v1/conference-submission-forms
export interface ConferenceSubmissionFormRequest {
    conferenceId: number
    definitionJson: string // JSON.stringify(FormDefinition)
}

// API: POST /api/v1/paper
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
    isPassedPlagiarism?: boolean
    status?: string
}
