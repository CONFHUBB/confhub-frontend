"use client"

import { useState } from "react"
import type { SubjectAreaData } from "@/types/conference-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select as AntdSelect } from "antd"
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from "@/components/ui/field"
import { V, validate as validateField } from "@/lib/validation"
import { FileText, Plus, Trash2, Type, Layers } from "lucide-react"

interface AddSubjectAreaProps {
    initialSubjectAreas: SubjectAreaData[]
    onSubmit: (subjectAreas: SubjectAreaData[]) => void
}

let nextId = -1

export function AddSubjectArea({ initialSubjectAreas, onSubmit }: AddSubjectAreaProps) {
    const [errors, setErrors] = useState<Record<string, string>>({})

    const [subjectAreas, setSubjectAreas] = useState<SubjectAreaData[]>(() => {
        if (initialSubjectAreas && initialSubjectAreas.length > 0) return initialSubjectAreas
        return [{ id: nextId--, name: "", description: "", parentId: null }]
    })

    const addSubjectArea = (parentId: number | null = null) => {
        setSubjectAreas((prev) => [...prev, { id: nextId--, name: "", description: "", parentId }])
    }

    const removeSubjectArea = (id: number) => {
        if (subjectAreas.length <= 1) return
        
        // Remove this item and any of its children
        setSubjectAreas((prev) => prev.filter((sa) => sa.id !== id && sa.parentId !== id))
        
        setErrors((prev) => {
            const next = { ...prev }
            Object.keys(next)
                .filter((k) => k.endsWith(`_${id}`))
                .forEach((k) => delete next[k])
            return next
        })
    }

    const updateSubjectArea = (id: number, field: "name" | "description" | "parentId", value: any) => {
        setSubjectAreas((prev) =>
            prev.map((sa) => (sa.id === id ? { ...sa, [field]: value } : sa))
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
        subjectAreas.forEach((sa) => {
            const nameErr = validateField(sa.name, V.required, (v) => V.maxLen(v, 200))
            if (nameErr) newErrors[`name_${sa.id}`] = nameErr
            
            const descErr = V.maxLen(sa.description, 2000)
            if (descErr) newErrors[`description_${sa.id}`] = descErr
        })
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        onSubmit(subjectAreas)
    }

    // Roots for the dropdown picker
    const rootAreas = subjectAreas.filter(sa => sa.parentId === null)

    return (
        <form onSubmit={handleSubmit}>
            <FieldSet>
                <FieldLegend>Track Subject Areas</FieldLegend>
                <FieldDescription>
                    Add primary and secondary subject areas. You can organize them hierarchically by assigning parent subject areas.
                </FieldDescription>

                <div className="mt-6 space-y-6">
                    {subjectAreas.map((sa, index) => (
                        <div
                            key={sa.id}
                            className={`rounded-lg border p-4 ${sa.parentId !== null ? 'ml-8 bg-muted/5 border-l-4 border-l-primary/40' : ''}`}
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm font-medium flex items-center gap-2">
                                    {sa.parentId !== null ? <Layers className="h-4 w-4 text-primary" /> : null}
                                    {sa.parentId !== null ? "Child Subject Area" : `Subject Area ${index + 1}`}
                                </span>
                                <div className="flex items-center gap-2">
                                    {sa.parentId === null && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addSubjectArea(sa.id)}
                                            className="h-8 text-xs"
                                        >
                                            <Plus className="mr-1 size-3" />
                                            Add Child
                                        </Button>
                                    )}
                                    {subjectAreas.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeSubjectArea(sa.id)}
                                            className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                            aria-label="Remove subject area"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <FieldGroup>
                                {/* Parent Selector (Only if it's already a child, allowing them to switch parents) */}
                                {sa.parentId !== null && (
                                    <Field>
                                        <FieldLabel className="text-base font-semibold">
                                            Parent Subject Area
                                        </FieldLabel>
                                        <AntdSelect
                                            className="w-full h-12"
                                            value={sa.parentId}
                                            onChange={(val) => updateSubjectArea(sa.id, "parentId", val)}
                                            options={rootAreas.filter(root => root.id !== sa.id).map(root => ({
                                                label: root.name || "Unnamed Area",
                                                value: root.id
                                            }))}
                                        />
                                        <FieldDescription>
                                            Which top-level subject area this belongs to.
                                        </FieldDescription>
                                    </Field>
                                )}

                                {/* Name */}
                                <Field
                                    data-invalid={
                                        !!errors[`name_${sa.id}`] || undefined
                                    }
                                >
                                    <FieldLabel className="text-base font-semibold">
                                        <Type className="size-4" />
                                        Name
                                    </FieldLabel>
                                    <Input
                                        className="h-12 text-base"
                                        placeholder="e.g. Machine Learning"
                                        value={sa.name}
                                        onChange={(e) =>
                                            updateSubjectArea(sa.id, "name", e.target.value)
                                        }
                                        aria-invalid={!!errors[`name_${sa.id}`]}
                                    />
                                    <FieldDescription>
                                        The name of this subject area.
                                    </FieldDescription>
                                    {errors[`name_${sa.id}`] && (
                                        <FieldError>
                                            {errors[`name_${sa.id}`]}
                                        </FieldError>
                                    )}
                                </Field>

                                {/* Description */}
                                <Field data-invalid={!!errors[`description_${sa.id}`] || undefined}>
                                    <FieldLabel className="text-base font-semibold">
                                        <FileText className="size-4" />
                                        Description
                                    </FieldLabel>
                                    <Textarea
                                        className="min-h-[100px] text-base"
                                        placeholder="Describe the scope..."
                                        rows={3}
                                        value={sa.description}
                                        onChange={(e) =>
                                            updateSubjectArea(
                                                sa.id,
                                                "description",
                                                e.target.value
                                            )
                                        }
                                    />
                                    <FieldDescription>
                                        A brief description of what this covers.
                                    </FieldDescription>
                                    {errors[`description_${sa.id}`] && (
                                        <FieldError>
                                            {errors[`description_${sa.id}`]}
                                        </FieldError>
                                    )}
                                </Field>
                            </FieldGroup>
                        </div>
                    ))}
                </div>

                {/* Add another root root area */}
                <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => addSubjectArea(null)}
                >
                    <Plus className="mr-2 size-4" />
                    Add Another Root Subject Area
                </Button>
            </FieldSet>

            <div className="mt-8 flex items-center justify-end gap-4">
                <Button type="submit" size="lg" className="px-8 text-base">
                    Save Subject Areas
                </Button>
            </div>
        </form>
    )
}
