"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { getConferences } from "@/app/api/conference.api"
import type { ConferenceListResponse } from "@/types/conference"
import { Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fmtDate } from "@/lib/utils"

export function FeaturedConferences() {
    const [conferences, setConferences] = useState<ConferenceListResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [visibleCount, setVisibleCount] = useState(3)

    useEffect(() => {
        const fetchConferences = async () => {
            try {
                const data = await getConferences()
                setConferences(data.slice(0, 6))
            } catch (e) {
                // silently fail
            } finally {
                setLoading(false)
            }
        }
        fetchConferences()
    }, [])

    useEffect(() => {
        const updateVisibleCount = () => {
            if (window.innerWidth < 640) setVisibleCount(1)
            else if (window.innerWidth < 1024) setVisibleCount(2)
            else setVisibleCount(3)
        }
        updateVisibleCount()
        window.addEventListener("resize", updateVisibleCount)
        return () => window.removeEventListener("resize", updateVisibleCount)
    }, [])

    const maxIndex = Math.max(0, conferences.length - visibleCount)
    const prev = () => setCurrentIndex((i) => Math.max(0, i - 1))
    const next = () => setCurrentIndex((i) => Math.min(maxIndex, i + 1))

    const visible = conferences.slice(currentIndex, currentIndex + visibleCount)

    const statusColors: Record<string, string> = {
        OPEN_FOR_SUBMISSION: "bg-green-500/10 text-green-400",
        REVIEW: "bg-yellow-500/10 text-yellow-400",
        COMPLETED: "bg-gray-500/10 text-gray-400",
        CLOSED: "bg-red-500/10 text-red-400",
    }

    return (
        <section className="bg-gray-50 dark:bg-gray-900 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                            Featured Conferences
                        </h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-lg">
                            Discover upcoming academic conferences and submit your research to the world&apos;s leading events.
                        </p>
                    </div>
                    <Link
                        href="/conference"
                        className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                        View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" aria-hidden="true" />
                    </div>
                )}

                {/* Empty */}
                {!loading && conferences.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-500 dark:text-gray-400">No conferences available at the moment.</p>
                    </div>
                )}

                {/* Cards */}
                {!loading && conferences.length > 0 && (
                    <>
                        <div
                            className="grid gap-6"
                            style={{
                                gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))`,
                            }}
                        >
                            {visible.map((conf) => (
                                <Link
                                    key={conf.id}
                                    href={`/conference/${conf.id}`}
                                    className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                                >
                                    {/* Banner */}
                                    <div className="relative h-44 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                        {conf.bannerImageUrl ? (
                                            <Image
                                                src={conf.bannerImageUrl}
                                                alt={`${conf.name} banner`}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600" />
                                        )}
                                        {/* Status badge */}
                                        <div className="absolute top-3 left-3">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    statusColors[conf.status] ?? "bg-gray-500/10 text-gray-400"
                                                }`}
                                            >
                                                {conf.status.replace(/_/g, " ")}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                                                {conf.acronym}
                                            </span>
                                            <span className="text-xs text-gray-400">·</span>
                                            <span className="text-xs text-gray-400">{conf.area}</span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                                            {conf.name}
                                        </h3>
                                        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                            {conf.description}
                                        </p>
                                        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                                                {fmtDate(conf.startDate)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                                                {conf.location || conf.country}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-center gap-4 mt-8">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={prev}
                                disabled={currentIndex === 0}
                                aria-label="Previous conferences"
                            >
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <div className="flex gap-1.5">
                                {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentIndex(i)}
                                        className={`h-1.5 rounded-full transition-all ${
                                            i === currentIndex
                                                ? "w-6 bg-indigo-600"
                                                : "w-1.5 bg-gray-300 dark:bg-gray-600"
                                        }`}
                                        aria-label={`Go to page ${i + 1}`}
                                    />
                                ))}
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={next}
                                disabled={currentIndex === maxIndex}
                                aria-label="Next conferences"
                            >
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </div>

                        {/* Mobile CTA */}
                        <div className="sm:hidden mt-6 text-center">
                            <Link
                                href="/conference"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600"
                            >
                                View all conferences <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </section>
    )
}
