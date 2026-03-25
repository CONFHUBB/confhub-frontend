// ── Shared Validation Utilities ──

export const V = {
    required: (val: string): string | null =>
        !val || !val.trim() ? 'This field is required' : null,

    email: (val: string): string | null => {
        if (!val || !val.trim()) return null // optional unless paired with required
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) ? null : 'Invalid email format'
    },

    url: (val: string): string | null => {
        if (!val || !val.trim()) return null
        try { new URL(val.trim()); return null } catch { return 'Invalid URL format' }
    },

    phone: (val: string): string | null => {
        if (!val || !val.trim()) return null
        return /^[+\d\s\-().]{7,20}$/.test(val.trim()) ? null : 'Invalid phone number'
    },

    maxLen: (val: string, n: number): string | null =>
        val && val.length > n ? `Maximum ${n} characters` : null,

    minLen: (val: string, n: number): string | null =>
        val && val.trim().length < n ? `Minimum ${n} characters` : null,

    orcid: (val: string): string | null => {
        if (!val || !val.trim()) return null
        return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(val.trim()) ? null : 'Format: 0000-0000-0000-0000'
    },

    password: (val: string): string | null =>
        !val || val.length < 6 ? 'Password must be at least 6 characters' : null,

    matchField: (val: string, other: string, label = 'Passwords'): string | null =>
        val !== other ? `${label} do not match` : null,

    noSpecialChars: (val: string): string | null => {
        if (!val) return null
        return /[<>{}]/.test(val) ? 'Special characters < > { } are not allowed' : null
    },

    wordCount: (val: string, min: number, max: number): string | null => {
        if (!val || !val.trim()) return null
        const count = val.trim().split(/\s+/).length
        if (count < min) return `Minimum ${min} words (currently ${count})`
        if (count > max) return `Maximum ${max} words (currently ${count})`
        return null
    },

    numeric: (val: string): string | null => {
        if (!val || !val.trim()) return null
        return /^-?\d+(\.\d+)?$/.test(val.trim()) ? null : 'Must be a number'
    },

    integer: (val: string): string | null => {
        if (!val || !val.trim()) return null
        return /^-?\d+$/.test(val.trim()) ? null : 'Must be an integer'
    },

    emailList: (val: string): string | null => {
        if (!val || !val.trim()) return null
        const lines = val.trim().split(/[\n,;]+/).map(l => l.trim()).filter(Boolean)
        const invalid = lines.filter(l => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l))
        if (invalid.length > 0) return `Invalid email(s): ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '...' : ''}`
        return null
    },
}

/** Run multiple validators on a value, return first error or null */
export function validate(val: string, ...validators: ((v: string) => string | null)[]): string | null {
    for (const fn of validators) {
        const err = fn(val)
        if (err) return err
    }
    return null
}

/** Validate an entire form object. Returns record of field → error (only fields with errors). */
export function validateForm<T extends Record<string, string>>(
    values: T,
    rules: Partial<Record<keyof T, ((v: string) => string | null)[]>>
): Partial<Record<keyof T, string>> {
    const errors: Partial<Record<keyof T, string>> = {}
    for (const [key, validators] of Object.entries(rules)) {
        if (!validators) continue
        const err = validate(values[key as keyof T] || '', ...(validators as ((v: string) => string | null)[]))
        if (err) errors[key as keyof T] = err
    }
    return errors
}

/** Inline error component helper — returns a small red text span if error exists */
export function fieldError(errors: Record<string, string | undefined>, field: string): string | undefined {
    return errors[field]
}
