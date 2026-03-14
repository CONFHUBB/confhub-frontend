"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export type MockRole = "Author" | "Program Chair" | "Conference Chair"

interface MockRoleContextValue {
    selectedRole: MockRole
    setSelectedRole: (role: MockRole) => void
}

const MockRoleContext = createContext<MockRoleContextValue | undefined>(undefined)

export function MockRoleProvider({ children }: { children: ReactNode }) {
    const [selectedRole, setSelectedRole] = useState<MockRole>(() => {
        if (typeof window === "undefined") return "Author"
        const stored = localStorage.getItem("mockRole") as MockRole | null
        return stored || "Author"
    })

    useEffect(() => {
        localStorage.setItem("mockRole", selectedRole)
    }, [selectedRole])

    const value = useMemo(
        () => ({ selectedRole, setSelectedRole }),
        [selectedRole]
    )

    return (
        <MockRoleContext.Provider value={value}>
            {children}
        </MockRoleContext.Provider>
    )
}

export function useMockRole() {
    const context = useContext(MockRoleContext)
    if (!context) {
        throw new Error("useMockRole must be used within a MockRoleProvider")
    }
    return context
}
