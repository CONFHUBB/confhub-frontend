"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    MessageSquare, Send, X, Loader2, Sparkles,
    ChevronDown, ArrowRight, FileText, Bot, User as UserIcon, RotateCcw
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import { toast } from 'sonner'
import {
    sendChatMessage, analyzeManuscript, getChatHistory,
    type AIChatResponse, type ManuscriptAnalysisResponse,
    type ActionSuggestion, type ChatHistoryItem
} from "@/app/api/ai.api"

interface ChatMsg {
    role: "user" | "model"
    content: string
    intent?: string
    actions?: ActionSuggestion[]
    analysis?: ManuscriptAnalysisResponse
}

function generateSessionId(): string {
    return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8)
}

export function AIChatWidget() {
    const router = useRouter()
    const params = useParams()
    const conferenceId = params?.conferenceId ? Number(params.conferenceId) : undefined

    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMsg[]>([])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [sessionId, setSessionId] = useState(() => generateSessionId())
    const [historyLoaded, setHistoryLoaded] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 200)
        }
    }, [isOpen])

    // Load history
    useEffect(() => {
        if (isOpen && !historyLoaded) {
            loadHistory()
        }
    }, [isOpen, historyLoaded])

    const loadHistory = async () => {
        try {
            const history = await getChatHistory(sessionId)
            if (history.length > 0) {
                setMessages(history.map(h => ({
                    role: h.role,
                    content: h.content,
                    intent: h.intent,
                })))
            }
        } catch { /* no history */ }
        setHistoryLoaded(true)
    }

    const handleSend = async () => {
        const msg = input.trim()
        if (!msg || loading) return

        setInput("")
        setMessages(prev => [...prev, { role: "user", content: msg }])
        setLoading(true)

        try {
            const response = await sendChatMessage({
                message: msg,
                conferenceId,
                sessionId,
            })
            setMessages(prev => [...prev, {
                role: "model",
                content: response.reply,
                intent: response.intent,
                actions: response.suggestedActions,
            }])
        } catch (err: any) {
            const errMsg = err?.response?.data?.message || err?.response?.data?.detail || "Failed to get AI response"
            toast.error(errMsg)
            setMessages(prev => [...prev, {
                role: "model",
                content: "⚠️ " + errMsg,
            }])
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            toast.error("Only PDF files are accepted")
            return
        }

        setMessages(prev => [...prev, { role: "user", content: `📎 Uploaded: ${file.name}` }])
        setLoading(true)

        try {
            const response = await analyzeManuscript(file, sessionId)
            setMessages(prev => [...prev, {
                role: "model",
                content: `📄 **Manuscript Analysis Complete**\n\n**Summary:** ${response.summary}\n\n**Research Area:** ${response.detectedArea}\n\n**Keywords:** ${response.detectedKeywords.join(", ")}`,
                intent: "ANALYZE",
                analysis: response,
            }])
        } catch (err: any) {
            const errMsg = err?.response?.data?.message || "Failed to analyze manuscript"
            toast.error(errMsg)
            setMessages(prev => [...prev, { role: "model", content: "⚠️ " + errMsg }])
        } finally {
            setLoading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const handleActionClick = (action: ActionSuggestion) => {
        if (action.action === "NAVIGATE") {
            router.push(action.value)
        } else if (action.action === "CHAT") {
            setInput(action.value)
        } else if (action.action === "UPLOAD") {
            fileInputRef.current?.click()
        }
    }

    const handleNewSession = () => {
        setSessionId(generateSessionId())
        setMessages([])
        setHistoryLoaded(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
                    isOpen
                        ? "bg-gray-700 hover:bg-gray-800 rotate-0"
                        : "bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-110"
                }`}
                title={isOpen ? "Close Chat" : "ConfHub AI Assistant"}
            >
                {isOpen ? (
                    <X className="h-5 w-5 text-white" />
                ) : (
                    <Sparkles className="h-5 w-5 text-white" />
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-[640px] h-[720px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-sm">ConfHub AI</h3>
                                <p className="text-white/70 text-[11px]">Powered by Gemini</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleNewSession}
                                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                                title="New conversation"
                            >
                                <RotateCcw className="h-4 w-4 text-white/80" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                            >
                                <ChevronDown className="h-4 w-4 text-white/80" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/50">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                                    <Sparkles className="h-7 w-7 text-indigo-600" />
                                </div>
                                <h4 className="font-semibold text-gray-800 mb-1">Hi! I'm ConfHub AI</h4>
                                <p className="text-xs text-gray-500 mb-6">
                                    I can help with conference workflows, submission guidance, and manuscript analysis.
                                </p>
                                {/* Quick start buttons */}
                                <div className="space-y-2 w-full">
                                    {(conferenceId 
                                        ? [
                                            { label: "📋 What should I do next in this conference?", msg: "Based on my role and current phase of this conference, what should I do next?" },
                                            { label: "📄 Analyze my manuscript", msg: "__UPLOAD__" },
                                            { label: "❓ How does the review process work?", msg: "Explain the review process step by step" },
                                        ]
                                        : [
                                            { label: "📋 Summary of my upcoming tasks", msg: "Across all my tracked conferences, what are my pending roles and next steps?" },
                                            { label: "📄 Find a conference for my manuscript", msg: "__UPLOAD__" },
                                            { label: "❓ Recommend open conferences", msg: "List all currently open conferences that are accepting submissions" },
                                        ]
                                    ).map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                if (q.msg === "__UPLOAD__") {
                                                    fileInputRef.current?.click()
                                                } else {
                                                    setInput(q.msg)
                                                    setTimeout(() => handleSend(), 100)
                                                }
                                            }}
                                            className="w-full text-left px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 text-sm text-gray-700 transition-colors"
                                        >
                                            {q.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i}>
                                <div className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    {msg.role === "model" && (
                                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                                            <Bot className="h-3.5 w-3.5 text-indigo-600" />
                                        </div>
                                    )}
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                                        msg.role === "user"
                                            ? "bg-indigo-600 text-white rounded-br-md"
                                            : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                                    }`}>
                                        {msg.role === "model" ? (
                                            <div className="prose prose-sm prose-gray max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:text-xs [&_pre]:text-xs [&_pre]:bg-gray-50 [&_pre]:rounded-lg">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        )}
                                    </div>
                                    {msg.role === "user" && (
                                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                                            <UserIcon className="h-3.5 w-3.5 text-gray-600" />
                                        </div>
                                    )}
                                </div>

                                {/* Suggested actions */}
                                {msg.actions && msg.actions.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2 ml-9">
                                        {msg.actions.map((action, j) => (
                                            <button
                                                key={j}
                                                onClick={() => handleActionClick(action)}
                                                className="text-[11px] px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                                            >
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Conference recommendations */}
                                {msg.analysis && msg.analysis.recommendations.length > 0 && (
                                    <div className="mt-3 ml-9 space-y-2">
                                        <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                                            <FileText className="h-3 w-3" /> Recommended Conferences
                                        </p>
                                        {msg.analysis.recommendations.map((rec, j) => (
                                            <div key={j} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:border-indigo-200 transition-colors">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-sm text-gray-900 truncate">
                                                            {rec.conferenceName}
                                                            {rec.acronym && <span className="text-gray-400 font-normal ml-1">({rec.acronym})</span>}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rec.matchReason}</p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <div className={`text-lg font-bold ${
                                                            rec.matchScore >= 0.7 ? "text-emerald-600" :
                                                            rec.matchScore >= 0.4 ? "text-amber-600" : "text-gray-500"
                                                        }`}>
                                                            {Math.round(rec.matchScore * 100)}%
                                                        </div>
                                                        <p className="text-[10px] text-gray-400">match</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        {rec.matchingTracks.map((t, k) => (
                                                            <Badge key={k} variant="outline" className="text-[10px] py-0">{t}</Badge>
                                                        ))}
                                                        <span className="text-[10px] text-gray-400">
                                                            Deadline: {rec.deadline}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        className="h-6 text-[10px] gap-0.5 bg-indigo-600 hover:bg-indigo-700"
                                                        onClick={() => router.push(`/conference/${rec.conferenceId}`)}
                                                    >
                                                        Submit <ArrowRight className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {loading && (
                            <div className="flex gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                    <Bot className="h-3.5 w-3.5 text-indigo-600" />
                                </div>
                                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input bar */}
                    <div className="px-4 py-3 border-t bg-white shrink-0 space-y-2">
                        {/* Analyze PDF button - clearly labeled */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100/70 text-indigo-600 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Upload PDF Manuscript for AI Analysis
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        {/* Message input */}
                        <div className="flex items-center gap-2">
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask ConfHub AI..."
                                className="flex-1 h-9 text-sm border-gray-200 focus-visible:ring-indigo-500"
                                disabled={loading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
