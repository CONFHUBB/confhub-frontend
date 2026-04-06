"use client"

import Link from "next/link"
import Image from "next/image"
import { Mail } from "lucide-react"

const FOOTER_LINKS = {
    Platform: [
        { name: "Browse Conferences", path: "/conference" },
        { name: "Create Conference", path: "/conference/create" },
        { name: "My Papers", path: "/paper" },
        { name: "My Invitations", path: "/my-profile/invitations" },
    ],
    Resources: [
        { name: "Getting Started", path: "/conference" },
        { name: "Submission Guide", path: "/conference" },
        { name: "Review Process", path: "/conference" },
        { name: "FAQ", path: "/conference" },
    ],
    Company: [
        { name: "About ConfHub", path: "/conference" },
        { name: "Contact Us", path: "/conference" },
        { name: "Terms of Service", path: "/conference" },
        { name: "Privacy Policy", path: "/conference" },
    ],
}

export function AppFooter() {
    return (
        <footer className="bg-gray-900 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Main Footer */}
                <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
                    {/* Brand */}
                    <div className="lg:col-span-2">
                        <Link href="/" className="inline-flex items-center gap-2">
                            <Image
                                src="/images/Favicon-White.png"
                                alt="ConfHub"
                                width={32}
                                height={32}
                                className="h-8 w-auto object-contain"
                            />
                            <Image
                                src="/images/White.png"
                                alt="ConfHub"
                                width={100}
                                height={40}
                                className="h-6 w-auto object-contain"
                            />
                        </Link>
                        <p className="mt-4 text-sm text-gray-400 max-w-sm leading-relaxed">
                            The all-in-one platform for managing academic conferences. Streamline submissions, reviews, and publications with our modern tools.
                        </p>
                        {/* Newsletter */}
                        <div className="mt-6">
                            <p className="text-sm font-semibold text-white mb-3">Subscribe to our newsletter</p>
                            <form className="flex gap-2">
                                <div className="flex items-center flex-1 bg-gray-800 rounded-lg overflow-hidden border border-gray-700 focus-within:border-indigo-500 transition-colors">
                                    <Mail className="ml-3 h-4 w-4 text-gray-500 shrink-0" aria-hidden="true" />
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        autoComplete="email"
                                        className="flex-1 px-3 py-2.5 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
                                >
                                    Subscribe
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Links */}
                    {Object.entries(FOOTER_LINKS).map(([category, links]) => (
                        <div key={category}>
                            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                                {category}
                            </h4>
                            <ul className="space-y-3">
                                {links.map((link) => (
                                    <li key={link.name}>
                                        <Link
                                            href={link.path}
                                            className="text-sm text-gray-400 hover:text-white transition-colors"
                                        >
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-800 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-gray-500">
                        &copy; {new Date().getFullYear()} ConfHub. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="/conference" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacy Policy</Link>
                        <Link href="/conference" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Terms of Service</Link>
                        <Link href="/conference" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Cookie Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
