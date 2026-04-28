export interface User {
    id: number
    firstName: string
    lastName: string
    fullName?: string
    email: string
    country: string
    title?: string
    gender?: string
    isActive?: boolean
}

export interface AssignRoleRequest {
    userId: number
    conferenceId: number
    trackId: number | null
    assignedRole: string
}

export interface AssignRoleResponse {
    id: number
    userId: number
    conferenceId: number
    conferenceTrackId: number | null
    assignedRole: string
    invitedAt: string | null
    isAccepted: boolean | null
    isRegistered: boolean | null
    createdAt: string
    updatedAt: string
}

export interface ConferenceUserTrack {
    id: number
    userId: number
    conferenceId: number
    conferenceTrackId: number | null
    assignedRole: string
    invitedAt: string | null
    isAccepted: boolean | null
    isRegistered: boolean | null
    createdAt: string
    updatedAt: string
}

export interface MemberWithRoles {
    user: User
    roles: ConferenceUserTrack[]
}

export interface MembersPageResponse {
    content: MemberWithRoles[]
    page: number
    size: number
    totalElements: number
    totalPages: number
    last: boolean
}

export interface UserProfileRequest {
    userType: string
    jobTitle: string
    department: string
    institution: string
    institutionCountry: string
    institutionUrl: string
    secondaryInstitution: string
    secondaryCountry: string
    phoneOffice: string
    phoneMobile: string
    avatarUrl: string
    biography: string
    websiteUrl: string
    dblpId: string
    googleScholarLink: string
    orcid: string
    semanticScholarId: string
}

export interface UserProfile extends UserProfileRequest {
    id: number
    userId: number
}