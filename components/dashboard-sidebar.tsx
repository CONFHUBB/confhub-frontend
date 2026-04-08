"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
    BarChart3,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    Command,
    CreditCard,
    FileText,
    FolderOpen,
    LayoutDashboard,
    LifeBuoy,
    PlusCircle,
    Send,
    Settings2,
    ShieldCheck,
    Users,
} from "lucide-react"

import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { SidebarMenuAction } from "@/components/ui/sidebar"

const navGroups = [
    {
        label: "Management",
        items: [
            {
                title: "Overview",
                url: "/dashboard",
                icon: LayoutDashboard,
                exact: true,
            },
            {
                title: "Conferences",
                url: "/dashboard/conferences",
                icon: FolderOpen,
                children: [
                    { title: "All Conferences", url: "/dashboard/conferences" },
                    { title: "Pending Approval", url: "/dashboard/conferences?status=PENDING" },
                    { title: "Create New", url: "/conference/create" },
                ],
            },
            {
                title: "Papers",
                url: "/dashboard/papers",
                icon: FileText,
                children: [
                    { title: "All Papers", url: "/dashboard/papers" },
                    { title: "Under Review", url: "/dashboard/papers?status=UNDER_REVIEW" },
                    { title: "Published", url: "/dashboard/papers?status=PUBLISHED" },
                ],
            },
            {
                title: "Users",
                url: "/dashboard/users",
                icon: Users,
                children: [
                    { title: "All Users", url: "/dashboard/users" },
                    { title: "Participants", url: "/dashboard/users?tab=participants" },
                ],
            },
        ],
    },
    {
        label: "Finance",
        items: [
            {
                title: "Finance",
                url: "/dashboard/finance",
                icon: CreditCard,
                children: [
                    { title: "Revenue Overview", url: "/dashboard/finance" },
                    { title: "Payment History", url: "/dashboard/finance?tab=payments" },
                    { title: "Ticket Types", url: "/dashboard/finance?tab=tickets" },
                ],
            },
        ],
    },
    {
        label: "Operations",
        items: [
            {
                title: "Reviews",
                url: "/dashboard/reviews",
                icon: BookOpen,
                children: [
                    { title: "Review Pipeline", url: "/dashboard/reviews" },
                    { title: "Assignments", url: "/dashboard/reviews?tab=assignments" },
                ],
            },
            {
                title: "Approvals",
                url: "/dashboard/conferences?status=PENDING",
                icon: ShieldCheck,
            },
        ],
    },
    {
        label: "System",
        items: [
            {
                title: "Settings",
                url: "/dashboard/settings",
                icon: Settings2,
            },
        ],
    },
]

const navSecondary = [
    { title: "Support", url: "#", icon: LifeBuoy },
    { title: "Feedback", url: "#", icon: Send },
]

const mockUser = {
    name: "Admin",
    email: "admin@confhub.com",
    avatar: "/avatars/admin.jpg",
}

export function DashboardSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()

    const isActive = (url: string, exact = false) => {
        if (exact) return pathname === url
        return pathname.startsWith(url.split("?")[0])
    }

    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard">
                                <img src="/images/favicon-blue.png" alt="ConfHub" className="size-8 rounded-lg" />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">ConfHub</span>
                                    <span className="truncate text-xs text-muted-foreground">Admin Dashboard</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {navGroups.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarMenu>
                            {group.items.map((item) => {
                                if (item.children) {
                                    return (
                                        <Collapsible
                                            key={item.title}
                                            asChild
                                            defaultOpen={isActive(item.url)}
                                        >
                                            <SidebarMenuItem>
                                                <SidebarMenuButton
                                                    asChild
                                                    tooltip={item.title}
                                                    data-active={isActive(item.url)}
                                                >
                                                    <Link href={item.url}>
                                                        <item.icon />
                                                        <span>{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuAction className="data-[state=open]:rotate-90">
                                                        <ChevronRight />
                                                        <span className="sr-only">Toggle</span>
                                                    </SidebarMenuAction>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <SidebarMenuSub>
                                                        {item.children.map((child) => (
                                                            <SidebarMenuSubItem key={child.title}>
                                                                <SidebarMenuSubButton
                                                                    asChild
                                                                    data-active={pathname + (typeof window !== "undefined" ? window.location.search : "") === child.url}
                                                                >
                                                                    <Link href={child.url}>
                                                                        <span>{child.title}</span>
                                                                    </Link>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                        ))}
                                                    </SidebarMenuSub>
                                                </CollapsibleContent>
                                            </SidebarMenuItem>
                                        </Collapsible>
                                    )
                                }

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            tooltip={item.title}
                                            data-active={isActive(item.url, (item as any).exact)}
                                        >
                                            <Link href={item.url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}

                <NavSecondary items={navSecondary} className="mt-auto" />
            </SidebarContent>

            <SidebarFooter>
                <NavUser user={mockUser} />
            </SidebarFooter>
        </Sidebar>
    )
}
