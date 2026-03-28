'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

function AcceptedContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
            <Card className="max-w-md w-full shadow-lg border-green-200">
                <CardContent className="py-12 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Invitation Accepted!</h1>
                    <p className="text-muted-foreground">
                        You have successfully accepted the conference invitation. You can now log in to your dashboard to access the conference.
                    </p>
                    {token && (
                        <p className="text-xs text-muted-foreground/60 mt-4">
                            Token: {token.substring(0, 8)}...
                        </p>
                    )}
                    <div className="pt-4">
                        <a
                            href="/auth/login"
                            className="inline-flex items-center px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
                        >
                            Go to Login
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function InvitationAcceptedPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
            <AcceptedContent />
        </Suspense>
    )
}
