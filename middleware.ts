import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicPath = (pathname: string) => {
    if (pathname === '/') return true
    if (pathname.startsWith('/auth/')) return true
    if (pathname === '/conference') return true
    if (pathname === '/paper/published') return true
    
    // Match exactly /conference/[id] but NOT sub-paths like /conference/[id]/update
    if (/^\/conference\/\d+$/.test(pathname)) return true
    
    return false
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const token = request.cookies.get('accessToken')?.value

    if (isPublicPath(pathname)) {
        return NextResponse.next()
    }

    // No token → redirect to login
    if (!token) {
        const loginUrl = new URL('/auth/login', request.url)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - public files (images, etc.)
         * - api routes
         */
        '/((?!_next/static|_next/image|favicon.ico|images|avatars|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
