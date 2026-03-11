'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'

const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Conferences', path: '/conference' },
    { name: 'My Papers', path: '/paper' },
    { name: 'Profile', path: '/my-profile' },
]

export function AppNavbar() {
    const pathname = usePathname()
    const router = useRouter()

    const [isScrolled, setIsScrolled] = React.useState(false)
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('accessToken')
        router.push('/auth/login')
    }

    return (
        <nav className={`fixed top-0 left-0 bg-black w-full flex items-center justify-between px-4 md:px-16 lg:px-24 xl:px-32 transition-all duration-500 z-50 ${isScrolled ? "bg-white/80 shadow-md text-gray-700 backdrop-blur-lg py-3 md:py-4" : "py-4 md:py-1"}`}>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
                <Image src="/images/Logo2.webp" alt="ConfMS Logo" width={157} height={80} className={`h-20 w-auto ${isScrolled && "invert opacity-80"}`} priority />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-4 lg:gap-8">
                {navLinks.map((link, i) => (
                    <Link key={i} href={link.path} className={`group flex flex-col gap-0.5 ${isScrolled ? "text-gray-700" : "text-white"}`}>
                        {link.name}
                        <div className={`${isScrolled ? "bg-gray-700" : "bg-white"} h-0.5 ${pathname === link.path ? 'w-full' : 'w-0'} group-hover:w-full transition-all duration-300`} />
                    </Link>
                ))}
                <Link href="/conference/create" className={`border px-4 py-1 text-sm font-light rounded-full cursor-pointer ${isScrolled ? 'text-black' : 'text-white'} transition-all`}>
                    Create Conference
                </Link>
            </div>

            {/* Desktop Right */}
            <div className="hidden md:flex items-center gap-4">
                <svg className={`h-6 w-6 text-white transition-all duration-500 ${isScrolled ? "invert" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <button onClick={handleLogout} className={`px-8 py-2.5 rounded-full ml-4 transition-all duration-500 cursor-pointer ${isScrolled ? "text-white bg-black" : "bg-white text-black"}`}>
                    Logout
                </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-3 md:hidden">
                <svg onClick={() => setIsMenuOpen(!isMenuOpen)} className={`h-6 w-6 cursor-pointer ${isScrolled ? "invert" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
            </div>

            {/* Mobile Menu */}
            <div className={`fixed top-0 left-0 w-full h-screen bg-white text-base flex flex-col md:hidden items-center justify-center gap-6 font-medium text-gray-800 transition-all duration-500 ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <button className="absolute top-4 right-4" onClick={() => setIsMenuOpen(false)}>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {navLinks.map((link, i) => (
                    <Link key={i} href={link.path} onClick={() => setIsMenuOpen(false)} className={pathname === link.path ? 'text-indigo-600 font-bold' : ''}>
                        {link.name}
                    </Link>
                ))}

                <Link href="/conference/create" onClick={() => setIsMenuOpen(false)} className="border px-4 py-1 text-sm font-light rounded-full cursor-pointer transition-all">
                    Create Conference
                </Link>

                <button onClick={() => { setIsMenuOpen(false); handleLogout() }} className="bg-black text-white px-8 py-2.5 rounded-full transition-all duration-500 cursor-pointer">
                    Logout
                </button>
            </div>
        </nav>
    )
}
