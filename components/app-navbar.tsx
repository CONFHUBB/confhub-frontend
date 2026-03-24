'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, Search, LogOut, ChevronDown } from 'lucide-react'
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
    const [userMenuOpen, setUserMenuOpen] = React.useState(false)
    const userMenuRef = React.useRef<HTMLDivElement>(null)

    // Close user menu on click outside
    React.useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

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
                    } catch { }
                }
            } catch { }
        }
        fetchUserData()
    }, [])

    const initials = userName
        ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U'

    const navLinks = React.useMemo(() => [
        { name: 'Home', path: '/', exact: true },
        { name: 'Conferences', path: '/conference', exact: true },
        { name: 'My Conferences', path: '/conference/my-conference', exact: false },
        { name: 'Reviewer', path: '/conference/reviewer-select', exact: false },
        { name: 'My Papers', path: '/paper', exact: false },
    ], [])

    // Smart active detection: conference detail pages → highlight "My Conferences"
    const getIsActive = (link: { path: string; exact: boolean }) => {
        if (link.exact) return pathname === link.path
        if (link.path === '/conference/my-conference') {
            // Match /conference/my-conference OR /conference/[id] detail pages
            if (pathname === '/conference/my-conference') return true
            // Match /conference/<number>/... (conference detail pages)
            if (/^\/conference\/\d+/.test(pathname)) return true
            return false
        }
        if (link.path === '/conference/reviewer-select') {
            // Match /conference/reviewer-select OR /conference/[id]/reviewer/...
            if (pathname.startsWith('/conference/reviewer-select')) return true
            if (/^\/conference\/\d+\/reviewer/.test(pathname)) return true
            return false
        }
        return pathname.startsWith(link.path)
    }

    React.useEffect(() => { setIsMenuOpen(false) }, [pathname])

    const handleLogout = () => {
        localStorage.removeItem('accessToken')
        router.push('/auth/login')
    }

    return (
        <header className="sticky top-0 left-0 w-full z-50">
            {/* Main navbar — dark indigo/navy for logo contrast */}
            <div className="bg-gradient-to-r from-[#1e1b4b] via-[#272463] to-[#312e81] shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="shrink-0 flex items-center gap-2.5">
                            <Image
                                src="/images/Favicon-White.png"
                                alt="ConfMS"
                                width={36}
                                height={36}
                                className="h-9 w-auto object-contain"
                                priority
                            />
                            <Image
                                src="/images/White.png"
                                alt="ConfMS"
                                width={110}
                                height={40}
                                className="h-7 w-auto object-contain hidden sm:block"
                                priority
                            />
                        </Link>

                        {/* Center: Nav Links (Desktop) */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {navLinks.map((link, i) => {
                                const isActive = getIsActive(link)
                                return (
                                    <Link
                                        key={i}
                                        href={link.path}
                                        className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                            isActive
                                                ? 'text-white bg-white/20'
                                                : 'text-white/75 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {link.name}
                                    </Link>
                                )
                            })}
                        </nav>

                        {/* Right: Actions (Desktop) */}
                        <div className="hidden lg:flex items-center gap-2">
                            {/* Search */}
                            <Link
                                href="/conference"
                                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <Search className="h-5 w-5" />
                            </Link>

                            {/* Create Conference */}
                            {hasAnyRole('CONFERENCE_CHAIR') && (
                                <Link
                                    href="/conference/create"
                                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-white text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm"
                                >
                                    Create Conference
                                </Link>
                            )}

                            {/* Notification */}
                            <div className="[&_button]:text-white/80 [&_button]:hover:text-white [&_button]:hover:bg-white/10">
                                <NotificationBell />
                            </div>

                            {/* User Menu */}
                            <div ref={userMenuRef} className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={userName} className="h-8 w-8 rounded-full object-cover ring-2 ring-white/30" />
                                    ) : (
                                        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20 text-white text-xs font-bold ring-2 ring-white/30">
                                            {initials}
                                        </span>
                                    )}
                                    <span className="text-sm font-medium max-w-[100px] truncate hidden xl:block text-white/90">
                                        {userName || 'Profile'}
                                    </span>
                                    <ChevronDown className={`h-3.5 w-3.5 text-white/60 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown */}
                                {userMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-4 py-2.5 border-b border-gray-100">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{userName || 'User'}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Manage your account</p>
                                        </div>
                                        <Link
                                            href="/my-profile"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            My Profile
                                        </Link>
                                        <Link
                                            href="/paper"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            My Papers
                                        </Link>
                                        <div className="border-t border-gray-100 mt-1 pt-1">
                                            <button
                                                onClick={() => { setUserMenuOpen(false); handleLogout() }}
                                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Log out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mobile: Menu Toggle */}
                        <button
                            className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="lg:hidden bg-white border-t shadow-xl">
                    <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
                        {navLinks.map((link, i) => {
                            const isActive = getIsActive(link)
                            return (
                                <Link
                                    key={i}
                                    href={link.path}
                                    className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'text-indigo-600 bg-indigo-50'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    {link.name}
                                </Link>
                            )
                        })}
                        <Link
                            href="/my-profile"
                            className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Profile
                        </Link>
                        <div className="border-t pt-2 mt-2">
                            {hasAnyRole('CONFERENCE_CHAIR') && (
                                <Link
                                    href="/conference/create"
                                    className="block px-4 py-2.5 rounded-lg text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                                >
                                    Create Conference
                                </Link>
                            )}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                Log out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    )
}
