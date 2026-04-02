'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
    fallbackUrl: string
    text?: string
    className?: string
}

export function BackButton({ fallbackUrl, text = 'Back', className = '' }: BackButtonProps) {
    const router = useRouter()

    const handleBack = () => {
        // If the user came from within the app, go back to preserve state
        if (typeof window !== 'undefined' && document.referrer.includes(window.location.host)) {
            router.back()
        } else {
            // If they came from an email or direct link, push to the logical parent
            router.push(fallbackUrl)
        }
    }

    return (
        <button
            type="button"
            onClick={handleBack}
            className={`hover:text-foreground text-muted-foreground transition-colors flex items-center font-medium ${className}`}
            title="Go back"
        >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {text}
        </button>
    )
}
