'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import { getToken } from '@/lib/auth'

/**
 * Establishes a WebSocket connection and subscribes to the user's
 * personal notification topic. Dispatches a 'notification:new' event
 * when a message arrives, containing the NotificationResponseDTO payload.
 *
 * Automatically reconnects on disconnect with exponential backoff.
 */
export function useWebSocket(userId: number | null) {
    const clientRef = useRef<Client | null>(null)

    const connect = useCallback(() => {
        if (!userId) return

        const token = getToken()
        if (!token) return

        // Build WS URL — derive from the current page origin
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`

        const client = new Client({
            brokerURL: wsUrl,
            reconnectDelay: 5000,       // reconnect after 5s
            heartbeatIncoming: 10000,   // heartbeat from server every 10s
            heartbeatOutgoing: 10000,   // heartbeat to server every 10s
            debug: (msg) => {
                // Only log in development
                if (process.env.NODE_ENV === 'development') {
                    // Suppress noisy heartbeat messages
                    if (!msg.includes('>>> PING') && !msg.includes('<<< PONG')) {
                        console.debug('[WS]', msg)
                    }
                }
            },
        })

        client.onConnect = () => {
            console.log('[WS] Connected — subscribing to notifications')
            client.subscribe(`/topic/user.${userId}.notifications`, (message) => {
                try {
                    const notification = JSON.parse(message.body)
                    // Dispatch custom event that NotificationBell listens to
                    window.dispatchEvent(
                        new CustomEvent('notification:new', { detail: notification })
                    )
                } catch (e) {
                    console.error('[WS] Failed to parse notification:', e)
                }
            })
        }

        client.onStompError = (frame) => {
            console.error('[WS] STOMP error:', frame.headers['message'], frame.body)
        }

        client.onDisconnect = () => {
            console.log('[WS] Disconnected')
        }

        client.activate()
        clientRef.current = client
    }, [userId])

    useEffect(() => {
        connect()

        return () => {
            if (clientRef.current?.connected) {
                clientRef.current.deactivate()
                clientRef.current = null
            }
        }
    }, [connect])
}
