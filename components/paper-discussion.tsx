'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { getDiscussionByPaper, createDiscussionPost, deleteDiscussionPost } from '@/app/api/discussion.api'
import type { DiscussionPost, DiscussionPostRequest } from '@/types/discussion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, MessageSquare, Send, Reply, Trash2, ChevronDown, ChevronRight, User2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { V } from '@/lib/validation'

interface PaperDiscussionProps {
    paperId: number
    currentUserId: number
    isChair?: boolean
    /** If true, user names are anonymized (Reviewer 1, 2, ...) */
    anonymize?: boolean
    /** If false, the post/reply forms are disabled with an explanation */
    discussionEnabled?: boolean
    className?: string
}

export function PaperDiscussion({ paperId, currentUserId, isChair = false, anonymize = true, discussionEnabled = true, className = '' }: PaperDiscussionProps) {
    const [posts, setPosts] = useState<DiscussionPost[]>([])
    const [loading, setLoading] = useState(true)
    const [newContent, setNewContent] = useState('')
    const [newTitle, setNewTitle] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [replyingTo, setReplyingTo] = useState<number | null>(null)
    const [replyContent, setReplyContent] = useState('')
    const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set())

    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true)
            const data = await getDiscussionByPaper(paperId)
            setPosts(data)
        } catch (err) {
            console.error('Failed to load discussion:', err)
        } finally {
            setLoading(false)
        }
    }, [paperId])

    useEffect(() => {
        fetchPosts()
    }, [fetchPosts])

    // Build anonymized name map
    const nameMap = React.useMemo(() => {
        const map = new Map<number, string>()
        const uniqueUserIds = [...new Set(posts.map(p => p.userId))]
        let reviewerNum = 1
        uniqueUserIds.forEach(uid => {
            if (uid === currentUserId) {
                map.set(uid, 'You')
            } else if (anonymize && !isChair) {
                map.set(uid, `Reviewer ${reviewerNum++}`)
            } else {
                const post = posts.find(p => p.userId === uid)
                map.set(uid, post ? `${post.userFirstName || ''} ${post.userLastName || ''}`.trim() || post.userEmail || `User #${uid}` : `User #${uid}`)
            }
        })
        return map
    }, [posts, currentUserId, anonymize, isChair])

    // Separate top-level posts and replies
    const topLevelPosts = posts.filter(p => !p.parentCommentId)
    const getReplies = (parentId: number) => posts.filter(p => p.parentCommentId === parentId)

    const handlePost = async () => {
        const titleErr = V.maxLen(newTitle, 200)
        if (titleErr) {
            toast.error(`Title: ${titleErr}`)
            return
        }
        if (!newContent.trim()) return
        setSubmitting(true)
        try {
            const dto: DiscussionPostRequest = {
                paperId,
                userId: currentUserId,
                title: newTitle.trim() || undefined,
                content: newContent.trim(),
                isVisibleToAuthor: false,
                isDiscussionPost: true,
            }
            await createDiscussionPost(dto)
            setNewContent('')
            setNewTitle('')
            toast.success('Comment posted')
            await fetchPosts()
        } catch (err: any) {
            const detail = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to post comment'
            toast.error(detail)
        } finally {
            setSubmitting(false)
        }
    }

    const handleReply = async (parentId: number) => {
        if (!replyContent.trim()) return
        setSubmitting(true)
        try {
            const dto: DiscussionPostRequest = {
                paperId,
                userId: currentUserId,
                content: replyContent.trim(),
                isVisibleToAuthor: false,
                parentCommentId: parentId,
                isDiscussionPost: true,
            }
            await createDiscussionPost(dto)
            setReplyContent('')
            setReplyingTo(null)
            toast.success('Reply posted')
            await fetchPosts()
        } catch (err: any) {
            const detail = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to post reply'
            toast.error(detail)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this?')) return
        try {
            await deleteDiscussionPost(id)
            toast.success('Deleted')
            fetchPosts()
        } catch {
            toast.error('Delete failed')
        }
    }

    const toggleReplies = (postId: number) => {
        setExpandedReplies(prev => {
            const next = new Set(prev)
            if (next.has(postId)) next.delete(postId)
            else next.add(postId)
            return next
        })
    }

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 1) return 'just now'
        if (diffMins < 60) return `${diffMins}m ago`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h ago`
        const diffDays = Math.floor(diffHours / 24)
        if (diffDays < 7) return `${diffDays}d ago`
        return d.toLocaleDateString('en-US')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Post composer or disabled banner */}
            {!discussionEnabled ? (
                <Card className="border-amber-200 bg-amber-50/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-amber-800">Discussion is not enabled for this paper</p>
                            <p className="text-xs text-amber-600 mt-0.5">The conference chair has not opened the discussion phase yet. You can still read existing comments below.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-indigo-200">
                    <CardContent className="p-4 space-y-3">
                        <input
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            placeholder="Title (optional)"
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                        />
                        <textarea
                            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[80px] resize-y"
                            placeholder="Write a discussion comment about this paper..."
                            value={newContent}
                            onChange={e => setNewContent(e.target.value)}
                        />
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground">
                                💬 Discussion is only visible to Reviewers and Chairs
                            </p>
                            <Button size="sm" onClick={handlePost} disabled={submitting || !newContent.trim()} className="gap-1.5">
                                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                Post
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Posts list */}
            {topLevelPosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No discussions yet. Start the conversation!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {topLevelPosts.map(post => {
                        const replies = getReplies(post.id)
                        const isExpanded = expandedReplies.has(post.id)
                        const displayName = nameMap.get(post.userId) || `User #${post.userId}`
                        const isOwnPost = post.userId === currentUserId

                        return (
                            <Card key={post.id} className={`${isOwnPost ? 'border-l-4 border-l-indigo-400' : ''}`}>
                                <CardContent className="p-4">
                                    {/* Post header */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                                isOwnPost ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                <User2 className="h-3.5 w-3.5" />
                                            </div>
                                            <div>
                                                <span className={`text-sm font-semibold ${isOwnPost ? 'text-indigo-700' : 'text-gray-800'}`}>
                                                    {displayName}
                                                </span>
                                                {isChair && (
                                                    <Badge className="ml-2 text-[9px] px-1 py-0 bg-amber-100 text-amber-700">Chair</Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-muted-foreground">{formatDate(post.createdAt)}</span>
                                            {isOwnPost && (
                                                <button onClick={() => handleDelete(post.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Post title */}
                                    {post.title && (
                                        <p className="font-semibold text-sm mb-1">{post.title}</p>
                                    )}

                                    {/* Post content */}
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 mt-3 pt-2 border-t">
                                        {discussionEnabled && (
                                            <button
                                                onClick={() => { setReplyingTo(replyingTo === post.id ? null : post.id); setReplyContent('') }}
                                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                                            >
                                                <Reply className="h-3.5 w-3.5" />
                                                Reply
                                            </button>
                                        )}
                                        {replies.length > 0 && (
                                            <button
                                                onClick={() => toggleReplies(post.id)}
                                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                            >
                                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Reply input */}
                                    {replyingTo === post.id && (
                                        <div className="mt-3 flex gap-2">
                                            <input
                                                className="flex-1 px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                placeholder="Write a reply..."
                                                value={replyContent}
                                                onChange={e => setReplyContent(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(post.id) } }}
                                                autoFocus
                                            />
                                            <Button size="sm" onClick={() => handleReply(post.id)} disabled={submitting || !replyContent.trim()} className="gap-1">
                                                <Send className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Replies thread */}
                                    {isExpanded && replies.length > 0 && (
                                        <div className="mt-3 ml-4 pl-4 border-l-2 border-indigo-100 space-y-3">
                                            {replies.map(reply => {
                                                const replyName = nameMap.get(reply.userId) || `User #${reply.userId}`
                                                const isOwnReply = reply.userId === currentUserId
                                                return (
                                                    <div key={reply.id} className="py-2">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`text-xs font-semibold ${isOwnReply ? 'text-indigo-600' : 'text-gray-700'}`}>
                                                                    {replyName}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">· {formatDate(reply.createdAt)}</span>
                                                            </div>
                                                            {isOwnReply && (
                                                                <button onClick={() => handleDelete(reply.id)} className="text-red-400 hover:text-red-600">
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
