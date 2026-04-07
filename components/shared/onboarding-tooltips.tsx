'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TooltipStep {
    /** CSS selector or element ID (with #) to anchor tooltip near */
    target?: string
    title: string
    content: string
    position?: 'top' | 'bottom' | 'left' | 'right'
}

interface OnboardingTooltipsProps {
    /** Unique key for localStorage persistence */
    storageKey: string
    steps: TooltipStep[]
    /** If true, always shows the first time (ignoring previous dismissal) */
    forceShow?: boolean
}

const STORAGE_PREFIX = 'confhub_onboarding_'

export function OnboardingTooltips({ storageKey, steps, forceShow }: OnboardingTooltipsProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [visible, setVisible] = useState(false)
    const [position, setPosition] = useState({ top: 0, left: 0 })

    const fullKey = `${STORAGE_PREFIX}${storageKey}`

    useEffect(() => {
        if (forceShow) {
            setVisible(true)
            return
        }
        try {
            const dismissed = localStorage.getItem(fullKey)
            if (!dismissed) {
                // Delay display slightly so the page settles
                const timer = setTimeout(() => setVisible(true), 800)
                return () => clearTimeout(timer)
            }
        } catch {
            // SSR or localStorage unavailable
        }
    }, [fullKey, forceShow])

    // Position the tooltip near the target element
    useEffect(() => {
        if (!visible || !steps[currentStep]?.target) return
        const targetEl = document.querySelector(steps[currentStep].target!)
        if (!targetEl) return

        const rect = targetEl.getBoundingClientRect()
        const pos = steps[currentStep].position || 'bottom'

        let top = 0
        let left = 0

        switch (pos) {
            case 'bottom':
                top = rect.bottom + window.scrollY + 12
                left = rect.left + window.scrollX + rect.width / 2
                break
            case 'top':
                top = rect.top + window.scrollY - 12
                left = rect.left + window.scrollX + rect.width / 2
                break
            case 'right':
                top = rect.top + window.scrollY + rect.height / 2
                left = rect.right + window.scrollX + 12
                break
            case 'left':
                top = rect.top + window.scrollY + rect.height / 2
                left = rect.left + window.scrollX - 12
                break
        }

        setPosition({ top, left })

        // Add highlight pulse to target
        targetEl.classList.add('ring-2', 'ring-primary/40', 'ring-offset-2', 'rounded-lg')
        return () => {
            targetEl.classList.remove('ring-2', 'ring-primary/40', 'ring-offset-2', 'rounded-lg')
        }
    }, [visible, currentStep, steps])

    const dismiss = useCallback(() => {
        setVisible(false)
        try { localStorage.setItem(fullKey, 'true') } catch {}
    }, [fullKey])

    const next = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1)
        } else {
            dismiss()
        }
    }

    const prev = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1)
    }

    if (!visible || steps.length === 0) return null

    const step = steps[currentStep]
    const isLast = currentStep === steps.length - 1
    const hasTarget = !!step.target

    return (
        <>
            {/* Backdrop — only when there's a target to highlight */}
            {hasTarget && (
                <div className="fixed inset-0 z-40 bg-black/20 animate-in fade-in duration-200" onClick={dismiss} />
            )}

            {/* Tooltip card */}
            <div
                className={cn(
                    'z-50 w-80 bg-white rounded-xl shadow-2xl border border-secondary/20 overflow-hidden animate-in fade-in zoom-in-95 duration-300',
                    hasTarget ? 'absolute' : 'fixed bottom-24 right-6'
                )}
                style={hasTarget ? {
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                    transform: 'translateX(-50%)',
                } : undefined}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-secondary text-white">
                    <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        <span className="text-sm font-semibold">{step.title}</span>
                    </div>
                    <button
                        onClick={dismiss}
                        className="text-white/70 hover:text-white transition-colors"
                        aria-label="Dismiss onboarding tip"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-4 py-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{step.content}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-xs text-muted-foreground">
                        {currentStep + 1} / {steps.length}
                    </span>
                    <div className="flex items-center gap-2">
                        {currentStep > 0 && (
                            <Button variant="ghost" size="sm" onClick={prev} className="h-7 text-xs gap-1">
                                <ChevronLeft className="h-3 w-3" /> Back
                            </Button>
                        )}
                        <Button size="sm" onClick={next} className="h-7 text-xs gap-1">
                            {isLast ? 'Got it!' : 'Next'} {!isLast && <ChevronRight className="h-3 w-3" />}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}
