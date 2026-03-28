import http from '@/lib/http'

// Task 4: Server-side bookmark persistence
// Replaces localStorage-based bookmarks with server-persisted ones

/** GET /api/v1/bookmarks — returns array of bookmarked conferenceIds */
export async function getServerBookmarks(): Promise<number[]> {
    const res = await http.get<number[]>('/bookmarks')
    return res.data
}

/** POST /api/v1/bookmarks/{conferenceId} — add a bookmark */
export async function addServerBookmark(conferenceId: number): Promise<void> {
    await http.post(`/bookmarks/${conferenceId}`)
}

/** DELETE /api/v1/bookmarks/{conferenceId} — remove a bookmark */
export async function removeServerBookmark(conferenceId: number): Promise<void> {
    await http.delete(`/bookmarks/${conferenceId}`)
}

/** Toggle bookmark state — add if not bookmarked, remove if bookmarked */
export async function toggleServerBookmark(conferenceId: number, isCurrentlyBookmarked: boolean): Promise<void> {
    if (isCurrentlyBookmarked) {
        await removeServerBookmark(conferenceId)
    } else {
        await addServerBookmark(conferenceId)
    }
}
