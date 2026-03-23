import http from '@/lib/http'

export interface CameraReadyFile {
    id: number
    paperId: number
    url: string
    isActive: boolean
    isCameraReady: boolean
    isRevision: boolean
}

export const uploadCameraReady = async (conferenceId: number, paperId: number, file: File): Promise<CameraReadyFile> => {
    const formData = new FormData()
    formData.append('conferenceId', conferenceId.toString())
    formData.append('paperId', paperId.toString())
    formData.append('file', file)

    const response = await http.post<CameraReadyFile>('/paper-file/upload-camera-ready', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
}

export const approveCameraReady = async (paperId: number): Promise<void> => {
    await http.post(`/paper-file/approve-camera-ready/${paperId}`)
}

export const getCameraReadyFilesByConference = async (conferenceId: number): Promise<CameraReadyFile[]> => {
    const response = await http.get<CameraReadyFile[]>(`/paper-file/camera-ready/conference/${conferenceId}`)
    return response.data
}

export const getFilesByPaper = async (paperId: number): Promise<CameraReadyFile[]> => {
    const response = await http.get<CameraReadyFile[]>(`/paper-file/paper/${paperId}`)
    return response.data
}
