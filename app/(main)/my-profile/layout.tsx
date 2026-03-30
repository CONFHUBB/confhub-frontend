"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    User, FileText, Ticket, CreditCard,
    ChevronDown, ChevronRight, Settings, LayoutDashboard, Mail
} from "lucide-react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Grouped sidebar — mirrors the conference update page layout
const NAV_GROUPS = [
    {
        title: "Account",
        icon: <User className="h-4 w-4" />,
        accentColor: "text-indigo-600",
        items: [
            { name: "My Profile", path: "/my-profile", icon: <User className="h-4 w-4" /> },
        ],
    },
    {
        title: "Invitations",
        icon: <Mail className="h-4 w-4" />,
        accentColor: "text-amber-600",
        items: [
            { name: "My Invitations", path: "/my-profile/invitations", icon: <Mail className="h-4 w-4" /> },
        ],
    },
    {
        title: "Submissions",
        icon: <FileText className="h-4 w-4" />,
        accentColor: "text-emerald-600",
        items: [
            { name: "My Papers", path: "/my-profile/papers", icon: <FileText className="h-4 w-4" /> },
        ],
    },
    {
        title: "Registration",
        icon: <Ticket className="h-4 w-4" />,
        accentColor: "text-rose-600",
        items: [
            { name: "My Tickets", path: "/my-profile/tickets", icon: <Ticket className="h-4 w-4" /> },
            { name: "Payment History", path: "/my-profile/payments", icon: <CreditCard className="h-4 w-4" /> },
        ],
    },
]

export default function MyProfileLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [expandedGroups, setExpandedGroups] = useState<string[]>(
        NAV_GROUPS.map(g => g.title) // all expanded by default
    )

    const toggleGroup = (title: string) => {
        setExpandedGroups(prev =>
            prev.includes(title)
                ? prev.filter(t => t !== title)
                : [...prev, title]
        )
    }

    return (
        <div className="min-h-screen bg-transparent flex flex-col overflow-hidden">
            <div className="flex-1 w-full max-w-[1700px] mx-auto flex flex-col p-4 md:p-8 overflow-hidden">
                {/* Header Area */}
                <div className="mb-8 shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Global Assets</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage your profile, tickets, payments, and papers across all conferences
                        </p>
                    </div>
                </div>

                {/* Dashboard Card with sidebar */}
                <Card className="flex flex-col md:flex-row shadow-lg overflow-hidden flex-1 min-h-0 bg-background border border-border">
                    {/* Sidebar Navigation — same style as conference update */}
                    <div className="md:w-72 shrink-0 bg-muted/5 border-r flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <nav className="space-y-1">
                                {NAV_GROUPS.map((group) => {
                                    const isExpanded = expandedGroups.includes(group.title)
                                    const isGroupActive = group.items.some(i => pathname === i.path)
                                    return (
                                        <div key={group.title}>
                                            <button
                                                onClick={() => toggleGroup(group.title)}
                                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm font-bold transition-colors
                                                    ${isGroupActive ? 'text-primary' : 'text-foreground hover:text-primary'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={group.accentColor}>{group.icon}</span>
                                                    <span className="uppercase tracking-wider text-xs">{group.title}</span>
                                                </div>
                                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                                            </button>
                                            {isExpanded && (
                                                <div className="flex flex-col space-y-0.5 mt-0.5 pl-3 border-l ml-4 border-border/50">
                                                    {group.items.map(item => {
                                                        const isActive = pathname === item.path
                                                        return (
                                                            <Link
                                                                key={item.path}
                                                                href={item.path}
                                                                className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors block
                                                                    ${isActive
                                                                        ? 'bg-primary/10 text-primary font-semibold'
                                                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                                    }`}
                                                            >
                                                                {item.name}
                                                            </Link>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content Area - Scrollable */}
                    <div className="flex-1 min-w-0 bg-background overflow-hidden flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="max-w-8xl mx-auto p-8 md:p-12 pb-24">
                                {children}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}
