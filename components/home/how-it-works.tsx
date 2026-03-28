"use client"

import { Upload, Search, Trophy, ArrowRight } from "lucide-react"

const STEPS = [
    {
        icon: <Upload className="h-7 w-7" />,
        title: "Submit Papers",
        description: "Authors upload their research papers to conferences with customizable submission forms.",
        color: "from-blue-500 to-cyan-500",
        bgColor: "bg-indigo-50",
        iconColor: "text-indigo-600",
    },
    {
        icon: <Search className="h-7 w-7" />,
        title: "Peer Review",
        description: "Expert reviewers evaluate submissions. Chairs manage assignments and track progress.",
        color: "from-purple-500 to-indigo-500",
        bgColor: "bg-purple-50",
        iconColor: "text-purple-600",
    },
    {
        icon: <Trophy className="h-7 w-7" />,
        title: "Get Published",
        description: "Accepted papers are published and accessible to the research community worldwide.",
        color: "from-amber-500 to-orange-500",
        bgColor: "bg-amber-50",
        iconColor: "text-amber-600",
    },
]

export function HowItWorks() {
    return (
        <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Simple Process</span>
                    <h2 className="text-3xl font-extrabold text-gray-900 mt-2">How It Works</h2>
                    <p className="text-gray-500 mt-3">
                        From submission to publication — our streamlined workflow makes conference management effortless.
                    </p>
                </div>

                {/* Steps */}
                <div className="grid md:grid-cols-3 gap-8 relative">
                    {/* Connector line (desktop) */}
                    <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-amber-200" />

                    {STEPS.map((step, i) => (
                        <div key={i} className="relative text-center group">
                            {/* Step number circle */}
                            <div className="relative inline-flex mx-auto mb-6">
                                <div className={`w-16 h-16 rounded-2xl ${step.bgColor} flex items-center justify-center ${step.iconColor} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                                    {step.icon}
                                </div>
                                <span className={`absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br ${step.color} text-white text-xs font-bold flex items-center justify-center shadow-lg`}>
                                    {i + 1}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                            <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                                {step.description}
                            </p>

                            {/* Arrow between steps (mobile) */}
                            {i < STEPS.length - 1 && (
                                <div className="md:hidden flex justify-center my-4">
                                    <ArrowRight className="h-5 w-5 text-gray-300 rotate-90" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
