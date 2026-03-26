"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, FileText, Ticket, CreditCard } from "lucide-react"

export default function MyProfileLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    const navItems = [
        { name: "My Profile", path: "/my-profile", icon: User },
        { name: "My Tickets", path: "/my-profile/tickets", icon: Ticket },
        { name: "Payment History", path: "/my-profile/payments", icon: CreditCard },
        { name: "My Papers", path: "/my-profile/papers", icon: FileText },
    ]

    return (
        <div className="flex min-h-[calc(100vh-4rem)] bg-gray-50">
            {/* Sidebar */}
            <aside className="w-72 border-r bg-white p-6 hidden lg:block shadow-sm z-10">
                <div className="mb-8">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 border-l-4 border-indigo-600 pl-3">
                        Global Assets
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 pl-4">
                        Manage your profile, tickets, payments, and papers across all conferences.
                    </p>
                </div>
                <nav className="space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                    isActive
                                        ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200/50"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                            >
                                <Icon className={`h-5 w-5 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 bg-white">
                <div className="h-full w-full">
                    {children}
                </div>
            </main>
        </div>
    )
}
