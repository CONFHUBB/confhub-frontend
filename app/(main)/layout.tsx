"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { AppNavbar } from "@/components/app-navbar"
import { useUserRole } from "@/hooks/useUserRole"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { HeroSection } from "@/components/hero-section"
import { Loader2 } from "lucide-react"

export default function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isDashboard = pathname.startsWith("/dashboard")
    const isHomePage = pathname === "/"
    const { isAdminOrStaff, isLoading } = useUserRole()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // ADMIN / STAFF → sidebar layout
    if (isAdminOrStaff) {
        return (
            <SidebarProvider>
                {isDashboard ? <DashboardSidebar /> : <AppSidebar />}
                <SidebarInset>
                    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                        <div className="flex items-center gap-2 px-4">
                            <SidebarTrigger className="-ml-1" />
                            <Separator orientation="vertical" className="mr-2 h-4" />
                        </div>
                    </header>
                    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        )
    }

    // Other roles → navbar layout
    return (
        <div className="min-h-screen">
            <AppNavbar />
            {isHomePage && (
                <div className="pt-20">
                    <HeroSection />
                </div>
            )}
            <main className={isHomePage ? "" : "pt-20"}>
                {children}
            </main>
        </div>
    )
}
