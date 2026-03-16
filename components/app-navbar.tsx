'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, Search, PlusCircle, LogOut } from 'lucide-react'
import { useUserRoles } from '@/hooks/useUserConferenceRoles'
import { getUserByEmail, getUserProfile } from '@/app/api/user.api'
import { NotificationBell } from '@/components/notification-bell'

export function AppNavbar() {
    const pathname = usePathname()
    const router = useRouter()
    const { hasAnyRole, isLoading: rolesLoading } = useUserRoles()
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)
    const [userName, setUserName] = React.useState('')
    const [avatarUrl, setAvatarUrl] = React.useState('')

    // Fetch user profile data from JWT token
    React.useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('accessToken')
                if (!token) return
                const payload = JSON.parse(atob(token.split('.')[1]))
                const email = payload.sub
                if (!email) return

                const user = await getUserByEmail(email)
                if (user?.fullName) setUserName(user.fullName)

                if (user?.id) {
                    try {
                        const profile = await getUserProfile(user.id)
                        if (profile?.avatarUrl) setAvatarUrl(profile.avatarUrl)
                    } catch {
                        // Profile may not exist yet
                    }
                }
            } catch {
                // Token may be invalid
            }
        }
        fetchUserData()
    }, [])

    const initials = userName
        ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U'

    const navLinks = React.useMemo(() => {
        const links = [
            { name: 'Home', path: '/' },
            { name: 'Conferences', path: '/conference' },
        ]

        // Show "My Conferences" if user is a chair of any conference
        if (hasAnyRole('CONFERENCE_CHAIR') || hasAnyRole('PROGRAM_CHAIR')) {
            links.push({ name: 'My Conferences', path: '/conference/my-conference' })
        }

        // Show "Reviewer Console" if user is a reviewer in any conference
        if (hasAnyRole('REVIEWER')) {
            links.push({ name: 'Reviewer', path: '/conference/reviewer-select' })
        }

        links.push({ name: 'My Papers', path: '/paper' })
        links.push({ name: 'Profile', path: '/my-profile' })

        return links
    }, [hasAnyRole])

    // Close menu when route changes
    React.useEffect(() => {
        setIsMenuOpen(false)
    }, [pathname])

    const handleLogout = () => {
        localStorage.removeItem('accessToken')
        router.push('/auth/login')
    }

    return (
        <header className="sticky top-0 left-0 w-full z-50 flex flex-col">
            {/* ── Top Tier: Logo + Search + Actions ── */}
            <div className="bg-[#34c6eb] px-4 sm:px-8 md:px-16 lg:px-32 xl:px-80 h-21 flex items-center justify-between md:justify-around">
                {/* Logo */}
                <Link href="/" className="shrink-0 flex items-center">
                    <Image
                        src="/images/Logo2.webp"
                        alt="ConfMS Logo"
                        width={140}
                        height={80}
                        className="h-20 w-auto object-contain brightness-0 invert"
                        priority
                    />
                </Link>

                <div className="hidden md:flex flex-1 max-w-md mx-6">
                    <div className="flex items-center w-full bg-white rounded-md h-12 overflow-hidden">
                        <span className="pl-3 pr-2 text-gray-500">
                            <Search className="h-6 w-6" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search conferences, papers..."
                            className="pl-2 flex-1 w-full h-full outline-none text-md text-gray-700 bg-transparent"
                        />
                        <button className="px-4 h-full bg-gray-50 text-gray-600 text-md font-semibold border-l hover:bg-gray-100 transition-colors tracking-wide">
                            Search
                        </button>
                    </div>
                </div>

                {/* Right Actions (Desktop) */}
                <div className="hidden md:flex items-center gap-4 shrink-0">
                    {hasAnyRole('CONFERENCE_CHAIR') && (
                        <Link
                            href="/conference/create"
                            className="flex items-center gap-1.5 text-md font-medium text-white bg-white/15 hover:bg-white/25 px-4 py-2 rounded-full border border-white/30 transition-colors"
                        >
                            Create Conference
                        </Link>
                    )}

                    {/* Notification Bell */}
                    <NotificationBell />

                    <Link
                        href="/my-profile"
                        className="flex items-center gap-2 text-md font-medium text-white/90 hover:text-white rounded-full hover:bg-white/10 transition-colors px-2 py-1"
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={userName} className="h-8 w-8 rounded-full object-cover ring-2 ring-white/30" />
                        ) : (
                            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20 text-white text-xs font-bold ring-2 ring-white/30">
                                {initials}
                            </span>
                        )}
                        <span className="max-w-[120px] truncate">{userName || 'Profile'}</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-md font-medium text-white/90 hover:text-white px-3 py-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-white p-1.5 rounded hover:bg-white/10 transition-colors"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* ── Bottom Tier: Navigation Links ── */}
            <div className="bg-[#2A2D34]">
                <div className="flex justify-center h-17 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-16 text-md font-medium">
                        {navLinks.map((link, i) => {
                            const isActive = pathname === link.path
                            return (
                                <Link
                                    key={i}
                                    href={link.path}
                                    className={`relative py-3 whitespace-nowrap transition-colors ${isActive ? 'text-white' : 'text-gray-100 hover:text-gray-500'}`}
                                >
                                    {link.name}
                                    {isActive && (
                                        <span className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-400 rounded-full" />
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* ── Mobile Dropdown Menu ── */}
            {isMenuOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-xl border-t z-50">
                    {/* Mobile Search */}
                    <div className="p-3 border-b bg-gray-50">
                        <div className="flex items-center w-full bg-white border rounded-md h-9 overflow-hidden">
                            <span className="pl-3 pr-2 text-gray-400">
                                <Search className="h-4 w-4" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search conferences, papers..."
                                className="flex-1 w-full h-full outline-none text-md text-gray-700"
                            />
                        </div>
                    </div>

                    {/* Mobile Nav Links */}
                    <div className="py-2">
                        {navLinks.map((link, i) => {
                            const isActive = pathname === link.path
                            return (
                                <Link
                                    key={i}
                                    href={link.path}
                                    className={`block px-4 py-3 text-md font-medium transition-colors ${isActive ? 'text-indigo-600 bg-indigo-50 border-l-2 border-indigo-600' : 'text-gray-700 hover:bg-gray-50'}`}
                                >
                                    {link.name}
                                </Link>
                            )
                        })}
                    </div>

                    {/* Mobile Actions */}
                    <div className="border-t p-3 space-y-2">
                        {/* Mobile User Info */}
                        <Link href="/my-profile" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={userName} className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-200" />
                            ) : (
                                <span className="flex items-center justify-center h-9 w-9 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">
                                    {initials}
                                </span>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-md font-medium text-gray-900 truncate">{userName || 'Profile'}</p>
                                <p className="text-xs text-gray-500">View profile</p>
                            </div>
                        </Link>
                        {hasAnyRole('CONFERENCE_CHAIR') && (
                            <Link
                                href="/conference/create"
                                className="flex items-center gap-2 px-4 py-2.5 text-md font-medium text-indigo-600 rounded-full border border-indigo-200 hover:bg-indigo-50 transition-colors"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Create Conference
                            </Link>
                        )}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full px-3 py-2.5 text-md font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </header>
    )
}
