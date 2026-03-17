export interface DiscussionPost {
    id: number
    reviewId?: number
    paperId: number
    paperTitle?: string
    userId: number
    userFirstName?: string
    userLastName?: string
    userEmail?: string
    title?: string
    content: string
    isVisibleToAuthor: boolean
    parentCommentId?: number
    isDiscussionPost: boolean
    createdAt: string
    updatedAt: string
}

export interface DiscussionPostRequest {
    reviewId?: number
    paperId: number
    userId: number
    title?: string
    content: string
    isVisibleToAuthor: boolean
    parentCommentId?: number
    isDiscussionPost: boolean
}
