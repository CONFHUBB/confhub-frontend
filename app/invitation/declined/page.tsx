'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { XCircle } from 'lucide-react'

function DeclinedContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 p-4">
            <Card className="max-w-md w-full shadow-lg border-red-200">
                <CardContent className="py-12 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                        <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Invitation Declined</h1>
                    <p className="text-muted-foreground">
                        You have declined the conference invitation. The conference chair has been notified.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        If you change your mind, please contact the conference chair to request a new invitation.
                    </p>
                    {token && (
                        <p className="text-xs text-muted-foreground/60 mt-4">
                            Token: {token.substring(0, 8)}...
                        </p>
                    )}
                    <div className="pt-4">
                        <a
                            href="/"
                            className="inline-flex items-center px-6 py-2.5 rounded-lg bg-gray-600 text-white font-medium hover:bg-gray-700 transition-colors"
                        >
                            Go to Home
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function InvitationDeclinedPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
            <DeclinedContent />
        </Suspense>
    )
}
