"use client"

import { useState } from "react"
import { CircleHelp, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HelpTooltipProps {
    title: string
    children: React.ReactNode
}

export function HelpTooltip({ title, children }: HelpTooltipProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Help"
                aria-label={`Help: ${title}`}
            >
                <CircleHelp className="h-4 w-4" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
                    <div className="relative z-10 bg-white rounded-xl shadow-2xl border max-w-lg w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-xl">
                            <div className="flex items-center gap-2">
                                <CircleHelp className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold text-gray-900">{title}</h3>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="p-5 text-sm text-gray-700 leading-relaxed space-y-3">
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
