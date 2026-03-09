export interface User {
    id: number
    fullName: string
    email: string
    phoneNumber: string
    country: string
}

export interface AssignRoleRequest {
    userId: number
    conferenceId: number
    trackId: number
    assignedRole: string
}

export interface AssignRoleResponse {
    message: string
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
    orcidId: string
    semanticScholarId: string
}

export interface UserProfile extends UserProfileRequest {
    id: number
    userId: number
}
