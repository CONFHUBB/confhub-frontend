"use client"

import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface StatCardProps {
    label: string
    value: string | number
    change?: string
    changePositive?: boolean
    icon: LucideIcon
    iconBg?: string
    iconColor?: string
    isLoading?: boolean
    suffix?: string
}

export function StatCard({
    label,
    value,
    change,
    changePositive,
    icon: Icon,
    iconBg = "bg-primary/10",
    iconColor = "text-primary",
    isLoading = false,
    suffix,
}: StatCardProps) {
    if (isLoading) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-3.5 w-24" />
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                        <Skeleton className="h-12 w-12 rounded-xl" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                        <p className="text-3xl font-bold mt-1 tracking-tight">
                            {typeof value === "number" ? value.toLocaleString() : value}
                            {suffix && <span className="text-lg ml-1 font-medium text-muted-foreground">{suffix}</span>}
                        </p>
                        {change !== undefined && (
                            <div className="flex items-center gap-1 mt-2">
                                {changePositive ? (
                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                    <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                                )}
                                <span className={`text-xs font-medium ${changePositive ? "text-emerald-600" : "text-rose-600"}`}>
                                    {change}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className={`p-3 rounded-xl ${iconBg} shrink-0`}>
                        <Icon className={`h-6 w-6 ${iconColor}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
