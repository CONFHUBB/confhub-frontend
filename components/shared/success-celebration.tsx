'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

/**
 * SuccessCelebration — Professional animated checkmark + message overlay.
 * Used after completing key actions (submit paper, submit review).
 */
interface SuccessCelebrationProps {
    title: string
    message?: string
    /** Optional secondary info line */
    detail?: string
    /** Primary CTA button */
    ctaLabel?: string
    ctaUrl?: string
    /** Auto-redirect URL after delay */
    autoRedirectUrl?: string
    autoRedirectDelay?: number // seconds, default 8
    /** Callback when dismissed */
    onDismiss?: () => void
}

export function SuccessCelebration({
    title,
    message,
    detail,
    ctaLabel,
    ctaUrl,
    autoRedirectUrl,
    autoRedirectDelay = 8,
    onDismiss,
}: SuccessCelebrationProps) {
    const router = useRouter()
    const [countdown, setCountdown] = useState(autoRedirectDelay)
    const [show, setShow] = useState(false)

    // Trigger animation on mount
    useEffect(() => {
        const t = setTimeout(() => setShow(true), 50)
        return () => clearTimeout(t)
    }, [])

    // Auto-redirect countdown
    useEffect(() => {
        if (!autoRedirectUrl) return
        if (countdown <= 0) {
            router.push(autoRedirectUrl)
            return
        }
        const timer = setInterval(() => setCountdown(c => c - 1), 1000)
        return () => clearInterval(timer)
    }, [countdown, autoRedirectUrl, router])

    return (
        <div className={`flex flex-col items-center justify-center py-16 px-4 transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Animated Checkmark Circle */}
            <div className="relative mb-8">
                <svg
                    className="w-24 h-24"
                    viewBox="0 0 96 96"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Background circle with draw animation */}
                    <circle
                        cx="48"
                        cy="48"
                        r="44"
                        stroke="#e0e7ff"
                        strokeWidth="4"
                        className="opacity-50"
                    />
                    <circle
                        cx="48"
                        cy="48"
                        r="44"
                        stroke="#4f46e5"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="animate-[drawCircle_0.6s_ease-out_forwards]"
                        style={{
                            strokeDasharray: '276.5',
                            strokeDashoffset: '276.5',
                        }}
                    />
                    {/* Checkmark path with draw animation */}
                    <path
                        d="M30 50 L42 62 L66 38"
                        stroke="#4f46e5"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        className="animate-[drawCheck_0.4s_ease-out_0.5s_forwards]"
                        style={{
                            strokeDasharray: '60',
                            strokeDashoffset: '60',
                        }}
                    />
                </svg>
                {/* Pulse ring */}
                <div className="absolute inset-0 rounded-full border-2 border-indigo-300 animate-ping opacity-20" />
            </div>

            {/* Title */}
            <h2 className={`text-2xl font-bold text-gray-900 mb-2 text-center transition-all duration-500 delay-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                {title}
            </h2>

            {/* Message */}
            {message && (
                <p className={`text-muted-foreground text-center max-w-md mb-2 transition-all duration-500 delay-700 ${show ? 'opacity-100' : 'opacity-0'}`}>
                    {message}
                </p>
            )}

            {/* Detail */}
            {detail && (
                <p className={`text-sm text-indigo-600 font-medium text-center mb-6 transition-all duration-500 delay-[800ms] ${show ? 'opacity-100' : 'opacity-0'}`}>
                    {detail}
                </p>
            )}

            {/* CTA Button */}
            {ctaLabel && ctaUrl && (
                <div className={`transition-all duration-500 delay-[900ms] ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <Button
                        size="lg"
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 px-8"
                        onClick={() => router.push(ctaUrl)}
                    >
                        {ctaLabel}
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Auto-redirect countdown */}
            {autoRedirectUrl && (
                <p className={`text-xs text-muted-foreground mt-4 transition-all duration-500 delay-[1000ms] ${show ? 'opacity-100' : 'opacity-0'}`}>
                    Redirecting in {countdown}s...
                    <button
                        onClick={onDismiss || (() => router.push(autoRedirectUrl))}
                        className="ml-2 text-indigo-600 hover:underline"
                    >
                        Go now
                    </button>
                </p>
            )}
        </div>
    )
}
