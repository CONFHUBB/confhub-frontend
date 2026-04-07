"use client"

import Link from "next/link"
import { Twitter, Linkedin, Github, Heart } from "lucide-react"

const FOOTER_LINKS = {
    Product: [
        { name: "Features", path: "/#features" },
        { name: "Pricing", path: "/#pricing" },
        { name: "Integrations", path: "/conference" },
        { name: "Changelog", path: "/conference" },
    ],
    Resources: [
        { name: "Documentation", path: "/conference" },
        { name: "API Reference", path: "/conference" },
        { name: "Blog", path: "/conference" },
        { name: "Help Center", path: "/conference" },
    ],
    Company: [
        { name: "About", path: "/conference" },
        { name: "Careers", path: "/conference" },
        { name: "Contact", path: "/conference" },
        { name: "Partners", path: "/conference" },
    ],
    Legal: [
        { name: "Privacy Policy", path: "/conference" },
        { name: "Terms of Service", path: "/conference" },
        { name: "GDPR", path: "/conference" },
        { name: "Security", path: "/conference" },
    ],
}

const SOCIALS = [
    { Icon: Twitter, label: "Twitter" },
    { Icon: Linkedin, label: "LinkedIn" },
    { Icon: Github, label: "GitHub" },
]

export function HomeFooter() {
    return (
        <footer className="bg-text-dark pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* Main grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
                    {/* Brand column */}
                    <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
                        <Link href="/" className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
                                    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
                                    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
                                </svg>
                            </div>
                            <span className="font-heading font-bold text-xl text-white">
                                Conf<span className="text-tertiary">Hub</span>
                            </span>
                        </Link>
                        <p className="text-sm text-white/40 leading-relaxed max-w-xs mb-5">
                            End-to-end conference management platform for the academic community.
                        </p>
                        <div className="flex items-center gap-3">
                            {SOCIALS.map(({ Icon, label }) => (
                                <a
                                    key={label}
                                    href="#"
                                    aria-label={label}
                                    className="w-9 h-9 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                                >
                                    <Icon className="w-4 h-4 text-white/60" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {Object.entries(FOOTER_LINKS).map(([category, links]) => (
                        <div key={category}>
                            <h4 className="font-heading font-semibold text-sm text-white mb-4">{category}</h4>
                            <ul className="space-y-2.5">
                                {links.map((link) => (
                                    <li key={link.name}>
                                        <Link
                                            href={link.path}
                                            className="text-sm text-white/40 hover:text-tertiary transition-colors"
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
                    <p className="text-xs text-white/30 flex items-center gap-1">
                        Made with <Heart className="w-3 h-3 text-primary inline mx-0.5" /> for the academic community
                    </p>
                </div>
            </div>
        </footer>
    )
}
