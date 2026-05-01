import http from '@/lib/http'

export interface ChatReaction {
    userId: number
    emoji: string
}

export interface ReplyTo {
    id: number
    content: string
    userFirstName: string
    userLastName: string
    userId: number
}

export interface ChatMessage {
    id: number
    conferenceId: number
    userId: number
    userFirstName: string
    userLastName: string
    userEmail: string
    recipientId: number | null
    content: string
    fileUrl: string | null
    fileName: string | null
    replyToId: number | null
    replyTo: ReplyTo | null
    deleted: boolean
    forwarded: boolean
    reactions: ChatReaction[]
    createdAt: string
}

export interface ChatMember {
    userId: number
    firstName: string
    lastName: string
    email: string
    role: string
}

// Group chat
export const getGroupMessages = async (conferenceId: number): Promise<ChatMessage[]> => {
    const response = await http.get<ChatMessage[]>(`/conference-chat/${conferenceId}/group`)
    return response.data
}

export const sendGroupMessage = async (conferenceId: number, userId: number, content: string, replyToId?: number): Promise<ChatMessage> => {
    const response = await http.post<ChatMessage>(`/conference-chat/${conferenceId}/group`, { userId, content, replyToId })
    return response.data
}

// DM (global, not conference-scoped)
export const getDmMessages = async (userId: number, otherUserId: number): Promise<ChatMessage[]> => {
    const response = await http.get<ChatMessage[]>(`/conference-chat/dm/${otherUserId}?userId=${userId}`)
    return response.data
}

export const sendDmMessage = async (userId: number, recipientId: number, content: string, replyToId?: number): Promise<ChatMessage> => {
    const response = await http.post<ChatMessage>(`/conference-chat/dm`, { userId, recipientId, content, replyToId })
    return response.data
}

export const sendDmFile = async (userId: number, recipientId: number, file: File): Promise<ChatMessage> => {
    const formData = new FormData()
    formData.append('userId', String(userId))
    formData.append('recipientId', String(recipientId))
    formData.append('file', file)
    const response = await http.post<ChatMessage>(`/conference-chat/dm/file`, formData)
    return response.data
}

export const sendGroupFile = async (conferenceId: number, userId: number, file: File): Promise<ChatMessage> => {
    const formData = new FormData()
    formData.append('userId', String(userId))
    formData.append('file', file)
    const response = await http.post<ChatMessage>(`/conference-chat/${conferenceId}/group/file`, formData)
    return response.data
}

// Reactions
export const toggleReaction = async (messageId: number, userId: number, emoji: string): Promise<ChatMessage> => {
    const response = await http.post<ChatMessage>(`/conference-chat/${messageId}/react`, { userId, emoji })
    return response.data
}

// Delete
export const deleteMessage = async (messageId: number, userId: number): Promise<ChatMessage> => {
    const response = await http.delete<ChatMessage>(`/conference-chat/${messageId}?userId=${userId}`)
    return response.data
}

// Forward
export const forwardMessage = async (messageId: number, userId: number, targetType: 'dm' | 'group', targetId: number): Promise<ChatMessage> => {
    const response = await http.post<ChatMessage>(`/conference-chat/forward`, { messageId, userId, targetType, targetId })
    return response.data
}

// Members
export const getChatMembers = async (conferenceId: number): Promise<ChatMember[]> => {
    const response = await http.get<ChatMember[]>(`/conference-chat/${conferenceId}/members`)
    return response.data
}

// Online presence
export const sendHeartbeat = async (userId: number): Promise<void> => {
    await http.post('/conference-chat/heartbeat', { userId })
}

export const getOnlineUsers = async (conferenceId: number): Promise<number[]> => {
    const response = await http.get<number[]>(`/conference-chat/${conferenceId}/online`)
    return response.data
}

// DM Conversations (list of chat partners with last message)
export interface DmConversation {
    userId: number
    firstName: string
    lastName: string
    email: string
    lastMessage: string
    lastMessageAt: string
    lastMessageUserId: number
}

export const getDmConversations = async (userId: number): Promise<DmConversation[]> => {
    const response = await http.get<DmConversation[]>(`/conference-chat/dm-conversations?userId=${userId}`)
    return response.data
}
