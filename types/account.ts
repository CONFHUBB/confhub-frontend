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
