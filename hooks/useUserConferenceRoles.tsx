"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { getUserRoleAssignments } from "@/app/api/conference-user-track.api"
import type { ConferenceUserTrackResponse, ConferenceTrackRole } from "@/types/notification"
import { getCurrentUserId } from "@/lib/auth"

interface UserRolesContextValue {
    /** All role assignments across all conferences */
    roles: ConferenceUserTrackResponse[]
    /** Loading state */
    isLoading: boolean
    /** Current user ID extracted from JWT */
    userId: number | null
    /** Get roles for a specific conference */
    getRolesInConference: (conferenceId: number) => ConferenceTrackRole[]
    /** Check if user has a specific role in a specific conference */
    hasRoleInConference: (conferenceId: number, role: ConferenceTrackRole) => boolean
    /** Check if user has any assignment with a certain role (across all conferences) */
    hasAnyRole: (role: ConferenceTrackRole) => boolean
    /** Get unique conference IDs where user has any role */
    conferenceIds: number[]
    /** Refresh roles from API */
    refreshRoles: () => Promise<void>
}

const UserRolesContext = createContext<UserRolesContextValue | undefined>(undefined)


export function UserRolesProvider({ children }: { children: ReactNode }) {
    const [roles, setRoles] = useState<ConferenceUserTrackResponse[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [userId, setUserId] = useState<number | null>(null)

    const fetchRoles = useCallback(async () => {
        const uid = getCurrentUserId()
        setUserId(uid)
        if (!uid) {
            setRoles([])
            setIsLoading(false)
            return
        }
        try {
            const data = await getUserRoleAssignments(uid)
            setRoles(data)
        } catch {
            setRoles([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchRoles()
    }, [fetchRoles])

    const getRolesInConference = useCallback((conferenceId: number): ConferenceTrackRole[] => {
        return roles
            .filter(r => r.conferenceId === conferenceId)
            .map(r => r.assignedRole)
    }, [roles])

    const hasRoleInConference = useCallback((conferenceId: number, role: ConferenceTrackRole): boolean => {
        return roles.some(r => r.conferenceId === conferenceId && r.assignedRole === role)
    }, [roles])

    const hasAnyRole = useCallback((role: ConferenceTrackRole): boolean => {
        return roles.some(r => r.assignedRole === role)
    }, [roles])

    const conferenceIds = useMemo(() => {
        return [...new Set(roles.map(r => r.conferenceId))]
    }, [roles])

    const value = useMemo<UserRolesContextValue>(() => ({
        roles,
        isLoading,
        userId,
        getRolesInConference,
        hasRoleInConference,
        hasAnyRole,
        conferenceIds,
        refreshRoles: fetchRoles,
    }), [roles, isLoading, userId, getRolesInConference, hasRoleInConference, hasAnyRole, conferenceIds, fetchRoles])

    return (
        <UserRolesContext.Provider value={value}>
            {children}
        </UserRolesContext.Provider>
    )
}

export function useUserRoles() {
    const context = useContext(UserRolesContext)
    if (!context) {
        throw new Error("useUserRoles must be used within a UserRolesProvider")
    }
    return context
}
