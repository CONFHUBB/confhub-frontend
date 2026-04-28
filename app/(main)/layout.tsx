"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { AppNavbar } from "@/components/app-navbar"
import { useUserRole } from "@/hooks/useUserRole"
import { UserRolesProvider } from "@/hooks/useUserConferenceRoles"
import { syncTokenCookie } from "@/lib/auth"
import { startTokenExpiryMonitor } from "@/lib/http"
import { toast } from 'sonner'
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AIChatWidget } from "@/components/ai-chat-widget"
import { AppErrorBoundary } from "@/components/shared/app-error-boundary"
import { HomeFooter } from "@/components/home/home-footer"
import { Loader2 } from "lucide-react"

export default function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isHomePage = pathname === "/"
    const { isAdminOrStaff, isLoading } = useUserRole()

    // ── JWT token expiry monitor ──
    useEffect(() => {
        syncTokenCookie()
        const cleanup = startTokenExpiryMonitor()

        const handleExpiringSoon = (e: Event) => {
            const remaining = (e as CustomEvent).detail?.remainingMs
            const mins = Math.ceil(remaining / 60_000)
            toast(`Session expires in ${mins} min. Please save your work.`, {
                icon: '⏳',
                duration: 10000,
                id: 'token-expiry-warning',
            })
        }

        const handleExpired = () => {
            toast.error('Session expired. Redirecting to login...', {
                duration: 3000,
                id: 'token-expired',
            })
        }

        window.addEventListener('auth:expiring-soon', handleExpiringSoon)
        window.addEventListener('auth:expired', handleExpired)

        return () => {
            cleanup?.()
            window.removeEventListener('auth:expiring-soon', handleExpiringSoon)
            window.removeEventListener('auth:expired', handleExpired)
        }
    }, [])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // ADMIN / STAFF → sidebar layout (always DashboardSidebar for all admin pages)
    if (isAdminOrStaff) {
        return (
            <UserRolesProvider>
                <SidebarProvider>
                    <DashboardSidebar />
                    <SidebarInset>
                        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                            <div className="flex items-center gap-2 px-4">
                                <SidebarTrigger className="-ml-1" />
                                <Separator orientation="vertical" className="mr-2 h-4" />
                            </div>
                        </header>
                        <div className="flex-1 overflow-y-auto">
                            <div className="flex flex-col gap-4 p-4 min-w-0 overflow-x-auto">
                                <AppErrorBoundary>
                                    {children}
                                </AppErrorBoundary>
                            </div>
                        </div>
                    </SidebarInset>
                    <AIChatWidget />
                </SidebarProvider>
            </UserRolesProvider>
        )
    }

    // Other roles → navbar layout
    return (
        <UserRolesProvider>
            <div className={`flex flex-col min-h-screen ${isHomePage ? 'bg-white' : 'bg-gray-50'}`}>
                <AppNavbar />
                <main className="flex-1">
                    <AppErrorBoundary>
                        {children}
                    </AppErrorBoundary>
                </main>
                <HomeFooter />
                <AIChatWidget />
            </div>
        </UserRolesProvider>
    )
}
