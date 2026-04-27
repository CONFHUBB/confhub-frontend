"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUserByEmail, getUserProfile, createOrUpdateUserProfile } from "@/app/api/user.api"
import type { UserProfile, UserProfileRequest, UserStatus } from "@/types/user"
import { ProfileForm } from "./profile-form"
import { Loader2 } from "lucide-react"
import { ProfileSkeleton } from '@/components/shared/skeletons'
import { Button } from "@/components/ui/button"
import { getCurrentUserEmail } from '@/lib/auth'

export default function MyProfilePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [userId, setUserId] = useState<number | null>(null)
    const [userName, setUserName] = useState("")
    const [userEmail, setUserEmail] = useState("")
    const [userStatus, setUserStatus] = useState<UserStatus>("AVAILABLE")
    const [userStatusUntil, setUserStatusUntil] = useState<string | null>(null)

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            setLoading(true)
            const email = getCurrentUserEmail()
            if (!email) {
                setError("You must be logged in to view your profile.")
                setTimeout(() => router.push("/auth/login"), 2000)
                return
            }

            const user = await getUserByEmail(email)
            if (!user || !user.id) {
                setError("User not found.")
                setLoading(false)
                return
            }

            setUserId(user.id)
            setUserName(user.fullName || "")
            setUserEmail(user.email || "")
            setUserStatus(user.status || "AVAILABLE")
            setUserStatusUntil(user.statusUntil || null)

            try {
                const profileData = await getUserProfile(user.id)
                setProfile(profileData)
                if (profileData.userStatus) {
                    setUserStatus(profileData.userStatus)
                }
                if (profileData.userStatusUntil !== undefined) {
                    setUserStatusUntil(profileData.userStatusUntil || null)
                }
            } catch {
                setProfile(null)
            }
        } catch (err: unknown) {
            const status = typeof err === "object" && err !== null && "response" in err
                ? (err as { response?: { status?: number } }).response?.status
                : undefined
            if (status === 401 || status === 403) {
                setError("Session expired. Please log in again.")
                setTimeout(() => router.push("/auth/login"), 2000)
            } else {
                setError("Failed to load profile.")
            }
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (data: UserProfileRequest) => {
        if (!userId) return
        const updated = await createOrUpdateUserProfile(userId, data)
        setProfile(updated)
        if (updated?.userStatus) {
            setUserStatus(updated.userStatus)
        }
        if (updated?.userStatusUntil !== undefined) {
            setUserStatusUntil(updated.userStatusUntil || null)
        }
        // Mark profile as completed for middleware check
        if (updated?.userType && updated?.institution) {
            document.cookie = `profileCompleted=true; path=/; max-age=${60 * 60 * 24 * 365}`
        }
    }

    if (loading) {
        return <ProfileSkeleton />
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <p className="text-destructive text-lg">{error}</p>
                {error.includes("logged in") && (
                    <Button onClick={() => router.push("/auth/login")}>
                        Go to Login
                    </Button>
                )}
            </div>
        )
    }

    return (
        <div className="page-narrow">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your personal information, affiliations, and academic identities.
                </p>
            </div>
            <ProfileForm
                initialData={profile}
                onSubmit={handleSubmit}
                userName={userName}
                userEmail={userEmail}
                userStatus={userStatus}
                userStatusUntil={userStatusUntil}
            />
        </div>
    )
}
