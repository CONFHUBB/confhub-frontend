export interface TrackReviewSetting {
    isDoubleBlind: boolean
    reviewerInstructions: string
    allowReviewerQuota: boolean
    reviewerInviteExpirationDays: number
    allowOthersReviewAccessAfterSubmit: boolean
    allowReviewUpdateDuringDiscussion: boolean
    showReviewerIdentityToOtherReviewer: boolean
    showAggregateColumns: boolean
    allowReviewerSeeStatusBeforeNotification: boolean
    enableAllPapersForDiscussion: boolean
    allowDiscussNonAssignedPapers: boolean
    allowAuthorDiscuss: boolean
    doNotShowWithdrawnPapers: boolean
    enableDomainConflict: boolean
    enableAuthorSelfConflict: boolean
    allowAuthorConfigureConflict: boolean
}

export interface TrackResponse {
    id: number
    name: string
    description: string
    conferenceId: number
    trackReviewSetting?: TrackReviewSetting
}

export type ReviewQuestionType = "COMMENT" | "AGREEMENT" | "OPTIONS" | "OPTIONS_WITH_VALUE"
export type ReviewQuestionShowAs = "RADIO" | "CHECKBOX" | "DROPDOWN" | "LISTBOX"

export interface ReviewQuestionChoiceDTO {
    id?: number
    text: string
    value?: number
    orderIndex?: number
}

export interface ReviewQuestionDTO {
    id?: number
    trackId?: number
    text: string
    note?: string
    type: ReviewQuestionType
    orderIndex?: number
    maxLength?: number
    showAs?: ReviewQuestionShowAs
    isRequired?: boolean
    lockedForEdit?: boolean
    visibleToOtherReviewers?: boolean
    visibleToAuthorsDuringFeedback?: boolean
    visibleToAuthorsAfterNotification?: boolean
    visibleToMetaReviewers?: boolean
    visibleToSeniorMetaReviewers?: boolean
    choices?: ReviewQuestionChoiceDTO[]
}