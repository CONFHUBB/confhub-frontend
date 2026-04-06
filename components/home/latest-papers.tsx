"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getPublishedPapers, type PublishedPaperDTO } from "@/app/api/paper.api"
import { ArrowRight, BookOpen, Loader2 } from "lucide-react"
import { fmtDate } from "@/lib/utils"

export function LatestPapers() {
    const [papers, setPapers] = useState<PublishedPaperDTO[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPapers = async () => {
            try {
                const data = await getPublishedPapers(0, 6)
                setPapers(data.content)
            } catch (e) {
                // silently fail
            } finally {
                setLoading(false)
            }
        }
        fetchPapers()
    }, [])

    const statusColors: Record<string, string> = {
        ACCEPTED: "bg-green-500/10 text-green-400",
        PUBLISHED: "bg-indigo-500/10 text-indigo-400",
        WITHDRAWN: "bg-red-500/10 text-red-400",
    }

    return (
        <section className="bg-gray-50 dark:bg-gray-900 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                            Latest Publications
                        </h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-lg">
                            Browse recently published research papers from conferences worldwide.
                        </p>
                    </div>
                    <Link
                        href="/paper"
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
                {!loading && papers.length === 0 && (
                    <div className="text-center py-20">
                        <BookOpen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" aria-hidden="true" />
                        <p className="text-gray-500 dark:text-gray-400">No published papers yet.</p>
                    </div>
                )}

                {/* Paper list */}
                {!loading && papers.length > 0 && (
                    <div className="space-y-4">
                        {papers.map((paper) => (
                            <Link
                                key={paper.id}
                                href={`/paper/${paper.id}`}
                                className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className="shrink-0 w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mt-0.5">
                                        <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                                                {paper.conferenceName}
                                            </span>
                                            {paper.trackName && (
                                                <span className="text-xs text-gray-400">
                                                    · {paper.trackName}
                                                </span>
                                            )}
                                            <span
                                                className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded ${
                                                    statusColors[paper.status] ?? "bg-gray-500/10 text-gray-400"
                                                }`}
                                            >
                                                {paper.status}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                                            {paper.title}
                                        </h3>

                                        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                            {paper.abstractField}
                                        </p>

                                        {/* Footer meta */}
                                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                                            {paper.authorNames.length > 0 && (
                                                <span>
                                                    By{" "}
                                                    <span className="text-gray-600 dark:text-gray-300">
                                                        {paper.authorNames.slice(0, 3).join(", ")}
                                                        {paper.authorNames.length > 3 &&
                                                            ` +${paper.authorNames.length - 3}`}
                                                    </span>
                                                </span>
                                            )}
                                            {paper.keywords && paper.keywords.length > 0 && (
                                                <span className="flex items-center gap-1 flex-wrap">
                                                    {paper.keywords.slice(0, 3).map((kw) => (
                                                        <span
                                                            key={kw}
                                                            className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400"
                                                        >
                                                            {kw}
                                                        </span>
                                                    ))}
                                                </span>
                                            )}
                                            <span className="ml-auto text-gray-400">
                                                {fmtDate(paper.submissionTime)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <ArrowRight
                                        className="shrink-0 h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors mt-2"
                                        aria-hidden="true"
                                    />
                                </div>
                            </Link>
                        ))}

                        {/* Mobile CTA */}
                        <div className="sm:hidden mt-6 text-center">
                            <Link
                                href="/paper"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600"
                            >
                                View all publications <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
