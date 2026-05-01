'use client'

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import {
    getGroupMessages, sendGroupMessage, getDmMessages, sendDmMessage, getChatMembers,
    sendHeartbeat, getOnlineUsers, getDmConversations, sendDmFile, sendGroupFile,
    toggleReaction, deleteMessage, forwardMessage,
    type ChatMessage, type ChatMember, type DmConversation
} from '@/app/api/conference-chat.api'
import { getChairedConferences, getProgramConferences } from '@/app/api/conference.api'
import { getUsers } from '@/app/api/user.api'
import type { User } from '@/types/user'
import { useWebSocket } from '@/hooks/use-websocket'
import {
    MessageCircle, Send, X, Loader2, Hash, Search, Smile, Paperclip,
    Settings, Image, Users, ChevronRight, ArrowLeft, Building2, FileText, Download,
    Reply, Trash2, Forward, SmilePlus
} from 'lucide-react'
import { toast } from 'sonner'
import { getCurrentUserId } from '@/lib/auth'

interface ConferenceOption { id: number; name: string; acronym?: string }
const EMOJI_QUICK = ['👍','❤️','😂','😮','😢','🔥','🎉','👏','✅','💯']

function Av({ name, size = 40, className = '' }: { name: string; size?: number; className?: string }) {
    const ini = name.split(' ').map(w => w?.[0] || '').join('').slice(0, 2).toUpperCase()
    const cols = ['bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-violet-500','bg-cyan-500','bg-pink-500','bg-teal-500']
    return <div className={`${cols[name.charCodeAt(0) % cols.length]} rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.36 }}>{ini || '?'}</div>
}

function RoleBadge({ role }: { role?: string }) {
    if (!role) return null
    const r = role.replace(/_/g, ' ')
    const c: Record<string,string> = { 'CONFERENCE CHAIR':'bg-amber-100 text-amber-700','PROGRAM CHAIR':'bg-blue-100 text-blue-700','REVIEWER':'bg-emerald-100 text-emerald-700' }
    return <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${c[r]||'bg-gray-100 text-gray-600'}`}>{r}</span>
}

function relTime(d: string) {
    try { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return 'now'; if (m < 60) return `${m}m`; const h = Math.floor(m/60); return h < 24 ? `${h}h` : `${Math.floor(h/24)}d` } catch { return '' }
}

function fmtTime(d: string) { try { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

type RightPanel = 'chat' | 'settings'

export function MemberChatWidget() {
    const params = useParams()
    const urlConfId = params?.conferenceId ? Number(params.conferenceId) : undefined
    const currentUserId = getCurrentUserId()

    const [isOpen, setIsOpen] = useState(false)
    const [selConfId, setSelConfId] = useState<number | undefined>(urlConfId)
    const [confs, setConfs] = useState<ConferenceOption[]>([])
    const [loadingConfs, setLoadingConfs] = useState(false)

    const [chatType, setChatType] = useState<'group'|'dm'>('group')
    const [dmTarget, setDmTarget] = useState<ChatMember | null>(null)
    const [groupMsgs, setGroupMsgs] = useState<ChatMessage[]>([])
    const [dmMsgs, setDmMsgs] = useState<ChatMessage[]>([])
    const [members, setMembers] = useState<ChatMember[]>([])
    const [loading, setLoading] = useState(false)
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const [searchQ, setSearchQ] = useState('')
    const [showEmoji, setShowEmoji] = useState(false)
    const [rightPanel, setRightPanel] = useState<RightPanel>('chat')
    const [allUsers, setAllUsers] = useState<User[]>([])
    const [searchResults, setSearchResults] = useState<User[]>([])
    const [searchFocused, setSearchFocused] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set())
    const [dmConvos, setDmConvos] = useState<DmConversation[]>([])
    const [unreadDmIds, setUnreadDmIds] = useState<Set<number>>(new Set()) // userIds with unread DMs
    const [chatMode, setChatMode] = useState<'dm' | number>('dm') // 'dm' or conferenceId
    const [unreadGroupMap, setUnreadGroupMap] = useState<Map<number, number>>(new Map()) // confId -> unread count
    const [showModeDropdown, setShowModeDropdown] = useState(false)
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
    const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null)
    const [showReactPicker, setShowReactPicker] = useState<number | null>(null) // messageId
    const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null) // message to forward
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null) // messageId
    const [fwdSearch, setFwdSearch] = useState('')
    const [fwdSelected, setFwdSelected] = useState<{type:'dm'|'group', id:number, name:string}[]>([])
    const [fwdSending, setFwdSending] = useState(false)

    const endRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const confId = typeof chatMode === 'number' ? chatMode : (urlConfId || selConfId)

    useEffect(() => { if (urlConfId) setSelConfId(urlConfId) }, [urlConfId])
    const scroll = useCallback(() => { setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80) }, [])
    const roleMap = useMemo(() => { const m = new Map<number,string>(); members.forEach(mb => m.set(mb.userId, mb.role)); return m }, [members])

    // Load all users for search (on mount, not just when open)
    useEffect(() => {
        if (allUsers.length === 0) {
            getUsers().then(setAllUsers).catch(() => {})
        }
    }, [allUsers.length])

    // Search filter — debounced via useMemo
    useEffect(() => {
        if (!searchQ.trim()) { setSearchResults([]); return }
        const q = searchQ.toLowerCase()
        const results = allUsers.filter(u =>
            u.id !== currentUserId &&
            (`${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        ).slice(0, 8)
        setSearchResults(results)
    }, [searchQ, allUsers, currentUserId])

    const handleSearchSelect = (user: User) => {
        const asMember: ChatMember = { userId: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: '' }
        openChat('dm', asMember)
        setSearchQ('')
        setSearchResults([])
        setSearchFocused(false)
    }

    // Data
    const loadConfs = useCallback(async () => {
        if (!currentUserId) return; setLoadingConfs(true)
        try {
            const [c, p] = await Promise.all([getChairedConferences(currentUserId,0,50).catch(()=>({content:[]})), getProgramConferences(currentUserId,0,50).catch(()=>({content:[]}))])
            const all = [...(c.content||[]),...(p.content||[])]; const seen = new Set<number>(); const u: ConferenceOption[] = []
            for (const x of all) { if (!seen.has(x.id)) { seen.add(x.id); u.push({id:x.id,name:x.name,acronym:x.acronym}) } }
            setConfs(u); if (!confId && u.length > 0) setSelConfId(u[0].id)
        } catch {} setLoadingConfs(false)
    }, [currentUserId, confId])

    const loadGroup = useCallback(async () => { if (!confId) return; try { setLoading(true); setGroupMsgs(await getGroupMessages(confId)); scroll() } catch {} finally { setLoading(false) } }, [confId, scroll])
    const loadDm = useCallback(async () => { if (!currentUserId||!dmTarget) return; try { setLoading(true); setDmMsgs(await getDmMessages(currentUserId,dmTarget.userId)); scroll() } catch {} finally { setLoading(false) } }, [currentUserId, dmTarget, scroll])
    const loadMembers = useCallback(async () => { if (!confId) return; try { const d = await getChatMembers(confId); setMembers(d.filter(m=>m.userId!==currentUserId)) } catch {} }, [confId, currentUserId])

    // Load conferences ON MOUNT (not just when open) so polling starts early
    useEffect(() => { loadConfs() }, [loadConfs])
    // Load group messages whenever confId changes (not just when open)
    useEffect(() => { if (confId) { loadGroup(); loadMembers() } }, [confId, loadGroup, loadMembers])
    // DM loading is handled by openChat() — no separate effect needed

    // Poll DM conversations list (global, no conferenceId)
    useEffect(() => {
        if (!currentUserId) return
        const fetchConvos = () => getDmConversations(currentUserId).then(setDmConvos).catch(() => {})
        fetchConvos()
        const interval = setInterval(fetchConvos, 3000)
        return () => clearInterval(interval)
    }, [currentUserId])

    // Heartbeat: send every 30s so backend knows we're online
    useEffect(() => {
        if (!currentUserId) return
        sendHeartbeat(currentUserId).catch(() => {})
        const interval = setInterval(() => sendHeartbeat(currentUserId).catch(() => {}), 30000)
        return () => clearInterval(interval)
    }, [currentUserId])

    // Poll online users every 30s
    useEffect(() => {
        if (!confId) return
        const fetchOnline = () => getOnlineUsers(confId).then(ids => setOnlineUserIds(new Set(ids))).catch(() => {})
        fetchOnline()
        const interval = setInterval(fetchOnline, 30000)
        return () => clearInterval(interval)
    }, [confId])

    // ── WebSocket for instant messages ──
    const isOpenRef = useRef(isOpen)
    isOpenRef.current = isOpen
    const confIdRef = useRef(confId)
    confIdRef.current = confId

    // Group chat WebSocket — user-level (receives from all conferences)
    useWebSocket<ChatMessage>(currentUserId ? `/topic/user.${currentUserId}.group` : null,
        useCallback((m: ChatMessage) => {
            // Only add to groupMsgs if it's from the currently selected conference
            if (m.conferenceId === confIdRef.current) {
                setGroupMsgs(p => p.some(x => x.id === m.id) ? p : [...p, m])
                scroll()
            }
            // Always notify if chat is closed
            if (m.userId !== currentUserId) {
                // Track unread per conference
                if (m.conferenceId) {
                    setUnreadGroupMap(prev => {
                        const n = new Map(prev)
                        n.set(m.conferenceId, (n.get(m.conferenceId) || 0) + 1)
                        return n
                    })
                }
                if (!isOpenRef.current) {
                    setUnreadCount(c => c + 1)
                }
            }
        }, [scroll, currentUserId]), !!currentUserId)

    // DM WebSocket — user-level (works globally, not conference-scoped)
    const dmTargetRef = useRef(dmTarget)
    dmTargetRef.current = dmTarget
    const chatTypeRef = useRef(chatType)
    chatTypeRef.current = chatType

    useWebSocket<ChatMessage>(currentUserId ? `/topic/user.${currentUserId}.dm` : null,
        useCallback((m: ChatMessage) => {
            // Only add to dmMsgs if this message is from/to the currently open DM partner
            const partnerId = m.userId === currentUserId ? m.recipientId : m.userId
            if (chatTypeRef.current === 'dm' && dmTargetRef.current && dmTargetRef.current.userId === partnerId) {
                setDmMsgs(p => p.some(x => x.id === m.id) ? p : [...p, m])
                scroll()
            }
            // Refresh conversation list (global)
            if (currentUserId) {
                getDmConversations(currentUserId).then(setDmConvos).catch(() => {})
            }
            // Mark as unread if not currently viewing this conversation
            if (m.userId !== currentUserId) {
                const isViewingThisDm = isOpenRef.current && chatTypeRef.current === 'dm' && dmTargetRef.current?.userId === m.userId
                if (!isViewingThisDm) {
                    setUnreadDmIds(prev => new Set(prev).add(m.userId))
                    setUnreadCount(c => c + 1)
                }
            }
        }, [scroll, currentUserId]), !!currentUserId)

    // Fallback polling (slower, catches anything WebSocket missed)
    useEffect(() => {
        if (!confId) return
        const poll = async () => {
            try {
                const msgs = await getGroupMessages(confId)
                setGroupMsgs(prev => {
                    const prevLastId = prev.length > 0 ? prev[prev.length - 1].id : 0
                    const newLastId = msgs.length > 0 ? msgs[msgs.length - 1].id : 0
                    return newLastId > prevLastId ? msgs : prev
                })
            } catch {}
        }
        const interval = setInterval(poll, 10000)
        return () => clearInterval(interval)
    }, [confId])

    useEffect(() => {
        if (!confId || !currentUserId || chatType !== 'dm' || !dmTarget) return
        const poll = async () => {
            try {
                const msgs = await getDmMessages(confId, currentUserId, dmTarget.userId)
                setDmMsgs(prev => {
                    const prevLastId = prev.length > 0 ? prev[prev.length - 1].id : 0
                    const newLastId = msgs.length > 0 ? msgs[msgs.length - 1].id : 0
                    return newLastId > prevLastId ? msgs : prev
                })
            } catch {}
        }
        const interval = setInterval(poll, 10000)
        return () => clearInterval(interval)
    }, [confId, currentUserId, chatType, dmTarget])

    const [msgStatus, setMsgStatus] = useState<'idle'|'sending'|'sent'>('idle')

    const handleSend = async () => {
        if (!input.trim()||!currentUserId) return
        if (chatType === 'group' && !confId) return
        setMsgStatus('sending')
        setSending(true)
        const text = input.trim()
        const replyId = replyTo?.id
        setInput('')
        setReplyTo(null)
        try {
            if (chatType==='group' && confId) {
                const sent = await sendGroupMessage(confId, currentUserId, text, replyId)
                setGroupMsgs(p => p.some(x=>x.id===sent.id) ? p : [...p, sent])
            } else if (dmTarget) {
                const sent = await sendDmMessage(currentUserId, dmTarget.userId, text, replyId)
                setDmMsgs(p => p.some(x=>x.id===sent.id) ? p : [...p, sent])
            }
            setMsgStatus('sent')
            scroll()
            setTimeout(() => setMsgStatus('idle'), 2000)
        } catch {
            toast.error('Failed to send')
            setInput(text) // restore input on failure
            setMsgStatus('idle')
        } finally { setSending(false); setShowEmoji(false) }
    }

    const openChat = (type: 'group'|'dm', target?: ChatMember) => {
        setChatType(type); setDmTarget(target||null); setRightPanel('chat')
        if (type === 'dm' && target) {
            // Mark as read
            setUnreadDmIds(prev => { const n = new Set(prev); n.delete(target.userId); return n })
            // Load history from DB (global, no conferenceId)
            setDmMsgs([])
            if (currentUserId) {
                setLoading(true)
                getDmMessages(currentUserId, target.userId)
                    .then(msgs => { setDmMsgs(msgs); scroll() })
                    .catch(() => {})
                    .finally(() => setLoading(false))
            }
        } else if (type === 'group') {
            // Clear unread for this conference
            if (confId) {
                setUnreadGroupMap(prev => { const n = new Map(prev); n.delete(confId); return n })
            }
            const gId = confId
            if (gId) {
                setLoading(true)
                getGroupMessages(gId)
                    .then(msgs => { setGroupMsgs(msgs); scroll() })
                    .catch(() => {})
                    .finally(() => setLoading(false))
            }
        }
    }

    const lastGrp = groupMsgs[groupMsgs.length-1]

    if (!currentUserId) return null
    const msgs = chatType==='group' ? groupMsgs : dmMsgs
    const activeConf = confs.find(c=>c.id===confId)

    return (
        <>
            <button onClick={() => { setIsOpen(p => { if (!p) setUnreadCount(0); return !p }); }}
                className={`fixed bottom-6 right-24 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${isOpen?'bg-indigo-700':'bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-110'}`}
                title="Team Chat">
                {isOpen ? <X className="h-5 w-5 text-white"/> : <MessageCircle className="h-5 w-5 text-white"/>}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-[760px] h-[560px] bg-white rounded-2xl shadow-2xl border flex overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

                    {/* ══ LEFT: Conversation List ══ */}
                    <div className="w-[280px] border-r flex flex-col bg-white">
                        <div className="px-4 pt-3 pb-1">
                            <h3 className="font-bold text-lg text-gray-900">Chats</h3>
                        </div>
                        <div className="px-3 py-1.5 relative">
                            <button onClick={() => setShowModeDropdown(p => !p)}
                                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-left">
                                {chatMode === 'dm' ? (
                                    <><MessageCircle className="h-4 w-4 text-indigo-500"/><span className="text-xs font-semibold text-gray-700 flex-1">Direct Messages</span>
                                    {unreadDmIds.size > 0 && <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadDmIds.size}</span>}</>
                                ) : (
                                    <><Hash className="h-4 w-4 text-indigo-500"/><span className="text-xs font-semibold text-gray-700 flex-1 truncate">{confs.find(c => c.id === chatMode)?.acronym || confs.find(c => c.id === chatMode)?.name || 'Group'}</span>
                                    {(unreadGroupMap.get(chatMode as number) || 0) > 0 && <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadGroupMap.get(chatMode as number)}</span>}</>
                                )}
                                <ChevronRight className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showModeDropdown ? 'rotate-90' : ''}`}/>
                            </button>
                            {showModeDropdown && (
                                <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-xl border shadow-lg z-30 max-h-[280px] overflow-y-auto">
                                    <button onClick={() => { setChatMode('dm'); setChatType('dm'); setRightPanel('chat'); setShowModeDropdown(false) }}
                                        className={`w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-indigo-50 text-left ${chatMode === 'dm' ? 'bg-indigo-50' : ''}`}>
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><MessageCircle className="h-3.5 w-3.5 text-white"/></div>
                                        <span className="text-xs font-semibold text-gray-800 flex-1">Direct Messages</span>
                                        {unreadDmIds.size > 0 && <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadDmIds.size}</span>}
                                    </button>
                                    {confs.map(c => {
                                        const unread = unreadGroupMap.get(c.id) || 0
                                        return (
                                            <button key={c.id} onClick={() => { setChatMode(c.id); setChatType('group'); setSelConfId(c.id); setShowModeDropdown(false); openChat('group') }}
                                                className={`w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-indigo-50 text-left ${chatMode === c.id ? 'bg-indigo-50' : ''}`}>
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center"><Hash className="h-3.5 w-3.5 text-white"/></div>
                                                <span className="text-xs font-semibold text-gray-800 flex-1 truncate">{c.acronym || c.name}</span>
                                                {unread > 0 && <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                        {chatMode === 'dm' ? (
                            <>
                                <div className="px-3 py-1.5 relative">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                                        <Search className="h-3.5 w-3.5 text-gray-400"/>
                                        <input className="bg-transparent text-xs flex-1 outline-none placeholder:text-gray-400" placeholder="Search people..."
                                            value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                                            onFocus={()=>setSearchFocused(true)} onBlur={()=>setTimeout(()=>setSearchFocused(false),200)}/>
                                        {searchQ && <button onClick={()=>{setSearchQ('');setSearchResults([])}} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3"/></button>}
                                    </div>
                                    {searchFocused && searchResults.length > 0 && (
                                        <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-xl border shadow-lg z-20 max-h-[240px] overflow-y-auto">
                                            {searchResults.map(u => {
                                                const n = `${u.firstName} ${u.lastName}`.trim()
                                                return (
                                                    <button key={u.id} onClick={()=>handleSearchSelect(u)}
                                                        className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-indigo-50 transition-colors text-left">
                                                        <Av name={n} size={32}/>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-semibold text-gray-900 truncate">{n}</p>
                                                            <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {dmConvos.map(conv => {
                                        const n = `${conv.firstName} ${conv.lastName}`.trim()
                                        const active = chatType==='dm' && dmTarget?.userId===conv.userId
                                        const isUnread = unreadDmIds.has(conv.userId)
                                        const asMember: ChatMember = { userId: conv.userId, firstName: conv.firstName, lastName: conv.lastName, email: conv.email, role: '' }
                                        const preview = conv.lastMessageUserId === currentUserId ? `You: ${conv.lastMessage}` : `${conv.firstName}: ${conv.lastMessage}`
                                        return (
                                            <button key={conv.userId} onClick={()=>openChat('dm', asMember)}
                                                className={`w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 transition-colors text-left ${active?'bg-indigo-50':''}`}>
                                                <div className="relative">
                                                    <Av name={n} size={40}/>
                                                    {onlineUserIds.has(conv.userId) && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"/>}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-[13px] truncate ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'}`}>{n}</p>
                                                    <p className={`text-[11px] truncate ${isUnread ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>{preview.slice(0, 35)}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className="text-[9px] text-gray-400">{relTime(conv.lastMessageAt)}</span>
                                                    {isUnread && <span className="w-2.5 h-2.5 rounded-full bg-[#0084ff]"/>}
                                                </div>
                                            </button>
                                        )
                                    })}
                                    {dmConvos.length === 0 && <div className="flex flex-col items-center justify-center py-10 text-gray-300"><MessageCircle className="h-8 w-8 mb-2"/><p className="text-xs text-gray-400">No conversations yet</p></div>}
                                </div>
                            </>
                        ) : (
                            /* Group mode — messages shown directly on right panel */
                            <div className="flex-1 overflow-y-auto">
                                <div className="flex flex-col items-center py-8 text-gray-400">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-3">
                                        <Hash className="h-6 w-6 text-white"/>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700">{activeConf?.acronym || activeConf?.name}</p>
                                    <p className="text-xs text-gray-400">{members.length + 1} members</p>
                                </div>
                                <div className="px-3 border-t pt-2">
                                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-2 mb-1">Members</p>
                                    {members.slice(0, 10).map(m => {
                                        const mn = `${m.firstName} ${m.lastName}`.trim()
                                        return (
                                            <div key={m.userId} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50">
                                                <Av name={mn} size={28}/>
                                                <p className="text-xs text-gray-700 truncate flex-1">{mn}</p>
                                                <RoleBadge role={m.role}/>
                                            </div>
                                        )
                                    })}
                                    {members.length > 10 && <p className="text-[10px] text-gray-400 px-2 py-1">+{members.length - 10} more</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ══ RIGHT: Chat / Settings ══ */}
                    <div className="flex-1 flex flex-col bg-white min-w-0">
                        {rightPanel === 'chat' ? (
                            <>
                                {/* Header */}
                                <div className="px-4 py-2.5 border-b flex items-center gap-2.5 shrink-0">
                                    {chatType==='dm' && dmTarget ? (
                                        <><Av name={`${dmTarget.firstName} ${dmTarget.lastName}`} size={34}/>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold truncate">{dmTarget.firstName} {dmTarget.lastName}</p>
                                            <p className={`text-[10px] font-medium ${onlineUserIds.has(dmTarget.userId) ? 'text-green-500' : 'text-gray-400'}`}>{onlineUserIds.has(dmTarget.userId) ? 'Active now' : 'Offline'}</p>
                                        </div></>
                                    ) : (
                                        <><div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0"><Hash className="h-4 w-4 text-white"/></div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold truncate">{activeConf?.acronym||'Group Chat'}</p>
                                            <p className="text-[10px] text-gray-400">{members.length+1} members</p>
                                        </div></>
                                    )}
                                    <button onClick={()=>setRightPanel('settings')} className="p-2 rounded-full hover:bg-gray-100 shrink-0" title="Settings">
                                        <Settings className="h-4 w-4 text-gray-500"/>
                                    </button>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto px-4 py-3" onClick={() => setShowReactPicker(null)}>
                                    {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-indigo-500"/></div>
                                    : msgs.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-gray-300"><MessageCircle className="h-10 w-10 mb-2"/><p className="text-xs text-gray-400">No messages yet</p></div>
                                    : (<>
                                        {msgs.map((msg, i) => {
                                            const isOwn = msg.userId === currentUserId
                                            const prev = i > 0 ? msgs[i-1] : null
                                            const showSender = !prev || prev.userId !== msg.userId
                                            const name = `${msg.userFirstName||''} ${msg.userLastName||''}`.trim()
                                            const role = roleMap.get(msg.userId)
                                            const isLast = i===msgs.length-1 || msgs[i+1]?.userId !== msg.userId
                                            const isHovered = hoveredMsgId === msg.id
                                            const REACT_EMOJIS = ['👍','❤️','😂','😮','😢','🔥']
                                            const setMsgs = chatType === 'group' ? setGroupMsgs : setDmMsgs

                                            const handleReact = async (emoji: string) => {
                                                if (!currentUserId) return
                                                setShowReactPicker(null)
                                                try {
                                                    const updated = await toggleReaction(msg.id, currentUserId, emoji)
                                                    setMsgs(p => p.map(m => m.id === msg.id ? { ...m, reactions: updated.reactions } : m))
                                                } catch {}
                                            }

                                            const handleDelete = async () => {
                                                if (!currentUserId) return
                                                setShowDeleteConfirm(null)
                                                try {
                                                    const updated = await deleteMessage(msg.id, currentUserId)
                                                    setMsgs(p => p.map(m => m.id === msg.id ? { ...m, ...updated } : m))
                                                } catch {}
                                            }

                                            const handleForward = () => {
                                                setForwardMsg(msg)
                                                setHoveredMsgId(null)
                                            }

                                            return (
                                                <div key={msg.id}
                                                    className={`flex ${isOwn?'justify-end':'justify-start'} ${showSender?'mt-3':'mt-[2px]'} group relative`}
                                                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                                                    onMouseLeave={() => { setHoveredMsgId(null); if (showReactPicker === msg.id) {} }}>
                                                    {!isOwn && showSender && <Av name={name} size={28} className="mt-5 mr-1.5"/>}
                                                    {!isOwn && !showSender && <div className="w-7 mr-1.5 shrink-0"/>}
                                                    <div className={`max-w-[70%] flex flex-col ${isOwn?'items-end':'items-start'} relative`}>
                                                        {showSender && !isOwn && (
                                                            <div className="flex items-center gap-1 mb-0.5 ml-1">
                                                                <span className="text-[11px] font-semibold text-gray-600">{name}</span>
                                                                {chatType === 'group' && <RoleBadge role={role}/>}
                                                            </div>
                                                        )}
                                                        {/* Forwarded label */}
                                                        {msg.forwarded && (
                                                            <div className="flex items-center gap-1 mb-0.5 ml-1">
                                                                <Forward className="h-3 w-3 text-gray-400"/>
                                                                <span className="text-[10px] text-gray-400 italic">Forwarded</span>
                                                            </div>
                                                        )}
                                                        {/* Reply preview */}
                                                        {msg.replyTo && (
                                                            <div className={`text-[10px] px-2.5 py-1 mb-0.5 rounded-lg border-l-2 ${isOwn ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-300 text-gray-600'} max-w-full truncate`}>
                                                                <span className="font-semibold">{msg.replyTo.userFirstName}</span>: {msg.replyTo.content?.slice(0, 50)}
                                                            </div>
                                                        )}
                                                        {/* Message content */}
                                                        {msg.deleted ? (
                                                            <div className="px-3 py-[7px] text-[13px] italic text-gray-400 bg-gray-100 rounded-[18px]">
                                                                🚫 This message has been deleted
                                                            </div>
                                                        ) : (() => {
                                                            const isImage = msg.fileUrl && /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(msg.fileName || '')
                                                            if (msg.fileUrl && isImage) {
                                                                return (
                                                                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block max-w-[240px]">
                                                                        <img src={msg.fileUrl} alt={msg.fileName || 'Image'}
                                                                            className={`rounded-[18px] ${isOwn ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'} max-h-[280px] object-cover w-full`}
                                                                            loading="lazy"/>
                                                                    </a>
                                                                )
                                                            } else if (msg.fileUrl) {
                                                                return (
                                                                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                                                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-[18px] ${isOwn
                                                                            ? 'bg-[#0084ff] text-white rounded-br-[4px]'
                                                                            : 'bg-[#f0f0f0] text-gray-900 rounded-bl-[4px]'}`}>
                                                                        <FileText className="h-5 w-5 shrink-0"/>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-[12px] font-semibold truncate">{msg.fileName || 'File'}</p>
                                                                            <p className={`text-[10px] ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>Click to download</p>
                                                                        </div>
                                                                        <Download className="h-4 w-4 shrink-0"/>
                                                                    </a>
                                                                )
                                                            } else {
                                                                return (
                                                                    <div className={`px-3 py-[7px] text-[13.5px] leading-[1.4] ${isOwn
                                                                        ? 'bg-[#0084ff] text-white rounded-[18px] rounded-br-[4px]'
                                                                        : 'bg-[#f0f0f0] text-gray-900 rounded-[18px] rounded-bl-[4px]'}`}>
                                                                        <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                                                                    </div>
                                                                )
                                                            }
                                                        })()}
                                                        {/* Reactions display */}
                                                        {msg.reactions && msg.reactions.length > 0 && (
                                                            <div className="flex items-center gap-0.5 mt-0.5 ml-1">
                                                                {Object.entries(msg.reactions.reduce((acc: Record<string, number>, r) => {
                                                                    acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc
                                                                }, {})).map(([emoji, count]) => (
                                                                    <button key={emoji} onClick={() => handleReact(emoji)}
                                                                        className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-full text-[11px] transition-colors border border-gray-200">
                                                                        <span>{emoji}</span>
                                                                        {(count as number) > 1 && <span className="text-[9px] text-gray-500">{count as number}</span>}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {isLast && (
                                                            <div className="flex items-center gap-1 mt-0.5 mx-1">
                                                                <span className="text-[9px] text-gray-400">{fmtTime(msg.createdAt)}</span>
                                                                {isOwn && i === msgs.length - 1 && msgStatus !== 'idle' && (
                                                                    <span className={`text-[9px] ${msgStatus === 'sending' ? 'text-gray-400' : 'text-blue-500'}`}>
                                                                        {msgStatus === 'sending' ? '⏳ Sending...' : '✓ Sent'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Hover action bar */}
                                                    {isHovered && !msg.deleted && (
                                                        <div className={`absolute ${isOwn ? 'right-0 -top-7' : 'left-8 -top-7'} flex items-center bg-white rounded-lg shadow-md border px-0.5 py-0.5 z-10 gap-0`}>
                                                            <button onClick={(e) => { e.stopPropagation(); setShowReactPicker(showReactPicker === msg.id ? null : msg.id) }}
                                                                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-yellow-500" title="React"><SmilePlus className="h-3.5 w-3.5"/></button>
                                                            <button onClick={() => { setReplyTo(msg); setHoveredMsgId(null) }}
                                                                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-500" title="Reply"><Reply className="h-3.5 w-3.5"/></button>
                                                            <button onClick={() => { handleForward(); }}
                                                                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-green-500" title="Forward"><Forward className="h-3.5 w-3.5"/></button>
                                                            {isOwn && (
                                                                <button onClick={() => { setShowDeleteConfirm(msg.id); setHoveredMsgId(null) }}
                                                                    className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-red-500" title="Delete"><Trash2 className="h-3.5 w-3.5"/></button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* React picker popup */}
                                                    {showReactPicker === msg.id && (
                                                        <div className={`absolute ${isOwn ? 'right-0 -top-14' : 'left-8 -top-14'} flex items-center bg-white rounded-full shadow-lg border px-1.5 py-1 z-20 gap-0.5`}
                                                            onClick={e => e.stopPropagation()}>
                                                            {REACT_EMOJIS.map(e => {
                                                                const myReaction = msg.reactions?.some(r => r.userId === currentUserId && r.emoji === e)
                                                                return (
                                                                    <button key={e} onClick={() => handleReact(e)}
                                                                        className={`text-lg hover:scale-125 transition-transform p-0.5 rounded-full ${myReaction ? 'bg-blue-100 ring-2 ring-blue-400 scale-110' : 'hover:bg-gray-100'}`}>{e}</button>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                    {/* Delete confirm */}
                                                    {showDeleteConfirm === msg.id && (
                                                        <div className={`absolute ${isOwn ? 'right-0' : 'left-8'} -top-16 bg-white rounded-xl shadow-lg border p-2.5 z-20 min-w-[180px]`}
                                                            onClick={e => e.stopPropagation()}>
                                                            <p className="text-[11px] text-gray-700 font-medium mb-2">Delete this message?</p>
                                                            <div className="flex gap-1.5">
                                                                <button onClick={() => setShowDeleteConfirm(null)}
                                                                    className="flex-1 text-[11px] px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600">Cancel</button>
                                                                <button onClick={handleDelete}
                                                                    className="flex-1 text-[11px] px-2 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium">Delete</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        <div ref={endRef}/>
                                    </>)}
                                </div>

                                {/* Reply bar */}
                                {replyTo && (
                                    <div className="px-4 py-2 border-t bg-gray-50 flex items-center gap-2">
                                        <div className="w-1 h-8 bg-blue-500 rounded-full shrink-0"/>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-semibold text-blue-600">Replying to {replyTo.userFirstName} {replyTo.userLastName}</p>
                                            <p className="text-[11px] text-gray-500 truncate">{replyTo.content?.slice(0, 60) || '[File]'}</p>
                                        </div>
                                        <button onClick={() => setReplyTo(null)} className="p-1 rounded-full hover:bg-gray-200 text-gray-400"><X className="h-3.5 w-3.5"/></button>
                                    </div>
                                )}

                                {/* Emoji */}
                                {showEmoji && (
                                    <div className="px-4 py-1.5 border-t flex items-center gap-1 bg-gray-50 flex-wrap">
                                        {EMOJI_QUICK.map(e=><button key={e} onClick={()=>{setInput(p=>p+e);setShowEmoji(false)}} className="text-lg hover:scale-125 transition-transform p-0.5">{e}</button>)}
                                    </div>
                                )}

                                {/* Input */}
                                <div className="px-3 py-2 border-t shrink-0 flex items-center gap-1.5">
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file || !currentUserId) return
                                        setSending(true)
                                        try {
                                            if (chatType === 'dm' && dmTarget) {
                                                const sent = await sendDmFile(currentUserId, dmTarget.userId, file)
                                                setDmMsgs(p => p.some(x => x.id === sent.id) ? p : [...p, sent])
                                            } else if (chatType === 'group' && confId) {
                                                const sent = await sendGroupFile(confId, currentUserId, file)
                                                setGroupMsgs(p => p.some(x => x.id === sent.id) ? p : [...p, sent])
                                            }
                                            scroll()
                                        } catch { toast.error('Failed to upload file') }
                                        finally { setSending(false); if (fileInputRef.current) fileInputRef.current.value = '' }
                                    }}/>
                                    <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-full hover:bg-gray-100 text-[#0084ff]" title="Attach"><Paperclip className="h-5 w-5"/></button>
                                    <button onClick={()=>setShowEmoji(p=>!p)} className="p-1.5 rounded-full hover:bg-gray-100 text-[#0084ff]" title="Emoji"><Smile className="h-5 w-5"/></button>
                                    <input className="flex-1 px-3 py-2 text-sm bg-gray-100 rounded-full outline-none focus:ring-1 focus:ring-blue-200"
                                        placeholder="Aa" value={input} onChange={e=>setInput(e.target.value)}
                                        onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()}}} disabled={sending}/>
                                    <button onClick={handleSend} disabled={sending||!input.trim()}
                                        className="p-1.5 rounded-full text-[#0084ff] hover:bg-blue-50 disabled:opacity-30"><Send className="h-5 w-5"/></button>
                                </div>
                            </>
                        ) : (
                            /* ── Settings Panel ── */
                            <>
                                <div className="px-3 py-2.5 border-b flex items-center gap-2 shrink-0">
                                    <button onClick={()=>setRightPanel('chat')} className="p-1.5 rounded-full hover:bg-gray-100"><ArrowLeft className="h-4 w-4 text-gray-600"/></button>
                                    <p className="text-sm font-semibold">Chat Details</p>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <div className="flex flex-col items-center py-5 border-b">
                                        {chatType==='dm' && dmTarget
                                            ? <><Av name={`${dmTarget.firstName} ${dmTarget.lastName}`} size={60}/><p className="mt-2 font-semibold text-sm">{dmTarget.firstName} {dmTarget.lastName}</p><p className="text-[11px] text-gray-400">{dmTarget.email}</p></>
                                            : <><div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center"><Hash className="h-6 w-6 text-white"/></div><p className="mt-2 font-semibold text-sm">{activeConf?.acronym||activeConf?.name}</p><p className="text-[11px] text-gray-400">{members.length+1} members</p></>
                                        }
                                    </div>
                                    <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left border-b">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><Image className="h-4 w-4 text-gray-600"/></div>
                                        <span className="text-sm font-medium flex-1">Media & Files</span>
                                        <ChevronRight className="h-4 w-4 text-gray-400"/>
                                    </button>
                                    {chatType === 'group' && (
                                    <div>
                                        <div className="px-4 py-3 flex items-center gap-3 border-b">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><Users className="h-4 w-4 text-gray-600"/></div>
                                            <span className="text-sm font-medium flex-1">Members</span>
                                            <span className="text-xs text-gray-400">{members.length+1}</span>
                                        </div>
                                        <div className="px-3 py-2 space-y-0.5">
                                            {members.map(m=>{
                                                const n=`${m.firstName} ${m.lastName}`.trim()
                                                return <div key={m.userId} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50">
                                                    <Av name={n} size={30}/><div className="min-w-0 flex-1"><p className="text-xs font-medium truncate">{n}</p><p className="text-[10px] text-gray-400 truncate">{m.email}</p></div><RoleBadge role={m.role}/>
                                                </div>
                                            })}
                                        </div>
                                    </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            {/* Forward modal */}
            {forwardMsg && (() => {
                const toggleSelect = (item: {type:'dm'|'group', id:number, name:string}) => {
                    setFwdSelected(prev => prev.some(s => s.type === item.type && s.id === item.id)
                        ? prev.filter(s => !(s.type === item.type && s.id === item.id))
                        : [...prev, item]
                    )
                }

                const filteredDm = dmConvos.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(fwdSearch.toLowerCase()))
                const filteredGroups = confs.filter(c => (c.acronym || c.name || '').toLowerCase().includes(fwdSearch.toLowerCase()))

                const doForward = async () => {
                    if (!currentUserId || fwdSelected.length === 0 || !forwardMsg) return
                    setFwdSending(true)
                    try {
                        for (const sel of fwdSelected) {
                            await forwardMessage(forwardMsg.id, currentUserId, sel.type, sel.id)
                        }
                        closeFwd()
                    } catch {} finally { setFwdSending(false) }
                }

                const closeFwd = () => { setForwardMsg(null); setFwdSearch(''); setFwdSelected([]); setFwdSending(false) }

                return (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={closeFwd}>
                        <div className="bg-white rounded-2xl shadow-2xl w-[380px] max-h-[500px] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="px-4 py-3 border-b flex items-center gap-3">
                                <Forward className="h-5 w-5 text-indigo-500"/>
                                <p className="text-sm font-bold text-gray-900 flex-1">Forward to...</p>
                                <button onClick={closeFwd} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"><X className="h-4 w-4 text-gray-400"/></button>
                            </div>

                            {/* Message preview */}
                            <div className="px-4 py-2 border-b bg-gradient-to-r from-gray-50 to-white flex items-start gap-2">
                                <div className="w-1 h-full min-h-[28px] bg-indigo-400 rounded-full shrink-0 mt-0.5"/>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-semibold text-indigo-500 mb-0.5">{forwardMsg.userFirstName} {forwardMsg.userLastName}</p>
                                    <p className="text-[11px] text-gray-600 truncate">{forwardMsg.content?.slice(0, 100) || (forwardMsg.fileName ? `📎 ${forwardMsg.fileName}` : '[File]')}</p>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="px-3 py-2 border-b">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400"/>
                                    <input className="w-full pl-8 pr-3 py-2 text-xs bg-gray-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                                        placeholder="Search conversations..." value={fwdSearch} onChange={e => setFwdSearch(e.target.value)} autoFocus/>
                                </div>
                            </div>

                            {/* Selected chips */}
                            {fwdSelected.length > 0 && (
                                <div className="px-3 py-2 border-b flex flex-wrap gap-1.5">
                                    {fwdSelected.map(s => (
                                        <span key={`${s.type}-${s.id}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-semibold">
                                            {s.type === 'group' && <Hash className="h-2.5 w-2.5"/>}
                                            {s.name.length > 15 ? s.name.slice(0, 15) + '...' : s.name}
                                            <button onClick={() => toggleSelect(s)} className="ml-0.5 hover:text-indigo-900"><X className="h-2.5 w-2.5"/></button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Contact list */}
                            <div className="flex-1 overflow-y-auto">
                                {filteredDm.length > 0 && (
                                    <>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">Recent</p>
                                        {filteredDm.map(conv => {
                                            const n = `${conv.firstName} ${conv.lastName}`.trim()
                                            const checked = fwdSelected.some(s => s.type === 'dm' && s.id === conv.userId)
                                            return (
                                                <button key={conv.userId} onClick={() => toggleSelect({type:'dm', id:conv.userId, name:n})}
                                                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${checked ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                                    <Av name={n} size={36}/>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-semibold text-gray-800 truncate">{n}</p>
                                                        <p className="text-[10px] text-gray-400 truncate">{conv.email}</p>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${checked ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                                                        {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </>
                                )}
                                {filteredGroups.length > 0 && (
                                    <>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">Groups</p>
                                        {filteredGroups.map(c => {
                                            const gName = c.acronym || c.name || 'Group'
                                            const checked = fwdSelected.some(s => s.type === 'group' && s.id === c.id)
                                            return (
                                                <button key={c.id} onClick={() => toggleSelect({type:'group', id:c.id, name:gName})}
                                                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${checked ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                                                        <Hash className="h-4 w-4 text-white"/>
                                                    </div>
                                                    <p className="text-xs font-semibold text-gray-800 truncate flex-1">{gName}</p>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${checked ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                                                        {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </>
                                )}
                                {filteredDm.length === 0 && filteredGroups.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                                        <Search className="h-8 w-8 mb-2"/>
                                        <p className="text-xs text-gray-400">No conversations found</p>
                                    </div>
                                )}
                            </div>

                            {/* Send button */}
                            <div className="px-4 py-3 border-t bg-gray-50/80">
                                <button onClick={doForward} disabled={fwdSelected.length === 0 || fwdSending}
                                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold disabled:opacity-40 hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2">
                                    {fwdSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Forward className="h-4 w-4"/>}
                                    {fwdSending ? 'Sending...' : `Send${fwdSelected.length > 0 ? ` to ${fwdSelected.length} conversation${fwdSelected.length > 1 ? 's' : ''}` : ''}`}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}
        </>
    )
}
