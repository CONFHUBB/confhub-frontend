'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
    showDetails: boolean
}

/**
 * App-level Error Boundary — catches unhandled React rendering errors
 * and displays a recoverable fallback UI instead of a white screen.
 *
 * Wraps children in the main layout to protect the entire app shell.
 */
export class AppErrorBoundary extends React.Component<
    { children: React.ReactNode },
    ErrorBoundaryState
> {
    constructor(props: { children: React.ReactNode }) {
        super(props)
        this.state = { hasError: false, error: null, showDetails: false }
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // Log to console in dev — in production, send to a monitoring service
        console.error('[AppErrorBoundary] Caught:', error, info.componentStack)
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, showDetails: false })
    }

    render() {
        if (this.state.hasError) {
            return <ErrorFallback
                error={this.state.error}
                showDetails={this.state.showDetails}
                onToggleDetails={() => this.setState(s => ({ showDetails: !s.showDetails }))}
                onRetry={this.handleRetry}
            />
        }
        return this.props.children
    }
}

// ── Fallback UI ──────────────────────────────────────────────────────────────

function ErrorFallback({
    error,
    showDetails,
    onToggleDetails,
    onRetry,
}: {
    error: Error | null
    showDetails: boolean
    onToggleDetails: () => void
    onRetry: () => void
}) {
    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <div className="max-w-lg w-full text-center space-y-6">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>

                {/* Heading */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        An unexpected error occurred while rendering this page.
                        Your data is safe — try refreshing or navigate back.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-3">
                    <Button onClick={onRetry} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.location.href = '/'}
                        className="gap-2"
                    >
                        <Home className="h-4 w-4" />
                        Go Home
                    </Button>
                </div>

                {/* Error Details (expandable) */}
                {error && (
                    <div className="text-left">
                        <button
                            onClick={onToggleDetails}
                            className="text-xs text-muted-foreground hover:text-gray-700 flex items-center gap-1 mx-auto transition-colors"
                        >
                            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {showDetails ? 'Hide' : 'Show'} error details
                        </button>
                        {showDetails && (
                            <pre className="mt-3 p-4 bg-gray-50 border rounded-lg text-xs text-gray-600 overflow-auto max-h-48 whitespace-pre-wrap break-all font-mono">
                                {error.message}
                                {error.stack && `\n\n${error.stack}`}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
