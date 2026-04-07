"use client"

import { useEffect, useRef } from "react"
import { FileInput, ScanSearch, BookOpen, Check, ChevronRight, File, FileText, AlertCircle, BookMarked, Download } from "lucide-react"

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

function CheckItem({ text }: { text: string }) {
    return (
        <li className="flex items-start gap-3">
            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-green-600" />
            </div>
            <span className="text-sm text-text-medium">{text}</span>
        </li>
    )
}

export function HowItWorks() {
    const ref = useFadeIn()

    return (
        <section id="features" className="py-20 lg:py-28 bg-neutral" ref={ref}>
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                {/* Section header */}
                <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20 fade-in">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/8 border border-primary/15 rounded-full mb-4">
                        <span className="text-xs font-medium text-primary">Core Workflows</span>
                    </div>
                    <h2 className="font-heading font-bold text-3xl lg:text-4xl text-text-dark tracking-tight mb-4">
                        Everything you need, nothing you don&apos;t
                    </h2>
                    <p className="text-text-medium leading-relaxed">
                        Three powerful workflows that replace scattered tools, email chains, and manual tracking.
                    </p>
                </div>

                {/* ── Feature 1: Left Text, Right Mockup ── */}
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20 lg:mb-28 fade-in">
                    <div>
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
                            <FileInput className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-heading font-bold text-2xl lg:text-3xl text-text-dark mb-4">
                            Submission Management
                        </h3>
                        <p className="text-text-medium leading-relaxed mb-6">
                            Collect, organize, and track paper submissions with a streamlined portal that authors actually enjoy using. No more lost emails or confused contributors.
                        </p>
                        <ul className="space-y-3">
                            <CheckItem text="Custom submission forms with LaTeX & PDF preview" />
                            <CheckItem text="Automatic format validation and plagiarism check" />
                            <CheckItem text="Real-time status tracking dashboard for organizers" />
                            <CheckItem text="Co-author management and conflict-of-interest detection" />
                        </ul>
                    </div>
                    <div className="relative">
                        <div className="absolute -inset-3 bg-gradient-to-br from-primary/8 to-tertiary/8 rounded-3xl blur-xl" />
                        <div className="relative bg-white rounded-2xl shadow-xl shadow-secondary/8 border border-secondary/8 overflow-hidden p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <div className="text-sm font-heading font-semibold text-text-dark">Submissions</div>
                                    <div className="text-xs text-text-light">ICML 2025 — 342 received</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { title: "Attention Is All You Need — Revisited", author: "Chen et al. · 12 pages · PDF", status: "Valid", statusCls: "bg-green-50 text-green-700", icon: <File className="w-3.5 h-3.5 text-primary" />, iconBg: "bg-primary/10" },
                                    { title: "Scalable Graph Neural Networks", author: "Park et al. · 9 pages · LaTeX", status: "Review", statusCls: "bg-yellow-50 text-yellow-700", icon: <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />, iconBg: "bg-yellow-50" },
                                    { title: "Federated Learning for Healthcare", author: "Singh et al. · 14 pages · PDF", status: "Valid", statusCls: "bg-green-50 text-green-700", icon: <File className="w-3.5 h-3.5 text-primary" />, iconBg: "bg-primary/10" },
                                ].map((item) => (
                                    <div key={item.title} className="flex items-center justify-between p-3 bg-neutral rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 ${item.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                                {item.icon}
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium text-text-dark">{item.title}</div>
                                                <div className="text-[10px] text-text-light">{item.author}</div>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${item.statusCls}`}>{item.status}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-secondary/8 flex items-center justify-between">
                                <span className="text-[10px] text-text-light">Showing 3 of 342 submissions</span>
                                <span className="text-[10px] font-medium text-primary">View All →</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Feature 2: Right Text, Left Mockup ── */}
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20 lg:mb-28 fade-in">
                    <div className="order-2 lg:order-1 relative">
                        <div className="absolute -inset-3 bg-gradient-to-bl from-tertiary/8 to-primary/8 rounded-3xl blur-xl" />
                        <div className="relative bg-white rounded-2xl shadow-xl shadow-secondary/8 border border-secondary/8 overflow-hidden p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-tertiary/20 rounded-lg flex items-center justify-center">
                                    <ScanSearch className="w-4 h-4 text-secondary" />
                                </div>
                                <div>
                                    <div className="text-sm font-heading font-semibold text-text-dark">Review Pipeline</div>
                                    <div className="text-xs text-text-light">Bid → Assign → Review → Decision</div>
                                </div>
                            </div>
                            {/* Pipeline steps */}
                            <div className="flex items-center gap-2 mb-5">
                                <div className="flex-1 bg-primary text-white text-center py-2 rounded-lg text-[10px] font-semibold">Bidding</div>
                                <ChevronRight className="w-4 h-4 text-text-light flex-shrink-0" />
                                <div className="flex-1 bg-primary text-white text-center py-2 rounded-lg text-[10px] font-semibold">Assignment</div>
                                <ChevronRight className="w-4 h-4 text-text-light flex-shrink-0" />
                                <div className="flex-1 bg-tertiary text-white text-center py-2 rounded-lg text-[10px] font-semibold">Review</div>
                                <ChevronRight className="w-4 h-4 text-text-light flex-shrink-0" />
                                <div className="flex-1 bg-neutral text-text-light text-center py-2 rounded-lg text-[10px] font-medium border border-secondary/10">Decision</div>
                            </div>
                            {/* AI match score */}
                            <div className="bg-neutral rounded-xl p-3 mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-medium text-text-medium">AI Match Score</span>
                                    <span className="text-[10px] font-bold text-primary">94%</span>
                                </div>
                                <div className="w-full h-1.5 bg-secondary/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full" style={{ width: "94%" }} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-neutral rounded-xl p-3 text-center">
                                    <div className="font-heading font-bold text-lg text-text-dark">2.1<span className="text-sm text-text-light">d</span></div>
                                    <div className="text-[10px] text-text-light">Avg Review Time</div>
                                </div>
                                <div className="bg-neutral rounded-xl p-3 text-center">
                                    <div className="font-heading font-bold text-lg text-text-dark">3.2</div>
                                    <div className="text-[10px] text-text-light">Reviews/Paper</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2">
                        <div className="w-12 h-12 bg-tertiary/20 rounded-2xl flex items-center justify-center mb-5">
                            <ScanSearch className="w-6 h-6 text-secondary" />
                        </div>
                        <h3 className="font-heading font-bold text-2xl lg:text-3xl text-text-dark mb-4">
                            Automated Peer Review
                        </h3>
                        <p className="text-text-medium leading-relaxed mb-6">
                            AI-powered reviewer matching, bidding workflows, and automated reminders ensure every paper gets fair, timely, and expert review — without manual coordination overhead.
                        </p>
                        <ul className="space-y-3">
                            <CheckItem text="Smart reviewer-paper matching based on expertise profiles" />
                            <CheckItem text="Configurable bidding system with conflict detection" />
                            <CheckItem text="Structured review forms with customizable scoring criteria" />
                            <CheckItem text="Automated escalation for overdue reviews" />
                        </ul>
                    </div>
                </div>

                {/* ── Feature 3: Left Text, Right Mockup ── */}
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center fade-in">
                    <div>
                        <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mb-5">
                            <BookOpen className="w-6 h-6 text-secondary-dark" />
                        </div>
                        <h3 className="font-heading font-bold text-2xl lg:text-3xl text-text-dark mb-4">
                            Digital Proceedings
                        </h3>
                        <p className="text-text-medium leading-relaxed mb-6">
                            Generate beautiful, DOI-backed digital proceedings automatically. From camera-ready collection to final publication — produce professional outputs in hours, not weeks.
                        </p>
                        <ul className="space-y-3">
                            <CheckItem text="Auto-generated proceedings with consistent formatting" />
                            <CheckItem text="DOI assignment and metadata management" />
                            <CheckItem text="Public browsing portal with search and filtering" />
                            <CheckItem text="Export to PDF, EPUB, and machine-readable formats" />
                        </ul>
                    </div>
                    <div className="relative">
                        <div className="absolute -inset-3 bg-gradient-to-br from-secondary/8 to-tertiary/8 rounded-3xl blur-xl" />
                        <div className="relative bg-white rounded-2xl shadow-xl shadow-secondary/8 border border-secondary/8 overflow-hidden p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                                    <BookMarked className="w-4 h-4 text-secondary" />
                                </div>
                                <div>
                                    <div className="text-sm font-heading font-semibold text-text-dark">Proceedings</div>
                                    <div className="text-xs text-text-light">NeurIPS 2024 — Published</div>
                                </div>
                                <span className="ml-auto text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">Live</span>
                            </div>
                            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-xl p-4 mb-3 text-white">
                                <div className="text-xs font-medium opacity-80 mb-1">Proceedings of NeurIPS 2024</div>
                                <div className="font-heading font-bold text-lg">Advances in Neural Information Processing Systems</div>
                                <div className="flex items-center gap-3 mt-2 text-[10px] opacity-70">
                                    <span>1,247 papers</span>
                                    <span>·</span>
                                    <span>DOI: 10.5555/neurips.2024</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {[
                                    { title: "Diffusion Models for Protein Design", pages: "pp. 1–14 · DOI: 10.5555/001" },
                                    { title: "Efficient Fine-Tuning via LoRA", pages: "pp. 15–28 · DOI: 10.5555/002" },
                                ].map((paper) => (
                                    <div key={paper.title} className="flex items-center gap-3 p-2 bg-neutral rounded-lg">
                                        <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-3 h-3 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-medium text-text-dark truncate">{paper.title}</div>
                                            <div className="text-[10px] text-text-light">{paper.pages}</div>
                                        </div>
                                        <Download className="w-3.5 h-3.5 text-text-light flex-shrink-0" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
