"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

function useFadeIn() {
    const ref = useRef<HTMLElement>(null)
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible")
                        observer.unobserve(entry.target)
                    }
                })
            },
            { root: null, rootMargin: "0px 0px -60px 0px", threshold: 0.1 }
        )
        const el = ref.current
        if (!el) return
        el.querySelectorAll(".fade-in").forEach((el) => observer.observe(el))
        return () => observer.disconnect()
    }, [])
    return ref
}

export function CTASection() {
    const ref = useFadeIn()

    return (
        <section className="relative overflow-hidden" ref={ref}>
            {/* Solid primary background */}
            <div className="absolute inset-0 bg-primary" />

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="cta-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#cta-grid)" />
                </svg>
            </div>

            {/* Decorative blurs */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-tertiary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative max-w-4xl mx-auto px-6 lg:px-8 py-20 lg:py-28 text-center fade-in">
                <h2 className="font-heading font-bold text-3xl lg:text-5xl text-white tracking-tight mb-5 leading-tight">
                    Ready to digitize your<br className="hidden sm:block" /> conference workflow?
                </h2>
                <p className="text-lg text-white/75 mb-10 max-w-xl mx-auto leading-relaxed">
                    Join 500+ academic conferences that have eliminated manual work and embraced end-to-end automation.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Link
                        href="/conference/create"
                        className="btn-press inline-flex items-center gap-2 px-8 py-4 bg-white text-primary font-semibold rounded-xl hover:bg-neutral transition-colors shadow-xl text-base"
                    >
                        Start Free Trial
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link
                        href="/conference"
                        className="btn-press inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-colors text-base"
                    >
                        Browse Conferences
                    </Link>
                </div>
                <p className="text-sm text-white/50 mt-6">
                    No credit card required · Free for conferences under 50 submissions
                </p>
            </div>
        </section>
    )
}
