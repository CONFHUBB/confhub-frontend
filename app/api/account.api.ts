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
