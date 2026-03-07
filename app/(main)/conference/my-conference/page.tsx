"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getChairedConferences } from "@/app/api/conference.api"
import { getUserByEmail } from "@/app/api/user.api"
import type { ConferenceListResponse } from "@/types/conference"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Edit, Calendar, MapPin } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

export default function MyConferencesPage() {
    const router = useRouter()
    const [conferences, setConferences] = useState<ConferenceListResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchMyConferences = async () => {
            try {
                setLoading(true)

                // Get email from token
                const token = localStorage.getItem("accessToken")
                if (!token) {
                    setError("You must be logged in to view your conferences.")
                    setTimeout(() => router.push("/auth/login"), 2000)
                    return
                }

                let userEmail = ""
                try {
                    const payload = JSON.parse(atob(token.split(".")[1]))
                    userEmail = payload.sub
                } catch (e) {
                    throw new Error("Invalid token format")
                }

                if (!userEmail) {
                    setError("Invalid token. Please log in again.")
                    setTimeout(() => router.push("/auth/login"), 2000)
                    return
                }

                // Get user info to extract ID
                const user = await getUserByEmail(userEmail)
                if (!user || !user.id) {
                    setError("User not found. Unable to load conferences.")
                    setLoading(false)
                    return
                }

                // Fetch chaired conferences
                const data = await getChairedConferences(user.id, 0, 100)
                setConferences(data.content || [])
            } catch (err: any) {
                console.error("Error fetching chaired conferences:", err)

                if (err.response?.status === 401 || err.response?.status === 403) {
                    setError("Session expired. Please log in again.")
                    setTimeout(() => router.push("/auth/login"), 2000)
                } else {
                    setError(`Failed to load conferences: ${err.message || "Unknown error"}`)
                }
            } finally {
                setLoading(false)
            }
        }

        fetchMyConferences()
    }, [router])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "active":
                return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            case "upcoming":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
            case "completed":
                return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
                <p className="text-lg text-destructive">{error}</p>
                {error.includes("logged in") && (
                    <Button onClick={() => router.push("/auth/login")}>Go to Login</Button>
                )}
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">My Conferences</h1>
                <p className="mt-2 text-muted-foreground">
                    Conferences where you are assigned as a Track Chair
                </p>
            </div>

            {conferences.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-lg text-muted-foreground">
                            You are not chairing any conferences yet.
                        </p>
                        <Link href="/conference/create">
                            <Button className="mt-4">Create a Conference</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Conference Name</th>
                                        <th className="px-6 py-4 font-medium">Acronym</th>
                                        <th className="px-6 py-4 font-medium">Location</th>
                                        <th className="px-6 py-4 font-medium">Date</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {conferences.map((conf) => (
                                        <tr key={conf.id} className="transition-colors hover:bg-muted/50">
                                            <td className="px-6 py-4 font-medium">{conf.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs">{conf.acronym}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <MapPin className="size-3.5" />
                                                    {conf.location}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                                    <Calendar className="size-3.5" />
                                                    {formatDate(conf.startDate)} - {formatDate(conf.endDate)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                                                        conf.status
                                                    )}`}
                                                >
                                                    {conf.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link href={`/conference/${conf.id}/update`}>
                                                    <Button size="sm" variant="outline" className="h-8 gap-1.5">
                                                        <Edit className="size-3.5" />
                                                        Update
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
