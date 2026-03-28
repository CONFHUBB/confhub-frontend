'use client'

import { useState, useEffect } from 'react'

interface UserRoleInfo {
    roles: string[]
    email: string | null
    isAdminOrStaff: boolean
    isLoading: boolean
}

export function useUserRole(): UserRoleInfo {
    const [info, setInfo] = useState<UserRoleInfo>({
        roles: [],
        email: null,
        isAdminOrStaff: false,
        isLoading: true,
    })

    useEffect(() => {
        try {
            const token = localStorage.getItem('accessToken')
            if (!token) {
                setInfo({ roles: [], email: null, isAdminOrStaff: false, isLoading: false })
                return
            }
            const payload = JSON.parse(atob(token.split('.')[1]))
            const email = payload.sub || null
            // roles can be a single string or an array
            let roles: string[] = []
            if (Array.isArray(payload.roles)) {
                roles = payload.roles
            } else if (typeof payload.roles === 'string') {
                roles = [payload.roles]
            } else if (Array.isArray(payload.authorities)) {
                roles = payload.authorities
            } else if (typeof payload.role === 'string') {
                roles = [payload.role]
            }

            const isAdminOrStaff = roles.some(
                (r) => r === 'ROLE_ADMIN' || r === 'ROLE_STAFF'
            )

            setInfo({ roles, email, isAdminOrStaff, isLoading: false })
        } catch {
            setInfo({ roles: [], email: null, isAdminOrStaff: false, isLoading: false })
        }
    }, [])

    return info
}
