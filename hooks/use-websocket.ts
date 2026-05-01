'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'

const WS_URL = typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    : 'ws://localhost:8080/ws'

// For local dev, connect directly to backend WS
const DEV_WS_URL = 'ws://localhost:8080/ws'

/**
 * Hook to subscribe to a STOMP WebSocket topic.
 * @param topic - The topic to subscribe to (e.g. "/topic/paper.123.discussion")
 * @param onMessage - Callback when a message is received
 * @param enabled - Whether to connect (default true)
 */
export function useWebSocket<T = any>(
    topic: string | null,
    onMessage: (data: T) => void,
    enabled: boolean = true
) {
    const clientRef = useRef<Client | null>(null)
    const onMessageRef = useRef(onMessage)
    onMessageRef.current = onMessage

    useEffect(() => {
        if (!topic || !enabled) return

        const wsUrl = process.env.NODE_ENV === 'development' ? DEV_WS_URL : WS_URL

        const client = new Client({
            brokerURL: wsUrl,
            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
        })

        client.onConnect = () => {
            console.log('[WS] Connected, subscribing to:', topic)
            client.subscribe(topic, (message) => {
                try {
                    const data = JSON.parse(message.body) as T
                    console.log('[WS] Message received on', topic, data)
                    onMessageRef.current(data)
                } catch (e) {
                    console.warn('[WS] Failed to parse message:', e)
                }
            })
        }

        client.onStompError = (frame) => {
            console.error('[WS] STOMP error:', frame.headers['message'])
        }

        client.onWebSocketClose = () => {
            console.log('[WS] WebSocket closed for topic:', topic)
        }

        console.log('[WS] Activating client for topic:', topic)
        client.activate()
        clientRef.current = client

        return () => {
            client.deactivate()
            clientRef.current = null
        }
    }, [topic, enabled])

    const sendMessage = useCallback((destination: string, body: any) => {
        if (clientRef.current?.connected) {
            clientRef.current.publish({
                destination,
                body: JSON.stringify(body),
            })
        }
    }, [])

    return { sendMessage, connected: clientRef.current?.connected ?? false }
}
