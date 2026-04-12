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

// Lightweight JWT payload parser (no signature verification — middleware only reads, auth is done by API)
function parseJwtPayload(token: string): Record<string, unknown> {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        const json = decodeURIComponent(
            atob(base64).split('').map(c =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        )
        return JSON.parse(json)
    } catch {
        return {}
    }
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

    // ── Admin/Staff bypass profile completion check ──
    // Admins and staff should not be forced to complete their profile
    const payload = parseJwtPayload(token)
    const roles: string[] = (payload['roles'] as string[]) ?? []
    const isAdminOrStaff = roles.some(r => r === 'ROLE_ADMIN' || r === 'ROLE_STAFF')

    // Skip profile completion check for admin/staff and the complete-profile page itself
    if (pathname === '/complete-profile') {
        return NextResponse.next()
    }

    if (!isAdminOrStaff) {
        const profileCompleted = request.cookies.get('profileCompleted')?.value
        if (!profileCompleted) {
            const completeUrl = new URL('/complete-profile', request.url)
            return NextResponse.redirect(completeUrl)
        }
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
