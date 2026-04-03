"use client"

import { useEffect, useState, useRef } from "react"
import { Globe, FileText, Users, Award } from "lucide-react"

const STATS = [
    { icon: <Globe className="h-6 w-6" />, value: 500, suffix: "+", label: "Conferences Hosted" },
    { icon: <FileText className="h-6 w-6" />, value: 10000, suffix: "+", label: "Papers Published" },
    { icon: <Users className="h-6 w-6" />, value: 50000, suffix: "+", label: "Researchers" },
    { icon: <Award className="h-6 w-6" />, value: 120, suffix: "+", label: "Countries" },
]

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
    const [count, setCount] = useState(0)
    const ref = useRef<HTMLSpanElement>(null)
    const hasAnimated = useRef(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated.current) {
                    hasAnimated.current = true
                    const duration = 2000
                    const steps = 60
                    const increment = target / steps
                    let current = 0
                    const timer = setInterval(() => {
                        current += increment
                        if (current >= target) {
                            current = target
                            clearInterval(timer)
                        }
                        setCount(Math.floor(current))
                    }, duration / steps)
                }
            },
            { threshold: 0.3 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => {
            observer.disconnect()
        }
    }, [target])

    const formatNumber = (n: number) => {
        if (n >= 10000) return `${(n / 1000).toFixed(0)}K`
        if (n >= 1000) return n.toLocaleString()
        return n.toString()
    }

    return <span ref={ref}>{formatNumber(count)}{suffix}</span>
}

export function StatsSection() {
    return (
        <section className="relative -mt-1 bg-gray-900 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {STATS.map((stat) => (
                        <div key={stat.label} className="text-center group">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 mb-3 group-hover:bg-indigo-500/20 transition-colors">
                                <span aria-hidden="true">{stat.icon}</span>
                            </div>
                            <div className="text-3xl font-extrabold text-white tracking-tight">
                                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                            </div>
                            <div className="text-sm text-gray-400 mt-1 font-medium">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
