'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

function ErrorContent() {
    const searchParams = useSearchParams()
    const message = searchParams.get('message') || 'An unknown error occurred while processing your invitation.'

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
            <Card className="max-w-md w-full shadow-lg border-amber-200">
                <CardContent className="py-12 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Invitation Error</h1>
                    <p className="text-muted-foreground">
                        {message}
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
                        <p className="text-sm text-amber-800">
                            <strong>Common reasons:</strong>
                        </p>
                        <ul className="text-sm text-amber-700 mt-1 list-disc list-inside space-y-1">
                            <li>The invitation link has expired (older than 7 days)</li>
                            <li>The invitation has already been accepted or declined</li>
                            <li>The invitation link is invalid</li>
                        </ul>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Please contact the conference chair to request a new invitation.
                    </p>
                    <div className="pt-4">
                        <a
                            href="/"
                            className="inline-flex items-center px-6 py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
                        >
                            Go to Home
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function InvitationErrorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
            <ErrorContent />
        </Suspense>
    )
}
