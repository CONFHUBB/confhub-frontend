import http from '@/lib/http'

export interface ReviewAggregate {
    paperId: number
    paperTitle: string
    paperStatus: string
    reviewCount: number
    completedReviewCount: number
    averageTotalScore: number
    questionAggregates: QuestionAggregate[]
}

export interface QuestionAggregate {
    questionId: number
    questionText: string
    questionType: string
    averageScore: number
    minScore: number
    maxScore: number
    answerCount: number
}

export const getAggregatesByConference = async (conferenceId: number): Promise<ReviewAggregate[]> => {
    const response = await http.get<ReviewAggregate[]>(`/review-aggregates/conference/${conferenceId}`)
    return response.data
}

export const getAggregateByPaper = async (paperId: number): Promise<ReviewAggregate> => {
    const response = await http.get<ReviewAggregate>(`/review-aggregates/paper/${paperId}`)
    return response.data
}

// Author Notification
export interface AuthorNotificationRequest {
    messagePerStatus: Record<string, string>
    subject: string
    recipientType: "PRIMARY_CONTACT" | "ALL_AUTHORS"
}

export const sendAuthorNotifications = async (
    conferenceId: number,
    request: AuthorNotificationRequest
): Promise<Record<number, string>> => {
    const response = await http.post<Record<number, string>>(
        `/author-notification/conference/${conferenceId}`,
        request
    )
    return response.data
}
