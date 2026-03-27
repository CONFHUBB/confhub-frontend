'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
    Menu, X, Search, LogOut, ChevronDown, User, FileText,
    Ticket, CreditCard, LayoutDashboard, BookOpen, Star,
    Building2, GraduationCap, FlaskConical, Globe
} from 'lucide-react'
import { useUserRoles } from '@/hooks/useUserConferenceRoles'
import { getUserByEmail, getUserProfile } from '@/app/api/user.api'
import { NotificationBell } from '@/components/notification-bell'

// ─────────────────────────────────────────────────────────────────────────────
// Sub-menu data for "My Workspace" dropdown
// Groups: Author, Reviewer, Chair — following EDAS pattern
// ─────────────────────────────────────────────────────────────────────────────
const WORKSPACE_SECTIONS = [
    {
        label: 'As Author',
        icon: <BookOpen className="h-3.5 w-3.5" />,
        color: 'text-blue-600',
        items: [
            { name: 'My Papers',        path: '/paper',                       icon: <FileText className="h-4 w-4" /> },
        ],
    },
    {
        label: 'As Reviewer',
        icon: <Star className="h-3.5 w-3.5" />,
        color: 'text-amber-600',
        items: [
            { name: 'My Reviews',       path: '/conference/reviewer-select',  icon: <FlaskConical className="h-4 w-4" /> },
        ],
    },
    {
        label: 'As Chair',
        icon: <GraduationCap className="h-3.5 w-3.5" />,
        color: 'text-emerald-600',
        items: [
            { name: 'My Conferences',   path: '/conference/my-conference',    icon: <Building2 className="h-4 w-4" /> },
        ],
    },
]

// Paths that belong to the "My Workspace" group — used to highlight the dropdown trigger
const WORKSPACE_PATHS = [
    '/paper',
    '/conference/my-conference',
    '/conference/reviewer-select',
]

// ─────────────────────────────────────────────────────────────────────────────
// Primary flat links (Home + All Conferences + Submit Paper + Create)
// ─────────────────────────────────────────────────────────────────────────────
const PRIMARY_NAV = [
    { name: 'Home',               path: '/',                   exact: true,  chairOnly: false },
    { name: 'All Conferences',   path: '/conference',         exact: true,  chairOnly: false },
    { name: 'Submit Paper',      path: '/conference',         exact: false, chairOnly: false, query: '?status=ONGOING' },
    { name: 'Published Papers',  path: '/paper/published',    exact: false, chairOnly: false },
    { name: 'Create Conference', path: '/conference/create',  exact: false, chairOnly: true  },
]

export function AppNavbar() {
    const pathname  = usePathname()
    const router    = useRouter()
    const { hasAnyRole } = useUserRoles()

    const [isMenuOpen,      setIsMenuOpen]      = React.useState(false)
    const [userMenuOpen,    setUserMenuOpen]    = React.useState(false)
    const [workspaceOpen,   setWorkspaceOpen]   = React.useState(false)
    const [userName,        setUserName]        = React.useState('')
    const [avatarUrl,       setAvatarUrl]       = React.useState('')

    const userMenuRef     = React.useRef<HTMLDivElement>(null)
    const workspaceRef    = React.useRef<HTMLDivElement>(null)

    // Close dropdowns on outside click
    React.useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false)
            }
            if (workspaceRef.current && !workspaceRef.current.contains(e.target as Node)) {
                setWorkspaceOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    // Close mobile menu on route change
    React.useEffect(() => { setIsMenuOpen(false) }, [pathname])

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

    const handleLogout = () => {
        localStorage.removeItem('accessToken')
        router.push('/auth/login')
    }

    const isPrimaryActive = (path: string, exact: boolean, query?: string) => {
        if (query) {
            // For query-based links (e.g. Submit Paper → /conference?status=OPEN),
            // only active when the query param is actually present
            return false
        }
        return exact ? pathname === path : pathname.startsWith(path)
    }

    // Workspace dropdown is active if current path starts with any workspace path
    const isWorkspaceActive = WORKSPACE_PATHS.some(p => pathname.startsWith(p))

    return (
        <header className="sticky top-0 left-0 w-full z-50">
            {/* Main navbar */}
            <div className="bg-gradient-to-r from-[#1e1b4b] via-[#272463] to-[#312e81] shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">

                        {/* ── Logo ── */}
                        <Link href="/" className="shrink-0 flex items-center gap-2.5">
                            <Image
                                src="/images/Favicon-White.png"
                                alt="Confhub"
                                width={36} height={36}
                                className="h-9 w-auto object-contain"
                                priority
                            />
                            <Image
                                src="/images/White.png"
                                alt="Confhub"
                                width={110} height={40}
                                className="h-7 w-auto object-contain hidden sm:block"
                                priority
                            />
                        </Link>

                        {/* ── Center: Primary Nav + Workspace Dropdown (Desktop) ── */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {PRIMARY_NAV.map((link) => {
                                if (link.chairOnly && !hasAnyRole('CONFERENCE_CHAIR')) return null
                                const href = link.query ? `${link.path}${link.query}` : link.path
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                            isPrimaryActive(link.path, link.exact, link.query)
                                                ? 'text-white bg-white/20'
                                                : 'text-white/75 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {link.name}
                                    </Link>
                                )
                            })}

                            {/* ── My Workspace Dropdown ── */}
                            <div ref={workspaceRef} className="relative">
                                <button
                                    onClick={() => setWorkspaceOpen(prev => !prev)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        isWorkspaceActive || workspaceOpen
                                            ? 'text-white bg-white/20'
                                            : 'text-white/75 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <Globe className="h-4 w-4" />
                                    My Workspace
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${workspaceOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {workspaceOpen && (
                                    <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {WORKSPACE_SECTIONS.map((section) => (
                                            <div key={section.label}>
                                                {/* Section header */}
                                                <div className={`flex items-center gap-2 px-4 py-2 ${section.color}`}>
                                                    {section.icon}
                                                    <span className="text-[11px] font-bold uppercase tracking-widest">{section.label}</span>
                                                </div>
                                                {/* Section items */}
                                                {section.items.map((item) => (
                                                    <Link
                                                        key={item.path}
                                                        href={item.path}
                                                        onClick={() => setWorkspaceOpen(false)}
                                                        className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${
                                                            pathname.startsWith(item.path)
                                                                ? 'text-indigo-700 bg-indigo-50'
                                                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                                        }`}
                                                    >
                                                        <span className="text-gray-400">{item.icon}</span>
                                                        {item.name}
                                                    </Link>
                                                ))}
                                                {/* Divider between sections */}
                                                <div className="mx-3 my-1 border-t border-gray-100" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </nav>

                        {/* ── Right: Actions (Desktop) ── */}
                        <div className="hidden lg:flex items-center gap-2">
                            {/* Notification */}
                            <div className="[&_button]:text-white/80 [&_button]:hover:text-white [&_button]:hover:bg-white/10">
                                <NotificationBell />
                            </div>

                            {/* User Account Dropdown */}
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

                                {userMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-4 py-2.5 border-b border-gray-100">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{userName || 'User'}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Manage your account</p>
                                        </div>
                                        <Link
                                            href="/my-profile"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                        >
                                            <User className="h-4 w-4 text-gray-400" /> My Profile
                                        </Link>
                                        <Link
                                            href="/my-profile/tickets"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                        >
                                            <Ticket className="h-4 w-4 text-gray-400" /> My Tickets
                                        </Link>
                                        <Link
                                            href="/my-profile/payments"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                        >
                                            <CreditCard className="h-4 w-4 text-gray-400" /> Payment History
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

                        {/* ── Mobile: Hamburger ── */}
                        <button
                            className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>

                    </div>
                </div>
            </div>

            {/* ── Mobile Menu ── */}
            {isMenuOpen && (
                <div className="lg:hidden bg-white border-t shadow-xl">
                    <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
                        {/* Primary links */}
                        {PRIMARY_NAV.map((link) => (
                            <Link
                                key={link.path}
                                href={link.path}
                                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    isPrimaryActive(link.path, link.exact)
                                        ? 'text-indigo-600 bg-indigo-50'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                {link.name}
                            </Link>
                        ))}

                        {/* Workspace section */}
                        <div className="mt-1 pt-1 border-t border-gray-100">
                            <p className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">My Workspace</p>
                            {WORKSPACE_SECTIONS.map((section) => (
                                <div key={section.label}>
                                    <p className={`flex items-center gap-1.5 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider ${section.color}`}>
                                        {section.icon} {section.label}
                                    </p>
                                    {section.items.map((item) => (
                                        <Link
                                            key={item.path}
                                            href={item.path}
                                            className={`flex items-center gap-3 pl-8 pr-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                pathname.startsWith(item.path)
                                                    ? 'text-indigo-600 bg-indigo-50'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className="text-gray-400">{item.icon}</span>
                                            {item.name}
                                        </Link>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Account actions */}
                        <div className="border-t pt-2 mt-2 space-y-1">
                            <Link
                                href="/my-profile"
                                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <User className="h-4 w-4 text-gray-400" /> My Profile
                            </Link>
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
