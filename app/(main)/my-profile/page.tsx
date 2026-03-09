"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUserByEmail, getUserProfile, createOrUpdateUserProfile } from "@/app/api/user.api"
import type { UserProfile, UserProfileRequest } from "@/types/user"
import { ProfileForm } from "./components/profile-form"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MyProfilePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [userId, setUserId] = useState<number | null>(null)
    const [userName, setUserName] = useState("")
    const [userEmail, setUserEmail] = useState("")

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem("accessToken")
            if (!token) {
                setError("You must be logged in to view your profile.")
                setTimeout(() => router.push("/auth/login"), 2000)
                return
            }

            const payload = JSON.parse(atob(token.split(".")[1]))
            const email = payload.sub
            if (!email) {
                setError("Invalid token. Please log in again.")
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
            setUserName(user.fullName)
            setUserEmail(user.email)

            try {
                const profileData = await getUserProfile(user.id)
                setProfile(profileData)
            } catch {
                setProfile(null)
            }
        } catch (err: any) {
            if (err.response?.status === 401 || err.response?.status === 403) {
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
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading your profile...</p>
                </div>
            </div>
        )
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
        <div className="container mx-auto py-6 px-4 max-w-4xl">
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
            />
        </div>
    )
}
