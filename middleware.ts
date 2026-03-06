import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/auth/login', '/auth/register']

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const token = request.cookies.get('accessToken')?.value

    // Allow public paths (login, register)
    if (publicPaths.some(path => pathname.startsWith(path))) {
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
