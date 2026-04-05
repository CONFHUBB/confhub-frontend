import axios from 'axios'
import { getToken, clearToken, isTokenExpired } from '@/lib/auth'

const http = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Separate instance for auth endpoints (no /v1 prefix)
export const authHttp = axios.create({
    baseURL: process.env.NEXT_PUBLIC_AUTH_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

http.interceptors.request.use(
    (config) => {
        const token = getToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// ── Response interceptor: handle 401 (expired/invalid token) ──
let isRedirecting = false

http.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            error.response?.status === 401 &&
            typeof window !== 'undefined' &&
            !isRedirecting
        ) {
            const token = getToken()
            if (token) {
                isRedirecting = true
                clearToken()
                const event = new CustomEvent('auth:expired')
                window.dispatchEvent(event)
                setTimeout(() => {
                    window.location.replace('/auth/login?expired=1')
                    isRedirecting = false
                }, 100)
            }
        }
        return Promise.reject(error)
    }
)

// ── Proactive token expiry checker ──
// Call this once on app mount to start monitoring token expiry
export function startTokenExpiryMonitor() {
    if (typeof window === 'undefined') return

    const CHECK_INTERVAL = 60_000 // check every minute
    const WARN_BEFORE_MS = 5 * 60_000 // warn 5 minutes before expiry

    const checkExpiry = () => {
        const token = getToken()
        if (!token) return

        if (isTokenExpired()) {
            // Token already expired
            clearToken()
            if (!isRedirecting) {
                isRedirecting = true
                window.location.replace('/auth/login?expired=1')
            }
            return
        }

        // Check remaining time for early warning
        try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            const remaining = payload.exp * 1000 - Date.now()
            if (remaining <= WARN_BEFORE_MS) {
                const event = new CustomEvent('auth:expiring-soon', {
                    detail: { remainingMs: remaining }
                })
                window.dispatchEvent(event)
            }
        } catch { /* malformed token — ignore */ }
    }

    // Initial check
    checkExpiry()
    // Periodic check
    const interval = setInterval(checkExpiry, CHECK_INTERVAL)

    return () => clearInterval(interval)
}

export default http

