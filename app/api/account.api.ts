import { authHttp } from '@/lib/http'
import type { SignupRequest, SignupResponse, LoginRequest, LoginResponse, ActivateAccountRequest, ActivateAccountResponse } from '@/types/account'


export const signup = async (body: SignupRequest): Promise<SignupResponse> => {
    const response = await authHttp.post<SignupResponse>('/auth/signup', body)
    return response.data
}

export const login = async (body: LoginRequest): Promise<LoginResponse> => {
    const response = await authHttp.post<LoginResponse>('/auth/signin', body)
    return response.data
}

export const activateAccount = async (body: ActivateAccountRequest): Promise<ActivateAccountResponse> => {
    const response = await authHttp.post<ActivateAccountResponse>('/auth/activate', body)
    return response.data
}

// ==================== Google OAuth ====================
export const loginWithGoogle = async (idToken: string): Promise<LoginResponse> => {
    const response = await authHttp.post<LoginResponse>('/auth/google', { idToken })
    return response.data
}

// ==================== Forgot / Reset Password ====================
export interface ForgotPasswordRequest {
    email: string
}

export interface ResetPasswordRequest {
    email: string
    otp: string
    newPassword: string
}

export const forgotPassword = async (body: ForgotPasswordRequest): Promise<{ message: string }> => {
    const response = await authHttp.post<{ message: string }>('/auth/forgot-password', body)
    return response.data
}

export const resetPassword = async (body: ResetPasswordRequest): Promise<{ message: string }> => {
    const response = await authHttp.post<{ message: string }>('/auth/reset-password', body)
    return response.data
}
