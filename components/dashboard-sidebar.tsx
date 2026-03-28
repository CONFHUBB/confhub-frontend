"use client"

import * as React from "react"
import {
    BarChart3,
    Command,
    FolderOpen,
    LayoutDashboard,
    LifeBuoy,
    Send,
    Settings2,
    Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        {
            title: "Overview",
            url: "/dashboard",
            icon: LayoutDashboard,
            isActive: true,
            items: [
                {
                    title: "Summary",
                    url: "/dashboard",
                },
                {
                    title: "Analytics",
                    url: "#",
                },
            ],
        },
        {
            title: "Conferences",
            url: "#",
            icon: FolderOpen,
            items: [
                {
                    title: "All Conferences",
                    url: "/conference",
                },
                {
                    title: "Create New",
                    url: "/conference/create",
                },
                {
                    title: "Archived",
                    url: "#",
                },
            ],
        },
        {
            title: "Participants",
            url: "#",
            icon: Users,
            items: [
                {
                    title: "All Participants",
                    url: "#",
                },
                {
                    title: "Reviewers",
                    url: "#",
                },
                {
                    title: "Authors",
                    url: "#",
                },
            ],
        },
        {
            title: "Reports",
            url: "#",
            icon: BarChart3,
            items: [
                {
                    title: "Submissions",
                    url: "#",
                },
                {
                    title: "Reviews",
                    url: "#",
                },
            ],
        },
        {
            title: "Settings",
            url: "#",
            icon: Settings2,
            items: [
                {
                    title: "General",
                    url: "#",
                },
                {
                    title: "Team",
                    url: "#",
                },
                {
                    title: "Billing",
                    url: "#",
                },
            ],
        },
    ],
    navSecondary: [
        {
            title: "Support",
            url: "#",
            icon: LifeBuoy,
        },
        {
            title: "Feedback",
            url: "#",
            icon: Send,
        },
    ],
}

export function DashboardSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="/dashboard">
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <Command className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">ConfHub</span>
                                    <span className="truncate text-xs">Dashboard</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    )
}
