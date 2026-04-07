"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight, PlayCircle } from "lucide-react"

function useFadeInObserver() {
    const ref = useRef<HTMLDivElement>(null)
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

export function HeroSection() {
    const ref = useFadeInObserver()

    return (
        <section className="pt-28 pb-16 lg:pt-36 lg:pb-24 bg-neutral" ref={ref}>
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* ── Left Content ── */}
                    <div className="max-w-xl">
                        <div className="fade-in">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/8 border border-primary/15 rounded-full mb-6">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                <span className="text-xs font-medium text-primary">Trusted by 500+ conferences</span>
                            </div>
                        </div>

                        <h1 className="fade-in font-heading font-extrabold text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.1] tracking-tight text-text-dark mb-6">
                            Manage Academic Conferences from A-Z without{" "}
                            <span className="text-primary relative">
                                Spreadsheets.
                                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                                    <path d="M2 6C50 2 150 2 198 6" stroke="#8EACBB" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                            </span>
                        </h1>

                        <p className="fade-in text-base lg:text-lg text-text-medium leading-relaxed mb-8 max-w-md">
                            End-to-end automation for paper submissions, peer review, scheduling, and digital proceedings — all in one platform built for academia.
                        </p>

                        <div className="fade-in flex flex-wrap gap-3">
                            <Link
                                href="/conference/create"
                                className="btn-press inline-flex items-center gap-2 px-7 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                            >
                                Start Free Trial
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/conference"
                                className="btn-press inline-flex items-center gap-2 px-7 py-3 bg-white text-text-dark font-semibold rounded-xl border border-secondary/20 hover:border-primary/40 hover:text-primary transition-all"
                            >
                                <PlayCircle className="w-4 h-4" />
                                Browse Conferences
                            </Link>
                        </div>

                        <div className="fade-in flex items-center gap-6 mt-8 pt-8 border-t border-secondary/10">
                            <div>
                                <div className="font-heading font-bold text-2xl text-text-dark">10K+</div>
                                <div className="text-xs text-text-light">Papers Managed</div>
                            </div>
                            <div className="w-px h-10 bg-secondary/15" />
                            <div>
                                <div className="font-heading font-bold text-2xl text-text-dark">500+</div>
                                <div className="text-xs text-text-light">Conferences</div>
                            </div>
                            <div className="w-px h-10 bg-secondary/15" />
                            <div>
                                <div className="font-heading font-bold text-2xl text-text-dark">98%</div>
                                <div className="text-xs text-text-light">Satisfaction</div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Dashboard Mockup ── */}
                    <div className="fade-in float-anim relative">
                        <div className="relative">
                            {/* Background glow */}
                            <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-tertiary/10 to-transparent rounded-3xl blur-2xl" />

                            {/* Main card */}
                            <div className="relative bg-white rounded-2xl shadow-2xl shadow-primary/10 border border-secondary/8 overflow-hidden">
                                {/* Browser top bar */}
                                <div className="flex items-center gap-2 px-5 py-3 bg-neutral border-b border-secondary/8">
                                    <div className="w-3 h-3 rounded-full bg-red-400/70" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                                    <div className="w-3 h-3 rounded-full bg-green-400/70" />
                                    <div className="ml-4 flex-1 h-5 bg-white rounded-md border border-secondary/10" />
                                </div>

                                {/* Dashboard content */}
                                <div className="p-5">
                                    {/* Header row */}
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <div className="font-heading font-bold text-sm text-text-dark">Reviewer Assignments</div>
                                            <div className="text-xs text-text-light mt-0.5">ICML 2025 — Auto-matched</div>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                            Live
                                        </div>
                                    </div>

                                    {/* Stats row */}
                                    <div className="grid grid-cols-3 gap-3 mb-5">
                                        <div className="bg-neutral rounded-xl p-3">
                                            <div className="text-xs text-text-light mb-1">Assigned</div>
                                            <div className="font-heading font-bold text-lg text-primary">247</div>
                                        </div>
                                        <div className="bg-neutral rounded-xl p-3">
                                            <div className="text-xs text-text-light mb-1">Pending</div>
                                            <div className="font-heading font-bold text-lg text-yellow-600">38</div>
                                        </div>
                                        <div className="bg-neutral rounded-xl p-3">
                                            <div className="text-xs text-text-light mb-1">Completed</div>
                                            <div className="font-heading font-bold text-lg text-green-600">209</div>
                                        </div>
                                    </div>

                                    {/* Table header */}
                                    <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-text-light uppercase tracking-wider">
                                        <div className="col-span-4">Reviewer</div>
                                        <div className="col-span-3">Expertise</div>
                                        <div className="col-span-2">Papers</div>
                                        <div className="col-span-3">Status</div>
                                    </div>

                                    {/* Table rows */}
                                    <div className="space-y-1.5">
                                        {[
                                            { initials: "JL", name: "Dr. J. Lee", tag: "NLP", papers: 12, status: "Done", statusCls: "bg-green-50 text-green-700" },
                                            { initials: "AK", name: "Prof. A. Kumar", tag: "CV", papers: 8, status: "In Progress", statusCls: "bg-yellow-50 text-yellow-700" },
                                            { initials: "SM", name: "Dr. S. Müller", tag: "RL", papers: 10, status: "Done", statusCls: "bg-green-50 text-green-700" },
                                            { initials: "CW", name: "Prof. C. Wang", tag: "ML", papers: 6, status: "Assigned", statusCls: "bg-blue-50 text-primary" },
                                        ].map((row) => (
                                            <div key={row.initials} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 bg-neutral/60 rounded-lg">
                                                <div className="col-span-4 flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                                                        {row.initials}
                                                    </div>
                                                    <span className="text-xs font-medium text-text-dark truncate">{row.name}</span>
                                                </div>
                                                <div className="col-span-3">
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-tertiary/20 text-secondary rounded">{row.tag}</span>
                                                </div>
                                                <div className="col-span-2 text-xs text-text-medium">{row.papers}</div>
                                                <div className="col-span-3">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${row.statusCls}`}>{row.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
