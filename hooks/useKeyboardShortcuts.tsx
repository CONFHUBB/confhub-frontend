'use client'

import { useEffect, useCallback, useState } from 'react'

type ShortcutAction = {
    key: string
    label: string
    description: string
    action: () => void
    /** If true, only fires when no input/textarea is focused */
    global?: boolean
}

/**
 * Hook to register keyboard shortcuts.
 * Shows a help overlay when pressing "?" key.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutAction[]) {
    const [showHelp, setShowHelp] = useState(false)

    const handler = useCallback((e: KeyboardEvent) => {
        // Don't fire when typing in input/textarea/contenteditable
        const target = e.target as HTMLElement
        const isTyping =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable ||
            target.closest('[role="textbox"]')

        // "?" toggles help (always works unless typing)
        if (e.key === '?' && !isTyping) {
            e.preventDefault()
            setShowHelp(prev => !prev)
            return
        }

        // Escape closes help
        if (e.key === 'Escape' && showHelp) {
            setShowHelp(false)
            return
        }

        if (isTyping) return

        // Match shortcut
        for (const shortcut of shortcuts) {
            if (e.key.toLowerCase() === shortcut.key.toLowerCase() && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault()
                shortcut.action()
                return
            }
        }
    }, [shortcuts, showHelp])

    useEffect(() => {
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [handler])

    return { showHelp, setShowHelp }
}

// ── Keyboard Shortcuts Help Overlay ──

interface ShortcutHelpProps {
    shortcuts: { key: string; label: string; description: string }[]
    open: boolean
    onClose: () => void
}

export function ShortcutHelpOverlay({ shortcuts, open, onClose }: ShortcutHelpProps) {
    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
            role="dialog"
            aria-label="Keyboard shortcuts"
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border max-w-md w-full mx-4 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        aria-label="Close shortcuts help"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="px-5 py-3 space-y-1">
                    {shortcuts.map(s => (
                        <div key={s.key} className="flex items-center justify-between py-2">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{s.label}</p>
                                <p className="text-xs text-muted-foreground">{s.description}</p>
                            </div>
                            <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-mono font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm">
                                {s.key.toUpperCase()}
                            </kbd>
                        </div>
                    ))}
                    <div className="flex items-center justify-between py-2 border-t mt-2 pt-3">
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Show this help</p>
                            <p className="text-xs text-muted-foreground">Toggle keyboard shortcuts panel</p>
                        </div>
                        <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-mono font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm">
                            ?
                        </kbd>
                    </div>
                </div>
                <div className="px-5 py-3 border-t bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                    <p className="text-xs text-muted-foreground text-center">Press <kbd className="font-mono font-semibold bg-gray-200 dark:bg-gray-700 px-1 rounded">Esc</kbd> to close</p>
                </div>
            </div>
        </div>
    )
}
