'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { getNotificationsByUser, getUnreadCount, markAsRead, markAllAsRead } from '@/app/api/notification.api'
import type { NotificationResponse } from '@/types/notification'
import { useUserRoles } from '@/hooks/useUserConferenceRoles'

const NOTIFICATION_TYPE_ICONS: Record<string, string> = {
    INVITATION: '📩',
    ROLE_ACCEPTED: '✅',
    ROLE_DECLINED: '❌',
    ROLE_REMOVED: '🚫',
    CONFERENCE_CREATED: '🎉',
    CONFERENCE_STATUS: '📢',
    PAPER_SUBMITTED: '📄',
    PAPER_WITHDRAWN: '📤',
    PAPER_DECISION: '⚖️',
    REVIEW_ASSIGNED: '📋',
    REVIEW_COMPLETED: '✅',
    DEADLINE_CHANGE: '⏰',
    STATUS_UPDATE: '🔔',
}

export function NotificationBell() {
    const router = useRouter()
    const { userId } = useUserRoles()
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<NotificationResponse[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Fetch unread count (polling every 10s + on window focus)
    const fetchUnreadCount = useCallback(async () => {
        if (!userId) return
        try {
            const count = await getUnreadCount(userId)
            setUnreadCount(count)
        } catch { /* ignore */ }
    }, [userId])

    useEffect(() => {
        fetchUnreadCount()
        const interval = setInterval(fetchUnreadCount, 10000)
        const handleFocus = () => fetchUnreadCount()
        window.addEventListener('focus', handleFocus)
        return () => {
            clearInterval(interval)
            window.removeEventListener('focus', handleFocus)
        }
    }, [fetchUnreadCount])

    // Fetch full list when dropdown opens
    const fetchNotifications = useCallback(async () => {
        if (!userId) return
        setLoading(true)
        try {
            const data = await getNotificationsByUser(userId, 0, 20)
            setNotifications(data?.content || [])
        } catch { /* ignore */ }
        setLoading(false)
    }, [userId])

    useEffect(() => {
        if (isOpen) fetchNotifications()
    }, [isOpen, fetchNotifications])

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleClickNotification = async (notif: NotificationResponse) => {
        if (!notif.isRead) {
            try {
                await markAsRead(notif.id)
                // Update only this notification locally
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n))
                // Re-fetch authoritative count from server to detect any backend desync
                fetchUnreadCount()
            } catch { /* ignore */ }
        }
        if (notif.link) {
            router.push(notif.link)
            setIsOpen(false)
        }
    }

    const handleMarkAllRead = async () => {
        if (!userId) return
        try {
            await markAllAsRead(userId)
            setUnreadCount(0)
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        } catch { /* ignore */ }
    }

    // Derived: are there any locally unread notifications?
    const hasLocalUnread = notifications.some(n => !n.isRead)

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins}m ago`
        const hours = Math.floor(mins / 60)
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        return `${days}d ago`
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex items-center justify-center h-9 w-9 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 ring-2 ring-indigo-600">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-[420px] bg-white rounded-xl shadow-2xl border z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                        <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                        <div className="flex items-center gap-2">
                            <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                >
                                    <CheckCheck className="h-3 w-3" /> Mark all read
                                </button>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {loading ? (
                            <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="py-8 text-center text-gray-400 text-sm">
                                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <button
                                    key={notif.id}
                                    onClick={() => handleClickNotification(notif)}
                                    className={`w-full text-left px-4 py-3 border-b last:border-0 hover:bg-gray-50 transition-colors flex gap-3 cursor-pointer ${!notif.isRead ? 'bg-indigo-50/50' : ''
                                        }`}
                                >
                                    <span className="text-lg shrink-0 mt-0.5">
                                        {NOTIFICATION_TYPE_ICONS[notif.type] || '🔔'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-sm leading-snug ${!notif.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                {notif.title}
                                            </p>
                                            {!notif.isRead && (
                                                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                        {notif.message && (
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[11px] text-gray-400">{notif.conferenceName}</span>
                                            <span className="text-[11px] text-gray-300">·</span>
                                            <span className="text-[11px] text-gray-400">{timeAgo(notif.createdAt)}</span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
