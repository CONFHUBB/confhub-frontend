"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowUpRight, Award, Crown, Star } from "lucide-react"
import { getTopReviewers } from "@/app/api/review.api"
import type { TopReviewer } from "@/types/review"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

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
        el.querySelectorAll(".fade-in").forEach((node) => observer.observe(node))
        return () => observer.disconnect()
    }, [])
    return ref
}

const RANK_STYLES = [
    {
        label: "#1",
        badge: "bg-amber-100 text-amber-800 border-amber-200",
        icon: Crown,
        iconColor: "text-amber-500",
    },
    {
        label: "#2",
        badge: "bg-slate-100 text-slate-700 border-slate-200",
        icon: Award,
        iconColor: "text-slate-600",
    },
    {
        label: "#3",
        badge: "bg-orange-100 text-orange-700 border-orange-200",
        icon: Star,
        iconColor: "text-orange-500",
    },
]

export function ReviewerHonorSection() {
    const ref = useFadeIn()
    const [reviewers, setReviewers] = useState<TopReviewer[]>([])
    const [loading, setLoading] = useState(true)

    const topThree = useMemo(() => reviewers.slice(0, 3), [reviewers])
    const listReviewers = useMemo(() => reviewers.slice(3, 8), [reviewers])

    useEffect(() => {
        let isMounted = true
        setLoading(true)
        getTopReviewers(8)
            .then((data) => {
                if (!isMounted) return
                setReviewers(data ?? [])
            })
            .catch(() => {
                if (!isMounted) return
                setReviewers([])
            })
            .finally(() => {
                if (!isMounted) return
                setLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [])

    const getInitials = (name: string) =>
        name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("")

    const renderMeta = (reviewer: TopReviewer) => {
        const jobTitle = reviewer.jobTitle || ""
        const institution = reviewer.institution || ""
        const parts = [jobTitle, institution].filter(Boolean)
        return parts.length ? parts.join(" · ") : ""
    }

    return (
        <section id="honors" className="py-20 lg:py-28 bg-neutral" ref={ref}>
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-14 fade-in">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/8 border border-primary/15 rounded-full mb-4">
                        <span className="text-xs font-medium text-primary">Reviewer Hall of Honor</span>
                    </div>
                    <h2 className="font-heading font-bold text-3xl lg:text-4xl text-text-dark tracking-tight mb-4">
                        Celebrating our most dedicated reviewers
                    </h2>
                    <p className="text-text-medium leading-relaxed">
                        Recognizing the top contributors by completed reviews across ConfHub.
                    </p>
                </div>

                {loading ? (
                    <div className="space-y-8 fade-in">
                        <div className="grid md:grid-cols-3 gap-6">
                            {Array.from({ length: 3 }).map((_, idx) => (
                                <div
                                    key={`reviewer-top-skeleton-${idx}`}
                                    className="rounded-2xl border border-secondary/10 bg-white/80 p-6 shadow-sm animate-pulse min-h-45"
                                >
                                    <div className="h-4 w-20 bg-neutral-dark/20 rounded mb-4" />
                                    <div className="h-5 w-40 bg-neutral-dark/20 rounded mb-3" />
                                    <div className="h-3 w-28 bg-neutral-dark/20 rounded" />
                                </div>
                            ))}
                        </div>
                        <div className="rounded-3xl border border-secondary/10 bg-white/90 p-6">
                            {Array.from({ length: 4 }).map((_, idx) => (
                                <div
                                    key={`reviewer-list-skeleton-${idx}`}
                                    className="flex items-center justify-between gap-4 py-4 border-b border-secondary/10 last:border-b-0 animate-pulse"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-neutral-dark/20" />
                                        <div>
                                            <div className="h-4 w-32 bg-neutral-dark/20 rounded mb-2" />
                                            <div className="h-3 w-40 bg-neutral-dark/20 rounded" />
                                        </div>
                                    </div>
                                    <div className="h-8 w-20 bg-neutral-dark/20 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : reviewers.length === 0 ? (
                    <div className="fade-in max-w-2xl mx-auto text-center bg-white border border-secondary/10 rounded-2xl p-8">
                        <p className="text-text-medium">
                            Reviewer honors will appear here as completed reviews come in.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-10 fade-in">
                        <div className="grid md:grid-cols-3 gap-6 items-end">
                            {([
                                { reviewer: topThree[1], rankIndex: 1 },
                                { reviewer: topThree[0], rankIndex: 0 },
                                { reviewer: topThree[2], rankIndex: 2 },
                            ].filter((entry) => entry.reviewer))
                                .map(({ reviewer, rankIndex }) => {
                                const rankStyle = RANK_STYLES[rankIndex] ?? {
                                    label: `#${rankIndex + 1}`,
                                    badge: "bg-primary/10 text-primary border-primary/20",
                                    icon: Award,
                                    iconColor: "text-primary",
                                }
                                const RankIcon = rankStyle.icon
                                const isTop = rankIndex === 0
                                const isSecond = rankIndex === 1

                                return (
                                    <div
                                        key={reviewer.reviewerId}
                                        className={`rounded-3xl border border-white/40 bg-linear-to-br from-primary/10 via-white to-secondary/5 shadow-lg flex flex-col gap-4 ${isTop ? "p-7 md:scale-105" : isSecond ? "p-6" : "p-5"}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span
                                                className={`text-xs font-semibold px-3 py-1 rounded-full border ${rankStyle.badge}`}
                                            >
                                                {rankStyle.label}
                                            </span>
                                            <RankIcon className={`w-5 h-5 ${rankStyle.iconColor}`} />
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold overflow-hidden ${isTop ? "h-16 w-16 text-lg" : isSecond ? "h-13 w-13 text-base" : "h-12 w-12 text-base"}`}>
                                                {reviewer.avatarUrl ? (
                                                    <img
                                                        src={reviewer.avatarUrl}
                                                        alt={reviewer.reviewerName}
                                                        className="h-full w-full rounded-full object-cover aspect-square"
                                                    />
                                                ) : (
                                                    getInitials(reviewer.reviewerName)
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-heading font-semibold text-lg text-text-dark">
                                                    {reviewer.reviewerName}
                                                </h3>
                                                <p className="text-sm text-text-medium">
                                                    {renderMeta(reviewer) || "Senior Reviewer"}
                                                </p>
                                            </div>
                                        </div>
                                        <p
                                            className="text-sm text-text-medium"
                                            style={{
                                                display: "-webkit-box",
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden",
                                            }}
                                        >
                                            {reviewer.biography || "Biography pending."}
                                        </p>
                                        <div className="flex items-center justify-between text-sm text-text-medium">
                                            <span>{reviewer.completedReviews.toLocaleString()} reviews</span>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm">
                                                        Profile
                                                        <ArrowUpRight className="ml-1 h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-2xl">
                                                    <DialogHeader>
                                                        <DialogTitle>{reviewer.reviewerName}</DialogTitle>
                                                        <DialogDescription>
                                                            {reviewer.jobTitle || "Reviewer"}
                                                            {reviewer.institution ? ` · ${reviewer.institution}` : ""}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 text-sm text-text-medium">
                                                        <div className="grid sm:grid-cols-2 gap-3">
                                                            <div>
                                                                <p className="text-xs uppercase tracking-wide text-text-light">Job title</p>
                                                                <p className="text-text-dark font-medium">
                                                                    {reviewer.jobTitle || "—"}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs uppercase tracking-wide text-text-light">Email</p>
                                                                <p className="text-text-dark font-medium wrap-break-word">
                                                                    {reviewer.reviewerEmail || "—"}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs uppercase tracking-wide text-text-light">Institution</p>
                                                                <p className="text-text-dark font-medium">
                                                                    {reviewer.institution || "—"}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs uppercase tracking-wide text-text-light">Department</p>
                                                                <p className="text-text-dark font-medium">
                                                                    {reviewer.department || "—"}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs uppercase tracking-wide text-text-light">Institution country</p>
                                                                <p className="text-text-dark font-medium">
                                                                    {reviewer.institutionCountry || "—"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs uppercase tracking-wide text-text-light">Biography</p>
                                                            <p className="text-text-dark">
                                                                {reviewer.biography || "—"}
                                                            </p>
                                                        </div>
                                                        <div className="pt-2 border-t border-secondary/10">
                                                            <p className="text-xs uppercase tracking-wide text-text-light mb-2">Links</p>
                                                            <div className="space-y-2">
                                                                <div>
                                                                    <span className="text-text-light">Google Scholar: </span>
                                                                    {reviewer.googleScholarLink ? (
                                                                        <a
                                                                            href={reviewer.googleScholarLink}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-primary hover:underline"
                                                                        >
                                                                            {reviewer.googleScholarLink}
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-text-dark">—</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <span className="text-text-light">Website: </span>
                                                                    {reviewer.websiteUrl ? (
                                                                        <a
                                                                            href={reviewer.websiteUrl}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-primary hover:underline"
                                                                        >
                                                                            {reviewer.websiteUrl}
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-text-dark">—</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <span className="text-text-light">ORCID: </span>
                                                                    {reviewer.orcid ? (
                                                                        <span className="text-text-dark font-medium">{reviewer.orcid}</span>
                                                                    ) : (
                                                                        <span className="text-text-dark">—</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="rounded-[28px] border border-white/40 bg-linear-to-r from-primary/8 via-secondary/8 to-primary/12 p-6 shadow-md">
                            <div className="grid grid-cols-1 gap-2">
                                {listReviewers.map((reviewer, index) => (
                                    <div
                                        key={reviewer.reviewerId}
                                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-white/40 bg-white/70 px-5 py-4"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold overflow-hidden">
                                                {reviewer.avatarUrl ? (
                                                    <img
                                                        src={reviewer.avatarUrl}
                                                        alt={reviewer.reviewerName}
                                                        className="h-full w-full rounded-full object-cover aspect-square"
                                                    />
                                                ) : (
                                                    getInitials(reviewer.reviewerName)
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-text-dark">
                                                    #{index + 4} {reviewer.reviewerName}
                                                </p>
                                                <p className="text-sm text-text-medium">
                                                    {reviewer.completedReviews.toLocaleString()} reviews · {renderMeta(reviewer) || "Reviewer"}
                                                </p>
                                                <p
                                                    className="text-xs text-text-medium mt-1"
                                                    style={{
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 1,
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    {reviewer.biography || "Biography pending."}
                                                </p>
                                            </div>
                                        </div>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                    Profile
                                                    <ArrowUpRight className="ml-1 h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle>{reviewer.reviewerName}</DialogTitle>
                                                    <DialogDescription>
                                                        {reviewer.jobTitle || "Reviewer"}
                                                        {reviewer.institution ? ` · ${reviewer.institution}` : ""}
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 text-sm text-text-medium">
                                                    <div className="grid sm:grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-xs uppercase tracking-wide text-text-light">Job title</p>
                                                            <p className="text-text-dark font-medium">
                                                                {reviewer.jobTitle || "—"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs uppercase tracking-wide text-text-light">Email</p>
                                                            <p className="text-text-dark font-medium wrap-break-word">
                                                                {reviewer.reviewerEmail || "—"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs uppercase tracking-wide text-text-light">Institution</p>
                                                            <p className="text-text-dark font-medium">
                                                                {reviewer.institution || "—"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs uppercase tracking-wide text-text-light">Department</p>
                                                            <p className="text-text-dark font-medium">
                                                                {reviewer.department || "—"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs uppercase tracking-wide text-text-light">Institution country</p>
                                                            <p className="text-text-dark font-medium">
                                                                {reviewer.institutionCountry || "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs uppercase tracking-wide text-text-light">Biography</p>
                                                        <p className="text-text-dark">
                                                            {reviewer.biography || "—"}
                                                        </p>
                                                    </div>
                                                    <div className="pt-2 border-t border-secondary/10">
                                                        <p className="text-xs uppercase tracking-wide text-text-light mb-2">Links</p>
                                                        <div className="space-y-2">
                                                            <div>
                                                                <span className="text-text-light">Google Scholar: </span>
                                                                {reviewer.googleScholarLink ? (
                                                                    <a
                                                                        href={reviewer.googleScholarLink}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-primary hover:underline"
                                                                    >
                                                                        {reviewer.googleScholarLink}
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-text-dark">—</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <span className="text-text-light">Website: </span>
                                                                {reviewer.websiteUrl ? (
                                                                    <a
                                                                        href={reviewer.websiteUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-primary hover:underline"
                                                                    >
                                                                        {reviewer.websiteUrl}
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-text-dark">—</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <span className="text-text-light">ORCID: </span>
                                                                {reviewer.orcid ? (
                                                                    <span className="text-text-dark font-medium">{reviewer.orcid}</span>
                                                                ) : (
                                                                    <span className="text-text-dark">—</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}
