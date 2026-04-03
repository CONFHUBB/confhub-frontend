"use client"

import Link from "next/link"
import { Play, Calendar, MapPin, Users, FileText, CheckCircle2 } from "lucide-react"

const HIGHLIGHTS = [
    "Full conference management dashboard",
    "Automated peer review workflows",
    "Real-time paper status tracking",
    "Built-in video conferencing integration",
]

export function DemoConference() {
    return (
        <section className="bg-gray-900 py-16 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Text */}
                    <div>
                        <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase mb-4">
                            Live Demo
                        </span>
                        <h2 className="text-3xl font-extrabold text-white tracking-tight">
                            See ConfHub in Action
                        </h2>
                        <p className="mt-4 text-gray-400 leading-relaxed">
                            Explore our interactive demo conference. Get a firsthand look at how ConfHub
                            streamlines the entire conference lifecycle — from submission to publication.
                        </p>

                        {/* Highlights */}
                        <ul className="mt-6 space-y-3">
                            {HIGHLIGHTS.map((item) => (
                                <li key={item} className="flex items-start gap-3">
                                    <CheckCircle2
                                        className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5"
                                        aria-hidden="true"
                                    />
                                    <span className="text-sm text-gray-300">{item}</span>
                                </li>
                            ))}
                        </ul>

                        {/* Stats preview */}
                        <div className="mt-8 grid grid-cols-3 gap-4">
                            <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700">
                                <div className="text-2xl font-bold text-white">24</div>
                                <div className="text-xs text-gray-500 mt-0.5">Tracks</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700">
                                <div className="text-2xl font-bold text-white">156</div>
                                <div className="text-xs text-gray-500 mt-0.5">Papers</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700">
                                <div className="text-2xl font-bold text-white">312</div>
                                <div className="text-xs text-gray-500 mt-0.5">Reviewers</div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="mt-8 flex flex-col sm:flex-row gap-3">
                            <Link
                                href="/conference/1"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                            >
                                <Play className="h-4 w-4" aria-hidden="true" />
                                Explore Demo
                            </Link>
                            <Link
                                href="/conference/create"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-600 text-gray-300 font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                            >
                                Start for Free
                            </Link>
                        </div>
                    </div>

                    {/* Right: Visual */}
                    <div className="relative">
                        {/* Main card */}
                        <div className="relative bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
                            {/* Window chrome */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-700">
                                <span className="w-3 h-3 rounded-full bg-red-500" aria-hidden="true" />
                                <span className="w-3 h-3 rounded-full bg-yellow-500" aria-hidden="true" />
                                <span className="w-3 h-3 rounded-full bg-green-500" aria-hidden="true" />
                                <span className="ml-3 text-xs text-gray-500 font-mono">
                                    confhub.io / demo-conference
                                </span>
                            </div>

                            {/* Fake dashboard content */}
                            <div className="p-6 space-y-4">
                                {/* Header */}
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                        <FileText className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white">
                                            Demo Conference 2026
                                        </h3>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="flex items-center gap-1 text-xs text-gray-500">
                                                <Calendar className="h-3 w-3" aria-hidden="true" />
                                                Mar 15 – 18, 2026
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-gray-500">
                                                <MapPin className="h-3 w-3" aria-hidden="true" />
                                                San Francisco, CA
                                            </span>
                                        </div>
                                    </div>
                                    <span className="ml-auto px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                                        Open
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>Submission progress</span>
                                        <span>78%</span>
                                    </div>
                                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: "78%" }} />
                                    </div>
                                </div>

                                {/* Mini stats */}
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: "Submitted", value: "156", color: "text-blue-400" },
                                        { label: "Under Review", value: "42", color: "text-yellow-400" },
                                        { label: "Accepted", value: "98", color: "text-green-400" },
                                        { label: "Rejected", value: "16", color: "text-red-400" },
                                    ].map((stat) => (
                                        <div key={stat.label} className="bg-gray-900/50 rounded-lg p-2 text-center">
                                            <div className={`text-sm font-bold ${stat.color}`}>{stat.value}</div>
                                            <div className="text-xs text-gray-500">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Reviewers */}
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {["bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-amber-500"].map((c, i) => (
                                            <div
                                                key={i}
                                                className={`w-7 h-7 rounded-full ${c} border-2 border-gray-800 flex items-center justify-center`}
                                                aria-hidden="true"
                                            >
                                                <Users className="h-3 w-3 text-white" />
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-xs text-gray-500">+308 reviewers</span>
                                </div>
                            </div>
                        </div>

                        {/* Decorative glow */}
                        <div
                            className="absolute -inset-px rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 blur-sm -z-10"
                            aria-hidden="true"
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}
