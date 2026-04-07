"use client"

import { useEffect, useRef } from "react"
import { FeaturedConferences } from "@/components/home/featured-conferences"
import { LatestPapers } from "@/components/home/latest-papers"

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

export function DynamicDataSection() {
    const ref = useFadeIn()

    return (
        <section className="py-20 lg:py-28 bg-neutral" ref={ref}>
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-14 fade-in">
                    <h2 className="font-heading font-bold text-3xl lg:text-4xl text-text-dark tracking-tight mb-4">
                        Explore what&apos;s happening
                    </h2>
                    <p className="text-text-medium leading-relaxed">
                        Discover active conferences and latest publications powered by ConfHub.
                    </p>
                </div>

                {/* FeaturedConferences and LatestPapers are unchanged — they fetch real API data */}
                <div className="fade-in">
                    <FeaturedConferences />
                </div>
                <div className="fade-in mt-8">
                    <LatestPapers />
                </div>
            </div>
        </section>
    )
}
