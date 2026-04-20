'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
    Menu, X, Search, LogOut, ChevronDown, User, FileText, Mail,
    Ticket, CreditCard, LayoutDashboard, BookOpen, Star,
    Building2, GraduationCap, FlaskConical, Globe, ClipboardList
} from 'lucide-react'
import { useUserRoles } from '@/hooks/useUserConferenceRoles'
import { getUserByEmail, getUserProfile } from '@/app/api/user.api'
import { getConference } from '@/app/api/conference.api'
import { NotificationBell } from '@/components/notification-bell'
import { getCurrentUserEmail, clearToken } from '@/lib/auth'

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
            { name: 'My Papers', path: '/paper', icon: <FileText className="h-4 w-4" /> },
        ],
    },
    {
        label: 'As Reviewer',
        icon: <Star className="h-3.5 w-3.5" />,
        color: 'text-amber-600',
        items: [
            { name: 'My Reviews', path: '/conference/reviewer-console', icon: <ClipboardList className="h-4 w-4" /> },
        ],
    },
    {
        label: 'As Program Chair',
        icon: <GraduationCap className="h-3.5 w-3.5" />,
        color: 'text-indigo-600',
        items: [
            { name: 'Program Conferences', path: '/conference/program-conference', icon: <Building2 className="h-4 w-4" /> },
        ],
    },
    {
        label: 'As Conference Chair',
        icon: <GraduationCap className="h-3.5 w-3.5" />,
        color: 'text-emerald-600',
        items: [
            { name: 'My Conferences', path: '/conference/my-conference', icon: <Building2 className="h-4 w-4" /> },
        ],
    },
]

// Paths that belong to the "My Workspace" group — used to highlight the dropdown trigger
// Use { path, exact } to prevent /paper/published from matching /paper
const WORKSPACE_PATHS: { path: string; exact: boolean }[] = [
    { path: '/paper', exact: true },
    { path: '/conference/my-conference', exact: false },
    { path: '/conference/program-conference', exact: false },
    { path: '/conference/reviewer-console', exact: false },
]

// ─────────────────────────────────────────────────────────────────────────────
// Primary flat links (Home + All Conferences + Submit Paper + Create)
// ─────────────────────────────────────────────────────────────────────────────
const PRIMARY_NAV = [
    { name: 'Home', path: '/', exact: true, chairOnly: false },
    { name: 'All Conferences', path: '/conference', exact: true, chairOnly: false },
    { name: 'Submit Paper', path: '/conference', exact: false, chairOnly: false, query: '?status=OPEN' },
    { name: 'Published Papers', path: '/paper/published', exact: false, chairOnly: false },
    { name: 'Create Conference', path: '/conference/create', exact: false, chairOnly: false },
]

export function AppNavbar() {
    const pathname = usePathname()
    const router = useRouter()
    const { hasAnyRole, getRolesInConference, userId } = useUserRoles()

    // Allow checking auth state safely
    const [isMounted, setIsMounted] = React.useState(false)
    React.useEffect(() => { setIsMounted(true) }, [])

    // Glassmorphism scroll border for landing page
    const [hasScrolled, setHasScrolled] = React.useState(false)
    React.useEffect(() => {
        const onScroll = () => setHasScrolled(window.scrollY > 10)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    const [isMenuOpen, setIsMenuOpen] = React.useState(false)
    const [userMenuOpen, setUserMenuOpen] = React.useState(false)
    const [workspaceOpen, setWorkspaceOpen] = React.useState(false)
    const [userName, setUserName] = React.useState('')
    const [avatarUrl, setAvatarUrl] = React.useState('')
    const [ctxConferenceName, setCtxConferenceName] = React.useState('')
    const [ctxConferenceId, setCtxConferenceId] = React.useState<number | null>(null)

    const userMenuRef = React.useRef<HTMLDivElement>(null)
    const workspaceRef = React.useRef<HTMLDivElement>(null)

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
                const email = getCurrentUserEmail()
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
        clearToken()
        document.cookie = "accessToken=; path=/; max-age=0"
        document.cookie = "profileCompleted=; path=/; max-age=0"
        window.location.href = '/'
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
    const isWorkspaceActive = WORKSPACE_PATHS.some(wp => wp.exact ? pathname === wp.path : pathname.startsWith(wp.path))

    // ── Conference context from URL ─────────────────────────────────
    React.useEffect(() => {
        const match = pathname.match(/\/conference\/(\d+)/)
        if (match) {
            const id = Number(match[1])
            setCtxConferenceId(id)
            getConference(id)
                .then(c => setCtxConferenceName(c.acronym || c.name))
                .catch(() => setCtxConferenceName(''))
        } else {
            setCtxConferenceId(null)
            setCtxConferenceName('')
        }
    }, [pathname])

    // Derive role label for the current conference
    const ctxRoles = ctxConferenceId ? getRolesInConference(ctxConferenceId) : []
    const ctxRoleLabel = ctxRoles.includes('CONFERENCE_CHAIR') && ctxRoles.includes('PROGRAM_CHAIR')
        ? 'Chair'
        : ctxRoles.includes('CONFERENCE_CHAIR')
            ? 'Conference Chair'
            : ctxRoles.includes('PROGRAM_CHAIR')
                ? 'Program Chair'
                : ctxRoles.includes('REVIEWER')
                    ? 'Reviewer'
                    : pathname.includes('/author')
                        ? 'Author'
                        : ctxRoles.length > 0
                            ? ctxRoles[0].replace('_', ' ')
                            : ''

    return (
        <header className={`sticky top-0 left-0 w-full z-50 transition-all duration-300 bg-white/80 backdrop-blur-xl ${hasScrolled ? 'border-b border-secondary/20 shadow-sm' : 'border-b border-transparent'}`}>
            {/* Main navbar */}
            <div className="max-w-7xl mx-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">

                        {/* ── Logo ── */}
                        <Link href="/" className="shrink-0 flex items-center group">
                            <Image
                                src="/images/logo-blue.png"
                                alt="ConfHub"
                                width={140}
                                height={36}
                                className="h-9 w-auto"
                                priority
                            />
                        </Link>

                        {/* ── Center: Primary Nav + Workspace Dropdown (Desktop) ── */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {PRIMARY_NAV.map((link) => {
                                const href = link.query ? `${link.path}${link.query}` : link.path
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                            isPrimaryActive(link.path, link.exact, link.query)
                                                ? 'text-primary bg-primary/8'
                                                : 'text-text-medium hover:text-primary hover:bg-primary/5'
                                            }`}
                                    >
                                        {link.name}
                                    </Link>
                                )
                            })}

                            {/* ── My Workspace Dropdown ── */}
                            {isMounted && userId && (
                                <div ref={workspaceRef} className="relative">
                                    <button
                                        onClick={() => setWorkspaceOpen(prev => !prev)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                            isWorkspaceActive || workspaceOpen
                                                ? 'text-primary bg-primary/8'
                                                : 'text-text-medium hover:text-primary hover:bg-primary/5'
                                            }`}
                                    >
                                        <Globe className="h-4 w-4" />
                                        My Workspace
                                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${workspaceOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {workspaceOpen && (
                                        <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 custom-dropdown-anim">
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
                                                            className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${pathname.startsWith(item.path)
                                                                ? 'text-primary bg-primary/8'
                                                                : 'text-text-medium hover:bg-neutral-dark hover:text-text-dark'
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
                            )}
                        </nav>

                        {/* ── Right: Actions (Desktop) ── */}
                        <div className="hidden lg:flex items-center gap-2">
                            {isMounted && userId ? (
                                <>
                                    {/* Notification */}
                                    <div className="[&_button]:text-text-medium [&_button]:hover:text-text-dark [&_button]:hover:bg-neutral-dark">
                                        <NotificationBell />
                                    </div>

                                    {/* User Account Dropdown */}
                                    <div ref={userMenuRef} className="relative">
                                        <button
                                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-neutral-dark"
                                        >
                                            {avatarUrl ? (
                                                <img src={avatarUrl} alt={userName} className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-200" />
                                            ) : (
                                                <span className="flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold ring-2 bg-gray-100 text-text-dark ring-gray-200">
                                                    {initials}
                                                </span>
                                            )}
                                            <span className="text-sm font-medium max-w-[100px] truncate hidden xl:block text-text-dark">
                                                {userName || 'Profile'}
                                            </span>
                                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${userMenuOpen ? 'rotate-180' : ''} text-text-medium`} />
                                        </button>

                                        {userMenuOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 custom-dropdown-anim">
                                                <div className="px-4 py-2.5 border-b border-gray-100">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{userName || 'User'}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">Manage your account</p>
                                                </div>

                                                {/* ── Account ── */}
                                                <div className="px-4 pt-2 pb-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Account</p>
                                                </div>
                                                <Link
                                                    href="/my-profile"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-medium hover:bg-primary/5 hover:text-primary transition-colors"
                                                >
                                                    <User className="h-4 w-4 text-gray-400" /> My Profile
                                                </Link>

                                                {/* ── Activity ── */}
                                                <div className="border-t border-gray-100 mt-1" />
                                                <div className="px-4 pt-2 pb-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Activity</p>
                                                </div>
                                                <Link
                                                    href="/my-profile/invitations"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-medium hover:bg-primary/5 hover:text-primary transition-colors"
                                                >
                                                    <Mail className="h-4 w-4 text-gray-400" /> My Invitations
                                                </Link>
                                                <Link
                                                    href="/my-profile/tickets"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-medium hover:bg-primary/5 hover:text-primary transition-colors"
                                                >
                                                    <Ticket className="h-4 w-4 text-gray-400" /> My Tickets
                                                </Link>
                                                <Link
                                                    href="/my-profile/payments"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-medium hover:bg-primary/5 hover:text-primary transition-colors"
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
                                </>
                            ) : isMounted ? (
                                <div className="flex items-center gap-3 ml-2">
                                    <Link href="/auth/login" className="text-sm font-medium transition-colors text-text-medium hover:text-primary">
                                        Log in
                                    </Link>
                                    <Link href="/auth/register" className="text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors bg-primary text-white hover:bg-primary-dark shadow-sm">
                                        Sign Up
                                    </Link>
                                </div>
                            ) : null}
                        </div>

                        {/* ── Mobile: Hamburger ── */}
                        <button
                            className="lg:hidden p-2 rounded-lg transition-colors text-text-dark hover:bg-neutral-dark"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>

                    </div>
                </div>
            </div>

            {/* ── Mobile Menu ── */}
            {isMenuOpen && (
                <div className="lg:hidden border-t shadow-xl bg-white/95 backdrop-blur-xl border-neutral-dark">
                    <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
                        {/* Primary links */}
                        {PRIMARY_NAV.map((link) => (
                            <Link
                                key={link.name}
                                href={link.path}
                                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isPrimaryActive(link.path, link.exact)
                                    ? 'text-primary bg-primary/8'
                                    : 'text-text-medium hover:bg-neutral-dark hover:text-text-dark'
                                    }`}
                            >
                                {link.name}
                            </Link>
                        ))}

                        {/* Workspace section */}
                        {isMounted && userId && (
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
                                                className={`flex items-center gap-3 pl-8 pr-4 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.startsWith(item.path)
                                                    ? 'text-primary bg-primary/8'
                                                    : 'text-text-medium hover:bg-neutral-dark hover:text-text-dark'
                                                    }`}
                                            >
                                                <span className="text-gray-400">{item.icon}</span>
                                                {item.name}
                                            </Link>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Account actions */}
                        <div className="border-t pt-2 mt-2 space-y-1">
                            {isMounted && userId ? (
                                <>
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
                                </>
                            ) : isMounted ? (
                                <>
                                    <Link
                                        href="/auth/login"
                                        className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href="/auth/register"
                                        className="block px-4 py-2.5 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors mt-1"
                                    >
                                        Sign up
                                    </Link>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </header>
    )
}
