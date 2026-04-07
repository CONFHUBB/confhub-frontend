"use client"

import { useEffect, useRef } from "react"
import { Settings2, MessageSquareText, PenTool, CheckCircle2 } from "lucide-react"

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

const AUDIENCE = [
    {
        icon: Settings2,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
        checkColor: "text-primary",
        title: "Organizers",
        description:
            "Full visibility and control over every stage — from CFP to publication — with real-time dashboards and automated workflows.",
        features: [
            "One-click conference setup",
            "Automated reviewer matching",
            "Real-time analytics & reports",
            "Sponsor & attendee management",
        ],
    },
    {
        icon: MessageSquareText,
        iconBg: "bg-tertiary/20",
        iconColor: "text-secondary",
        checkColor: "text-tertiary",
        title: "Reviewers",
        description:
            "A streamlined review experience with intuitive scoring, discussion forums, and zero administrative burden — focus on the science.",
        features: [
            "Smart bidding interface",
            "Structured review forms",
            "Blind review guarantee",
            "Discussion & rebuttal tools",
        ],
    },
    {
        icon: PenTool,
        iconBg: "bg-secondary/10",
        iconColor: "text-secondary-dark",
        checkColor: "text-secondary",
        title: "Authors",
        description:
            "Submit papers effortlessly, track review progress transparently, and access published proceedings — all from a clean, intuitive portal.",
        features: [
            "Guided submission wizard",
            "Live status tracking",
            "Camera-ready upload",
            "Digital certificate & DOI",
        ],
    },
]

export function AudienceSection() {
    const ref = useFadeIn()

    return (
        <section className="py-20 lg:py-28 bg-white" ref={ref}>
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-14 fade-in">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/8 border border-primary/15 rounded-full mb-4">
                        <span className="text-xs font-medium text-primary">Who It&apos;s For</span>
                    </div>
                    <h2 className="font-heading font-bold text-3xl lg:text-4xl text-text-dark tracking-tight mb-4">
                        Built for the entire academic ecosystem
                    </h2>
                    <p className="text-text-medium leading-relaxed">
                        Every role in the conference lifecycle gets a tailored experience designed for their specific needs.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 lg:gap-8 stagger-children">
                    {AUDIENCE.map((group) => {
                        const Icon = group.icon
                        return (
                            <div
                                key={group.title}
                                className="fade-in card-lift bg-neutral rounded-2xl p-8 border border-secondary/8"
                            >
                                <div className={`w-14 h-14 ${group.iconBg} rounded-2xl flex items-center justify-center mb-6`}>
                                    <Icon className={`w-7 h-7 ${group.iconColor}`} />
                                </div>
                                <h3 className="font-heading font-bold text-xl text-text-dark mb-3">{group.title}</h3>
                                <p className="text-sm text-text-medium leading-relaxed mb-5">{group.description}</p>
                                <ul className="space-y-2.5">
                                    {group.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2 text-sm text-text-medium">
                                            <CheckCircle2 className={`w-4 h-4 ${group.checkColor} flex-shrink-0`} />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
