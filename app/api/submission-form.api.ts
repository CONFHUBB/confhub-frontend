import http from "@/lib/http"
import { ConferenceSubmissionFormRequest } from "@/types/submission-form"

// Save the dynamic submission form configuration for a conference
export const saveConferenceSubmissionForm = async (payload: ConferenceSubmissionFormRequest): Promise<void> => {
    await http.post("/conference-submission-forms", payload)
}

// Fetch the dynamic form configuration for a conference
export const getConferenceSubmissionForm = async (conferenceId: number): Promise<{ id: number; conferenceId: number; definitionJson: string } | null> => {
    try {
        const response = await http.get<{ id: number; conferenceId: number; definitionJson: string }>(`/conference-submission-forms/conference/${conferenceId}`)
        return response.data
    } catch (error: any) {
        if (error.response?.status === 404) {
            return null
        }
        throw error
    }
}
