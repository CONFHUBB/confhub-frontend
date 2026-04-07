"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Users } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/dashboard/stat-card"
import { getUsers, getUserByEmail } from "@/app/api/user.api"
import type { User } from "@/types/user"

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [filtered, setFiltered] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [isSearching, setIsSearching] = useState(false)

    const load = useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await getUsers()
            setUsers(data)
            setFiltered(data)
        } catch {
            toast.error("Failed to load users")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    // Client-side filter
    useEffect(() => {
        if (!search.trim()) {
            setFiltered(users)
            return
        }
        const q = search.toLowerCase()
        setFiltered(users.filter(u =>
            u.email?.toLowerCase().includes(q) ||
            u.firstName?.toLowerCase().includes(q) ||
            u.lastName?.toLowerCase().includes(q) ||
            u.country?.toLowerCase().includes(q)
        ))
    }, [search, users])

    // Search by email via API
    const handleEmailSearch = async () => {
        if (!search.includes("@")) return
        try {
            setIsSearching(true)
            const user = await getUserByEmail(search.trim())
            setFiltered([user])
        } catch {
            toast.error("User not found")
            setFiltered([])
        } finally {
            setIsSearching(false)
        }
    }

    return (
        <div className="flex flex-col gap-6 pb-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Users</h1>
                <p className="text-muted-foreground text-sm mt-0.5">Manage all registered users in the system</p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Users" value={users.length} icon={Users} iconBg="bg-primary/10" iconColor="text-primary" isLoading={isLoading} />
                <StatCard label="Active" value={users.filter(u => u.isActive !== false).length} icon={Users} iconBg="bg-emerald-50" iconColor="text-emerald-600" isLoading={isLoading} />
                <StatCard label="Countries" value={new Set(users.map(u => u.country).filter(Boolean)).size} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" isLoading={isLoading} />
                <StatCard label="Shown" value={filtered.length} icon={Users} iconBg="bg-amber-50" iconColor="text-amber-600" isLoading={isLoading} />
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold">All Users</CardTitle>
                            <CardDescription>{filtered.length} user{filtered.length !== 1 ? "s" : ""} found</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search name, email, country…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleEmailSearch()}
                                    className="pl-8 h-8 w-56 text-sm"
                                />
                            </div>
                            {search.includes("@") && (
                                <Button size="sm" className="h-8 text-xs" onClick={handleEmailSearch} disabled={isSearching}>
                                    {isSearching ? "Searching…" : "Find by email"}
                                </Button>
                            )}
                            {search && (
                                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSearch("")}>
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-muted-foreground bg-muted/30">
                                    <th className="text-left py-3 px-6 font-medium">User</th>
                                    <th className="text-left py-3 pr-4 font-medium">Email</th>
                                    <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Country</th>
                                    <th className="text-left py-3 pr-4 font-medium hidden lg:table-cell">Status</th>
                                    <th className="text-right py-3 pr-6 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading
                                    ? Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            {[5, 4, 3].map((_, j) => (
                                                <td key={j} className="py-3 px-4">
                                                    <Skeleton className="h-4 w-full" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                    : filtered.length === 0
                                        ? <tr><td colSpan={5} className="py-16 text-center text-muted-foreground">No users found</td></tr>
                                        : filtered.map(u => (
                                            <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-6">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                                                            {(u.firstName?.[0] || "") + (u.lastName?.[0] || "")}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{u.fullName || `${u.firstName} ${u.lastName}`}</p>
                                                            {u.title && <p className="text-xs text-muted-foreground">{u.title}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                                                <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">{u.country || "—"}</td>
                                                <td className="py-3 pr-4 hidden lg:table-cell">
                                                    <Badge variant="outline" className={`text-[10px] font-medium border ${
                                                        u.isActive === false ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                    }`}>
                                                        {u.isActive === false ? "Inactive" : "Active"}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 pr-6">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                                            <Link href={`/user/${u.id}`}>View Profile</Link>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                }
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
