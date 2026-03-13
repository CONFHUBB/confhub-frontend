'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, Search, PlusCircle, LogOut, User } from 'lucide-react'
import { MockRole, useMockRole } from '@/hooks/useMockRole'

export function AppNavbar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)
    const { selectedRole, setSelectedRole } = useMockRole()

    const navLinks = React.useMemo(() => {
        const links = [
            { name: 'Home', path: '/' },
            { name: 'Conferences', path: '/conference' },
        ]

        if (selectedRole === 'Organizer' || selectedRole === 'Program Chair') {
            links.push({ name: 'My Conferences', path: '/conference/my-conference' })
        }

        links.push({ name: 'My Papers', path: '/paper' })
        links.push({ name: 'Profile', path: '/my-profile' })

        return links
    }, [selectedRole])

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
            <div className="bg-[#34c6eb] px-80 h-21 flex items-center justify-around">
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
                        <button className="px-4 h-full bg-gray-50 text-gray-600 text-sm font-semibold border-l hover:bg-gray-100 transition-colors tracking-wide">
                            Search
                        </button>
                    </div>
                </div>

                {/* Right Actions (Desktop) */}
                <div className="hidden md:flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-2">
                        <label htmlFor="role-switcher" className="sr-only">Mock role</label>
                        <select
                            id="role-switcher"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as MockRole)}
                            className="h-10 rounded-md border border-white/30 bg-white/10 px-3 text-sm font-medium text-white/90 backdrop-blur hover:bg-white/20 focus:outline-none"
                        >
                            <option className="text-gray-800" value="Author">Author</option>
                            <option className="text-gray-800" value="Organizer">Organizer</option>
                            <option className="text-gray-800" value="Program Chair">Program Chair</option>
                        </select>
                    </div>
                    <Link
                        href="/conference/create"
                        className="flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white px-3 py-1.5 rounded hover:bg-white/10 transition-colors"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Create Conference
                    </Link>
                    <div className="h-5 w-px bg-white/25 mx-1" />
                    <Link
                        href="/my-profile"
                        className="flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white px-3 py-1.5 rounded hover:bg-white/10 transition-colors"
                    >
                        <User className="h-4 w-4" />
                        Profile
                    </Link>
                    <div className="h-5 w-px bg-white/25 mx-1" />
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white px-3 py-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
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
                    <div className="p-3 border-b bg-gray-50">
                        <label htmlFor="mobile-role-switcher" className="block text-xs font-semibold text-gray-600 mb-1">
                            Mock Role
                        </label>
                        <select
                            id="mobile-role-switcher"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as MockRole)}
                            className="w-full rounded-md border px-3 py-2 text-sm"
                        >
                            <option value="Author">Author</option>
                            <option value="Organizer">Organizer</option>
                            <option value="Program Chair">Program Chair</option>
                        </select>
                    </div>

                    {/* Mobile Search */}
                    <div className="p-3 border-b bg-gray-50">
                        <div className="flex items-center w-full bg-white border rounded-md h-9 overflow-hidden">
                            <span className="pl-3 pr-2 text-gray-400">
                                <Search className="h-4 w-4" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search conferences, papers..."
                                className="flex-1 w-full h-full outline-none text-sm text-gray-700"
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
                                    className={`block px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'text-indigo-600 bg-indigo-50 border-l-2 border-indigo-600' : 'text-gray-700 hover:bg-gray-50'}`}
                                >
                                    {link.name}
                                </Link>
                            )
                        })}
                    </div>

                    {/* Mobile Actions */}
                    <div className="border-t p-3 space-y-2">
                        <Link
                            href="/conference/create"
                            className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Create Conference
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
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
