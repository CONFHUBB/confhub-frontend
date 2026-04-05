// ═══════════════════════════════════════════════════════════════════════════════
// Centralized Auth Utilities — Single Source of Truth for JWT Token Access
// ═══════════════════════════════════════════════════════════════════════════════
//
// BEFORE: 20+ files each did their own `localStorage.getItem('accessToken')` +
//         `JSON.parse(atob(token.split('.')[1]))` with inconsistent field access.
// AFTER : Every component imports from this single file.
//

export interface TokenPayload {
    /** Email (JWT `sub` claim) */
    sub: string
    /** Numeric user ID — normalized from `userId` / `id` / email-lookup */
    userId: number
    /** System-level roles, e.g. ['ROLE_USER'], ['ROLE_ADMIN'] */
    roles: string[]
    /** Token expiration (Unix seconds) */
    exp: number
}

// ── Token Access ─────────────────────────────────────────────────────────────

/** Get the raw JWT string from localStorage. Returns null on SSR or when not logged in. */
export function getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('accessToken')
}

/** Decode the JWT payload without signature verification (client-side only). */
export function getTokenPayload(): TokenPayload | null {
    const token = getToken()
    if (!token) return null
    try {
        const raw = JSON.parse(atob(token.split('.')[1]))
        return {
            sub: raw.sub ?? '',
            userId: Number(raw.userId ?? raw.id ?? 0),
            roles: normalizeRoles(raw),
            exp: raw.exp ?? 0,
        }
    } catch {
        return null
    }
}

/** Get the current user's numeric ID, or null if not authenticated. */
export function getCurrentUserId(): number | null {
    const payload = getTokenPayload()
    return payload?.userId || null
}

/** Get the current user's email from the JWT `sub` claim. */
export function getCurrentUserEmail(): string | null {
    return getTokenPayload()?.sub || null
}

/** Check if the stored token is expired. Returns true if expired or missing. */
export function isTokenExpired(): boolean {
    const payload = getTokenPayload()
    if (!payload) return true
    return Date.now() > payload.exp * 1000
}

/** Remove the token from storage (logout). */
export function clearToken(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('accessToken')
}

// ── Role Helpers ─────────────────────────────────────────────────────────────

/** Check if current user has ROLE_ADMIN or ROLE_STAFF. */
export function isAdminOrStaff(): boolean {
    const payload = getTokenPayload()
    if (!payload) return false
    return payload.roles.some(r => r === 'ROLE_ADMIN' || r === 'ROLE_STAFF')
}

// ── Internal ─────────────────────────────────────────────────────────────────

function normalizeRoles(raw: Record<string, unknown>): string[] {
    if (Array.isArray(raw.roles)) return raw.roles as string[]
    if (typeof raw.roles === 'string') return [raw.roles]
    if (Array.isArray(raw.authorities)) return raw.authorities as string[]
    if (typeof raw.role === 'string') return [raw.role]
    return []
}
