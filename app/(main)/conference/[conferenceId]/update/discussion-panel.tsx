"use client"

import { useEffect, useState } from "react"
import { getDiscussionByPaper, getReplies, createDiscussionPost, deleteDiscussionPost } from "@/app/api/discussion.api"
import { getPapersByConference } from "@/app/api/paper.api"
import type { DiscussionPost } from "@/types/discussion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Loader2, MessageSquare, Send, Trash2, Reply, ChevronDown, ChevronRight } from "lucide-react"
import { Select } from "antd"
import toast from "react-hot-toast"
import { V } from "@/lib/validation"

interface DiscussionPanelProps {
    conferenceId: number
}

interface PaperOption {
    id: number
    title: string
    isDiscussionEnabled?: boolean
}

export function DiscussionPanel({ conferenceId }: DiscussionPanelProps) {
    const [papers, setPapers] = useState<PaperOption[]>([])
    const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null)
    const [posts, setPosts] = useState<DiscussionPost[]>([])
    const [repliesMap, setRepliesMap] = useState<Record<number, DiscussionPost[]>>({})
    const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set())
    const [loading, setLoading] = useState(true)
    const [loadingPosts, setLoadingPosts] = useState(false)

    // New post form
    const [showNewPost, setShowNewPost] = useState(false)
    const [newTitle, setNewTitle] = useState("")
    const [newContent, setNewContent] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Reply form
    const [replyingTo, setReplyingTo] = useState<number | null>(null)
    const [replyContent, setReplyContent] = useState("")

    useEffect(() => {
        const fetchPapers = async () => {
            try {
                setLoading(true)
                const data = await getPapersByConference(conferenceId)
                setPapers(data.map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    isDiscussionEnabled: p.isDiscussionEnabled,
                })))
            } catch (err) {
                console.error("Failed to load papers:", err)
                toast.error("Failed to load papers")
            } finally {
                setLoading(false)
            }
        }
        fetchPapers()
    }, [conferenceId])

    useEffect(() => {
        if (!selectedPaperId) return
        const fetchPosts = async () => {
            try {
                setLoadingPosts(true)
                const data = await getDiscussionByPaper(selectedPaperId)
                setPosts(data)
                setRepliesMap({})
                setExpandedPosts(new Set())
            } catch (err) {
                console.error("Failed to load discussion:", err)
                setPosts([])
            } finally {
                setLoadingPosts(false)
            }
        }
        fetchPosts()
    }, [selectedPaperId])

    const loadReplies = async (postId: number) => {
        if (expandedPosts.has(postId)) {
            setExpandedPosts(prev => { const n = new Set(prev); n.delete(postId); return n })
            return
        }
        try {
            const replies = await getReplies(postId)
            setRepliesMap(prev => ({ ...prev, [postId]: replies }))
            setExpandedPosts(prev => new Set(prev).add(postId))
        } catch (err) {
            console.error("Failed to load replies:", err)
        }
    }

    const handleNewPost = async () => {
        const titleErr = V.maxLen(newTitle, 200)
        if (titleErr) {
            toast.error(`Title: ${titleErr}`)
            return
        }
        if (!selectedPaperId || !newContent.trim()) return
        setIsSubmitting(true)
        try {
            // Get current user from localStorage
            const userStr = localStorage.getItem("user")
            const user = userStr ? JSON.parse(userStr) : null
            const userId = user?.id || user?.userId
            if (!userId) {
                toast.error("User not found. Please login again.")
                return
            }
            await createDiscussionPost({
                paperId: selectedPaperId,
                userId,
                title: newTitle || undefined,
                content: newContent,
                isVisibleToAuthor: false,
                isDiscussionPost: true,
            })
            toast.success("Discussion post created")
            setNewTitle("")
            setNewContent("")
            setShowNewPost(false)
            // Refresh
            const data = await getDiscussionByPaper(selectedPaperId)
            setPosts(data)
        } catch (err: any) {
            console.error("Failed to create post:", err)
            const msg = err?.response?.data?.message || "Failed to create post"
            toast.error(msg)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleReply = async (parentId: number) => {
        if (!selectedPaperId || !replyContent.trim()) return
        setIsSubmitting(true)
        try {
            const userStr = localStorage.getItem("user")
            const user = userStr ? JSON.parse(userStr) : null
            const userId = user?.id || user?.userId
            if (!userId) {
                toast.error("User not found. Please login again.")
                return
            }
            await createDiscussionPost({
                paperId: selectedPaperId,
                userId,
                content: replyContent,
                isVisibleToAuthor: false,
                parentCommentId: parentId,
                isDiscussionPost: true,
            })
            toast.success("Reply posted")
            setReplyContent("")
            setReplyingTo(null)
            // Refresh replies
            const replies = await getReplies(parentId)
            setRepliesMap(prev => ({ ...prev, [parentId]: replies }))
            setExpandedPosts(prev => new Set(prev).add(parentId))
        } catch (err: any) {
            const msg = err?.response?.data?.message || "Failed to post reply"
            toast.error(msg)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await deleteDiscussionPost(id)
            toast.success("Post deleted")
            if (selectedPaperId) {
                const data = await getDiscussionByPaper(selectedPaperId)
                setPosts(data)
            }
        } catch (err) {
            toast.error("Failed to delete post")
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("vi-VN", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Paper Discussion
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage discussion threads for papers (only for papers with discussion enabled).
                </p>
            </div>

            {/* Paper Selector */}
            <div>
                <label className="text-sm font-semibold block mb-2">Select Paper</label>
                <Select
                    className="w-full h-12"
                    placeholder="Select a paper..."
                    showSearch
                    filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    value={selectedPaperId ?? undefined}
                    onChange={(val) => setSelectedPaperId(val)}
                    options={papers.map((p) => ({
                        value: p.id,
                        label: `#${p.id} - ${p.title}`,
                    }))}
                />
            </div>

            {selectedPaperId && (
                <>
                    {/* New Post Button */}
                    <div className="flex items-center justify-between border-b pb-4">
                        <span className="text-sm text-muted-foreground">
                            {posts.length} discussion post(s)
                        </span>
                        <Button onClick={() => setShowNewPost(!showNewPost)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            New Discussion Post
                        </Button>
                    </div>

                    {/* New Post Form */}
                    {showNewPost && (
                        <div className="rounded-lg border p-4 bg-muted/5 space-y-3">
                            <Input
                                placeholder="Discussion topic title (optional)"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="h-10"
                            />
                            <Textarea
                                placeholder="Write your discussion post..."
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                className="min-h-[100px]"
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleNewPost} disabled={isSubmitting || !newContent.trim()}>
                                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    <Send className="h-4 w-4 mr-2" />
                                    Post
                                </Button>
                                <Button variant="outline" onClick={() => setShowNewPost(false)}>Cancel</Button>
                            </div>
                        </div>
                    )}

                    {/* Posts List */}
                    {loadingPosts ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg bg-muted/5">
                            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">No discussion posts yet for this paper.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {posts.map((post) => (
                                <div key={post.id} className="rounded-lg border p-4 space-y-3">
                                    {/* Post Header */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            {post.title && (
                                                <p className="font-semibold text-base">{post.title}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                {post.userFirstName} {post.userLastName}
                                                {post.userEmail && <span className="ml-1">({post.userEmail})</span>}
                                                {" · "}
                                                {formatDate(post.createdAt)}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDelete(post.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Post Content */}
                                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 pt-1 border-t">
                                        <button
                                            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
                                            onClick={() => loadReplies(post.id)}
                                        >
                                            {expandedPosts.has(post.id) ? (
                                                <ChevronDown className="h-3 w-3" />
                                            ) : (
                                                <ChevronRight className="h-3 w-3" />
                                            )}
                                            Replies
                                        </button>
                                        <button
                                            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
                                            onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                                        >
                                            <Reply className="h-3 w-3" />
                                            Reply
                                        </button>
                                    </div>

                                    {/* Reply Form */}
                                    {replyingTo === post.id && (
                                        <div className="flex gap-2 pl-4 border-l-2">
                                            <Textarea
                                                placeholder="Write a reply..."
                                                value={replyContent}
                                                onChange={(e) => setReplyContent(e.target.value)}
                                                className="min-h-[60px] text-sm"
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => handleReply(post.id)}
                                                disabled={isSubmitting || !replyContent.trim()}
                                            >
                                                <Send className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Threaded Replies */}
                                    {expandedPosts.has(post.id) && repliesMap[post.id] && (
                                        <div className="pl-4 border-l-2 space-y-3 mt-2">
                                            {repliesMap[post.id].length === 0 ? (
                                                <p className="text-xs text-muted-foreground">No replies yet.</p>
                                            ) : (
                                                repliesMap[post.id].map((reply) => (
                                                    <div key={reply.id} className="rounded border p-3 bg-muted/10">
                                                        <p className="text-xs text-muted-foreground mb-1">
                                                            {reply.userFirstName} {reply.userLastName}
                                                            {" · "}
                                                            {formatDate(reply.createdAt)}
                                                        </p>
                                                        <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
