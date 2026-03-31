"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getConferences } from "@/app/api/conference.api"
import type { ConferenceListResponse } from "@/types/conference"
import { Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function FeaturedConferences() {
    const [conferences, setConferences] = useState<ConferenceListResponse[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            try {
                const data = await getConferences()
                // Filter active/upcoming, take first 8
                const featured = data
                    .filter((c: ConferenceListResponse) => ['ACTIVE', 'APPROVED', 'UPCOMING'].includes(c.status?.toUpperCase()))
                    .slice(0, 8)
                setConferences(featured)
            } catch {
                // Silently fail
            } finally {
                setLoading(false)
            }
        }
        fetch()
    }, [])

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    if (loading) {
        return (
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 flex items-center justify-center min-h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
            </section>
        )
    }

    if (conferences.length === 0) return null

    return (
        <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Don&apos;t Miss Out</span>
                        <h2 className="text-3xl font-extrabold text-gray-900 mt-2">Upcoming Conferences</h2>
                        <p className="text-gray-500 mt-2 max-w-lg">Discover and participate in top academic conferences around the world.</p>
                    </div>
                    <Link href="/conference" className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                        View All
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {/* Cards Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {conferences.map((conf) => (
                        <Link key={conf.id} href={`/conference/${conf.id}`} className="group block">
                            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                                {/* Banner */}
                                <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden">
                                    {conf.bannerImageUrl ? (
                                        <Image
                                            src={conf.bannerImageUrl}
                                            alt={conf.name}
                                            fill
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="text-white/40 text-3xl font-extrabold tracking-wider">
                                                {conf.acronym}
                                            </span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                    <div className="absolute top-3 left-3">
                                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-white/90 text-indigo-700 backdrop-blur-sm">
                                            {conf.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-5 space-y-3">
                                    <div>
                                        <h3 className="font-bold text-base leading-tight line-clamp-2 text-gray-900 group-hover:text-indigo-600 transition-colors">
                                            {conf.name}
                                        </h3>
                                        <p className="text-xs text-gray-400 font-mono mt-1">{conf.acronym}</p>
                                    </div>

                                    <p className="text-sm text-gray-500 line-clamp-2">{conf.description}</p>

                                    <div className="space-y-1.5 pt-1">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Calendar className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                                            <span>{formatDate(conf.startDate)} – {formatDate(conf.endDate)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <MapPin className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                                            <span className="truncate">{conf.location}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Mobile view all */}
                <div className="mt-8 text-center md:hidden">
                    <Link href="/conference">
                        <Button variant="outline" className="rounded-full px-6">
                            View All Conferences
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    )
}
