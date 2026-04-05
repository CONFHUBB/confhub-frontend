'use client'

import { useState, useEffect } from 'react'
import { getTokenPayload } from '@/lib/auth'

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
        const payload = getTokenPayload()
        if (!payload) {
            setInfo({ roles: [], email: null, isAdminOrStaff: false, isLoading: false })
            return
        }
        const { roles, sub: email } = payload
        const isAdminOrStaff = roles.some(r => r === 'ROLE_ADMIN' || r === 'ROLE_STAFF')
        setInfo({ roles, email, isAdminOrStaff, isLoading: false })
    }, [])

    return info
}
