"use client"

import Link from "next/link"
import { Play, FileText, Users, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DemoConference() {
    return (
        <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-10 md:p-16">
                    {/* Background decoration */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-300/10 rounded-full blur-3xl" />
                    </div>

                    <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
                        {/* Left: Text */}
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-6">
                                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Try It Free</span>
                            </div>

                            <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
                                Explore Our
                                <br />
                                <span className="bg-gradient-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent">
                                    Demo Conference
                                </span>
                            </h2>
                            <p className="mt-4 text-white/70 text-lg leading-relaxed max-w-md">
                                See the full conference workflow in action — from paper submission and peer review to final decisions and publication.
                            </p>

                            <div className="mt-8 flex flex-col sm:flex-row gap-3">
                                <Button
                                    asChild
                                    size="lg"
                                    className="bg-white text-indigo-700 hover:bg-gray-100 rounded-full px-8 h-12 font-semibold shadow-lg"
                                >
                                    <Link href="/conference">
                                        <Play className="h-4 w-4 mr-2" />
                                        Explore Demo
                                    </Link>
                                </Button>
                                <Link
                                    href="/auth/register"
                                    className="inline-flex items-center justify-center gap-2 rounded-full px-8 h-12 text-base font-semibold border-2 border-white/40 text-white bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    Get Started Free
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        {/* Right: Feature cards */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { icon: <FileText className="h-5 w-5" />, label: "Sample Papers", desc: "Browse pre-loaded research papers" },
                                { icon: <Users className="h-5 w-5" />, label: "Review Flow", desc: "Experience the peer review process" },
                                { icon: <Play className="h-5 w-5" />, label: "Live Demo", desc: "Interactive conference walkthrough" },
                                { icon: <Sparkles className="h-5 w-5" />, label: "Full Features", desc: "Explore all platform capabilities" },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform">
                                        {item.icon}
                                    </div>
                                    <h4 className="text-sm font-bold text-white">{item.label}</h4>
                                    <p className="text-xs text-white/50 mt-1">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
