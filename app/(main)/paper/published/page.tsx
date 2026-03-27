import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import PublishedPapersClient from './published-papers-client'

export const metadata = {
    title: 'Published Papers | Confhub',
    description: 'Browse all accepted and published research papers on Confhub.',
}

export default function PublishedPapersPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <PublishedPapersClient />
        </Suspense>
    )
}
