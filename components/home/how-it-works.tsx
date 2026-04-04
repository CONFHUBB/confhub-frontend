"use client"

import { FileInput, SendHorizontal, Users, Trophy, CheckCircle2, ArrowRight } from "lucide-react"

const STEPS = [
    {
        icon: FileInput,
        title: "Submit Your Paper",
        description: "Upload your research paper in PDF format. Our system supports LaTeX and Word templates.",
        color: "bg-blue-500/10 text-blue-500",
    },
    {
        icon: SendHorizontal,
        title: "Peer Review",
        description: "Your paper is assigned to expert reviewers in your field who evaluate it rigorously and confidentially.",
        color: "bg-purple-500/10 text-purple-500",
    },
    {
        icon: Users,
        title: "Present & Discuss",
        description: "Accepted papers are presented at the conference. Engage with the community through Q&A sessions.",
        color: "bg-pink-500/10 text-pink-500",
    },
    {
        icon: Trophy,
        title: "Get Published",
        description: "Accepted and presented papers are published in conference proceedings with DOI assignment.",
        color: "bg-amber-500/10 text-amber-500",
    },
]

export function HowItWorks() {
    return (
        <section className="bg-white dark:bg-gray-950 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-14">
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        How It Works
                    </h2>
                    <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                        From submission to publication in four simple steps. We&apos;ve streamlined the entire process so you can focus on what matters most — your research.
                    </p>
                </div>

                {/* Steps */}
                <div className="relative">
                    {/* Connector line spanning the full width */}
                    <div
                        className="hidden lg:block absolute top-10 left-0 right-0 pointer-events-none"
                        aria-hidden="true"
                    >
                        <div className="mx-[60px] h-px border-t-2 border-dashed border-gray-300 dark:border-gray-600" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {STEPS.map((step, index) => {
                            const Icon = step.icon
                            return (
                                <div
                                    key={step.title}
                                    className="relative flex flex-col items-center text-center"
                                >
                                    {/* Icon + number */}
                                    <div className="relative mb-5 z-10">
                                        <div className="bg-white dark:bg-gray-950 p-1 rounded-2xl">
                                            <div
                                                className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${step.color}`}
                                            >
                                                <Icon className="h-8 w-8 text-current" aria-hidden="true" />
                                            </div>
                                        </div>
                                        <span className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold z-20">
                                            {index + 1}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                        {step.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a
                        href="/conference"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        Browse Conferences <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <a
                        href="/conference/create"
                        className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Create Your Conference
                    </a>
                </div>
            </div>
        </section>
    )
}
