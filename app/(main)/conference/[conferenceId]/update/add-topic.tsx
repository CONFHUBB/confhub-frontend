"use client"

import { useState } from "react"
import type { TopicData } from "@/types/conference-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from "@/components/ui/field"
import { ArrowLeft, FileText, Plus, Trash2, Type } from "lucide-react"

interface AddTopicProps {
    initialTopics: TopicData[]
    onSubmit: (topics: TopicData[]) => void
}

let nextId = -1

export function AddTopic({ initialTopics, onSubmit }: AddTopicProps) {
    const [errors, setErrors] = useState<Record<string, string>>({})

    const [topics, setTopics] = useState<TopicData[]>(() => {
        if (initialTopics && initialTopics.length > 0) return initialTopics
        return [{ id: nextId--, title: "", description: "" }]
    })

    const addTopic = () => {
        setTopics((prev) => [...prev, { id: nextId--, title: "", description: "" }])
    }

    const removeTopic = (id: number) => {
        if (topics.length <= 1) return
        setTopics((prev) => prev.filter((t) => t.id !== id))
        setErrors((prev) => {
            const next = { ...prev }
            Object.keys(next)
                .filter((k) => k.endsWith(`_${id}`))
                .forEach((k) => delete next[k])
            return next
        })
    }

    const updateTopic = (id: number, field: "title" | "description", value: string) => {
        setTopics((prev) =>
            prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
        )
        const errorKey = `${field}_${id}`
        if (errors[errorKey]) {
            setErrors((prev) => {
                const next = { ...prev }
                delete next[errorKey]
                return next
            })
        }
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}
        topics.forEach((t) => {
            if (!t.title.trim())
                newErrors[`title_${t.id}`] = "Topic title is required."
        })
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        onSubmit(topics)
    }

    return (
        <form onSubmit={handleSubmit}>
            <FieldSet>
                <FieldLegend>Track Topics</FieldLegend>
                <FieldDescription>
                    Add topics for this track. Each track can have multiple topics.
                </FieldDescription>

                <div className="mt-6 space-y-6">
                    {topics.map((topic, index) => (
                        <div
                            key={topic.id}
                            className="rounded-lg border p-4"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm font-medium">
                                    Topic {index + 1}
                                </span>
                                {topics.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeTopic(topic.id)}
                                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                )}
                            </div>

                            <FieldGroup>
                                {/* Title */}
                                <Field
                                    data-invalid={
                                        !!errors[`title_${topic.id}`] || undefined
                                    }
                                >
                                    <FieldLabel className="text-base font-semibold">
                                        <Type className="size-4" />
                                        Title
                                    </FieldLabel>
                                    <Input
                                        className="h-12 text-base"
                                        placeholder="e.g. Machine Learning"
                                        value={topic.title}
                                        onChange={(e) =>
                                            updateTopic(topic.id, "title", e.target.value)
                                        }
                                        aria-invalid={!!errors[`title_${topic.id}`]}
                                    />
                                    <FieldDescription>
                                        The title of this topic.
                                    </FieldDescription>
                                    {errors[`title_${topic.id}`] && (
                                        <FieldError>
                                            {errors[`title_${topic.id}`]}
                                        </FieldError>
                                    )}
                                </Field>

                                {/* Description */}
                                <Field>
                                    <FieldLabel className="text-base font-semibold">
                                        <FileText className="size-4" />
                                        Description
                                    </FieldLabel>
                                    <Textarea
                                        className="min-h-[100px] text-base"
                                        placeholder="Describe the topic scope..."
                                        rows={3}
                                        value={topic.description}
                                        onChange={(e) =>
                                            updateTopic(
                                                topic.id,
                                                "description",
                                                e.target.value
                                            )
                                        }
                                    />
                                    <FieldDescription>
                                        A brief description of what this topic covers.
                                    </FieldDescription>
                                </Field>
                            </FieldGroup>
                        </div>
                    ))}
                </div>

                {/* Add another topic */}
                <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={addTopic}
                >
                    <Plus className="mr-2 size-4" />
                    Add Another Topic
                </Button>
            </FieldSet>

            <div className="mt-8 flex items-center justify-end gap-4">
                <Button type="submit" size="lg" className="px-8 text-base">
                    Save Topics
                </Button>
            </div>
        </form>
    )
}
