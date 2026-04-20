"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Users, Eye } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/dashboard/stat-card"
import { DataTable } from "@/components/ui/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { getUsers, getUserByEmail } from "@/app/api/user.api"
import type { User } from "@/types/user"
import { cn } from "@/lib/utils"
import type { ColumnDef } from "@tanstack/react-table"

const userColumns: ColumnDef<User>[] = [
    {
        accessorKey: "fullName",
        id: "fullName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
        cell: ({ row }) => {
            const u = row.original
            const initials = ((u.firstName?.[0] || "") + (u.lastName?.[0] || "")).toUpperCase()
            const displayName = u.fullName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "—"
            return (
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                        {initials || "?"}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">{displayName}</span>
                        {u.title && <span className="text-xs text-muted-foreground">{u.title}</span>}
                    </div>
                </div>
            )
        },
    },
    {
        accessorKey: "email",
        id: "email",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">{row.original.email}</span>
        ),
    },
    {
        accessorKey: "country",
        id: "country",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Country" />,
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground">{row.original.country || "—"}</span>
        ),
    },
    {
        accessorKey: "isActive",
        id: "isActive",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
            <Badge
                variant="outline"
                className={cn(
                    "text-[10px] font-medium border",
                    row.original.isActive === false
                        ? "bg-rose-100 text-rose-700 border-rose-200"
                        : "bg-emerald-100 text-emerald-700 border-emerald-200"
                )}
            >
                {row.original.isActive === false ? "Inactive" : "Active"}
            </Badge>
        ),
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="flex items-center justify-end">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                    <Link href={`/user/${row.original.id}`}>
                        <Eye className="h-3 w-3" />
                        View Profile
                    </Link>
                </Button>
            </div>
        ),
    },
]

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const load = useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await getUsers()
            setUsers(data)
        } catch {
            toast.error("Failed to load users")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const activeCount = users.filter((u) => u.isActive !== false).length
    const countryCount = new Set(users.map((u) => u.country).filter(Boolean)).size

    return (
        <div className="flex flex-col gap-6 pb-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Users</h1>
                <p className="text-muted-foreground text-sm mt-0.5">Manage all registered users in the system</p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Users"
                    value={users.length}
                    icon={Users}
                    iconBg="bg-primary/10"
                    iconColor="text-primary"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Active"
                    value={activeCount}
                    icon={Users}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Countries"
                    value={countryCount}
                    icon={Users}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                    isLoading={isLoading}
                />
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                    <div>
                        <CardTitle className="text-base font-semibold">All Users</CardTitle>
                        <CardDescription>
                            {isLoading ? "Loading…" : `${users.length} user${users.length !== 1 ? "s" : ""} registered`}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0 min-w-0 overflow-x-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                            Loading users…
                        </div>
                    ) : (
                        <DataTable
                            columns={userColumns}
                            data={users}
                            searchColumn="fullName"
                            searchPlaceholder="Search name, email, country…"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
