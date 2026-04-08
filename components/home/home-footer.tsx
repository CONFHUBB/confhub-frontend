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

export function HomeFooter() {
    return (
        <footer className="bg-text-dark pt-16 pb-8 border-t border-white/8">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* Main grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
                    {/* Brand column */}
                    <div className="lg:col-span-2">
                        <Link href="/" className="inline-flex items-center gap-2 mb-4">
                            <Image
                                src="/images/favicon-blue.png"
                                alt="ConfHub"
                                width={32}
                                height={32}
                                className="h-8 w-auto object-contain"
                            />
                            <Image
                                src="/images/logo-blue.png"
                                alt="ConfHub"
                                width={100}
                                height={40}
                                className="h-6 w-auto object-contain"
                            />
                        </Link>
                        <p className="text-sm text-white/40 leading-relaxed max-w-sm mb-6">
                            The all-in-one platform for managing academic conferences. Streamline submissions, reviews, and publications with our modern tools.
                        </p>
                        {/* Newsletter */}
                        <div>
                            <p className="text-sm font-semibold text-white mb-3">Subscribe to our newsletter</p>
                            <form className="flex gap-2">
                                <div className="flex items-center flex-1 bg-white/5 rounded-lg overflow-hidden border border-white/10 focus-within:border-primary transition-colors">
                                    <Mail className="ml-3 h-4 w-4 text-white/30 shrink-0" aria-hidden="true" />
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        autoComplete="email"
                                        className="flex-1 px-3 py-2.5 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors shrink-0"
                                >
                                    Subscribe
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Link columns */}
                    {Object.entries(FOOTER_LINKS).map(([category, links]) => (
                        <div key={category}>
                            <h4 className="font-heading font-semibold text-sm text-white uppercase tracking-wider mb-4">
                                {category}
                            </h4>
                            <ul className="space-y-3">
                                {links.map((link) => (
                                    <li key={link.name}>
                                        <Link
                                            href={link.path}
                                            className="text-sm text-white/40 hover:text-white transition-colors"
                                        >
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-white/30">
                        © {new Date().getFullYear()} ConfHub. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="/conference" className="text-xs text-white/30 hover:text-white/60 transition-colors">Privacy Policy</Link>
                        <Link href="/conference" className="text-xs text-white/30 hover:text-white/60 transition-colors">Terms of Service</Link>
                        <Link href="/conference" className="text-xs text-white/30 hover:text-white/60 transition-colors">Cookie Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
