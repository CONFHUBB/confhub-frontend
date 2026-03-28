export interface SignupRequest {
    firstName: string
    lastName: string
    email: string
    password: string
    phoneNumber: string
    country: string
    roles: string[]
}

export interface SignupResponse {
    message: string
}

export interface LoginRequest {
    email: string
    password: string
}

export interface LoginResponse {
    message: string
    token: string
}

export interface ActivateAccountRequest {
    email: string
    invitationToken: string
    newPassword: string
    firstName: string
    lastName: string
}

export interface ActivateAccountResponse {
    token: string
    id: number
    email: string
    firstName: string
    lastName: string
    roles: string[]
}
