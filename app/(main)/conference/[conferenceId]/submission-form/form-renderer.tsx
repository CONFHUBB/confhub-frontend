"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState } from "react"
import { DynamicField, DynamicFieldType, FormDefinition } from "@/types/submission-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, X } from "lucide-react"

export interface FormRendererProps {
    definitionJson: string
    onSubmit: (fixedData: any, extraAnswersJson: string) => void
    isSubmitting?: boolean
}

const generateSchema = (fields: DynamicField[]) => {
    const schemaShape: Record<string, any> = {
        title: z.string().min(1, { message: "Title is required" }).max(150, { message: "Maximum 150 characters" }),
        abstractField: z.string().min(1, { message: "Abstract is required" }).refine((val) => {
            const wordCount = val.trim().split(/\s+/).filter(w => w.length > 0).length
            return wordCount >= 20 && wordCount <= 250
        }, { message: "Abstract must be between 20 and 250 words" }),
    }

    fields.forEach((field) => {
        if (field.type === DynamicFieldType.CHECKBOX) {
            if (field.required) {
                schemaShape[field.id] = z.boolean().refine((val) => val === true, {
                    message: "This field is required",
                })
            } else {
                schemaShape[field.id] = z.boolean().optional()
            }
        } else {
            let fieldSchema = z.string()
            if (field.required) {
                fieldSchema = fieldSchema.min(1, { message: "This field is required" })
            } else {
                fieldSchema = fieldSchema.optional() as any
            }
            schemaShape[field.id] = fieldSchema
        }
    })

    return z.object(schemaShape)
}

export function FormRenderer({ definitionJson, onSubmit, isSubmitting = false }: FormRendererProps) {
    const [keywords, setKeywords] = useState<string[]>([])
    const [keywordInput, setKeywordInput] = useState("")
    const [keywordError, setKeywordError] = useState("")

    let fields: DynamicField[] = []

    try {
        if (definitionJson) {
            const parsed = JSON.parse(definitionJson) as FormDefinition
            fields = parsed.fields || []
        }
    } catch (err) {
        console.error("Failed to parse form definition:", err)
    }

    const schema = generateSchema(fields)
    type FormData = z.infer<typeof schema>

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: "",
            abstractField: "",
            ...fields.reduce((acc, field) => {
                acc[field.id] = field.type === DynamicFieldType.CHECKBOX ? false : ""
                return acc
            }, {} as any)
        }
    })

    const { formState: { errors } } = form

    const addKeyword = () => {
        const trimmed = keywordInput.trim()
        if (!trimmed) return
        if (keywords.includes(trimmed)) {
            setKeywordError("This keyword already exists")
            return
        }
        if (keywords.length >= 4) {
            setKeywordError("Maximum 4 keywords allowed")
            return
        }
        setKeywords((prev) => [...prev, trimmed])
        setKeywordInput("")
        setKeywordError("")
    }

    const removeKeyword = (index: number) => {
        setKeywords((prev) => prev.filter((_, i) => i !== index))
    }

    const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault()
            addKeyword()
        }
    }

    const handleSubmit = (data: FormData) => {
        if (keywords.length === 0) {
            setKeywordError("At least one keyword is required")
            return
        }
        if (keywords.length > 4) {
            setKeywordError("Maximum 4 keywords allowed")
            return
        }
        setKeywordError("")

        const fixedData = {
            title: data.title,
            abstractField: data.abstractField,
            keywords,
        }

        const extraAnswers: Record<string, any> = {}
        fields.forEach((field) => {
            extraAnswers[field.id] = data[field.id]
        })

        onSubmit(fixedData, JSON.stringify(extraAnswers))
    }

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                <Input id="title" {...form.register("title")} placeholder="Title of paper (up to 150 characters)" />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message as string}</p>}
            </div>

            {/* Abstract */}
            <div className="space-y-2">
                <Label htmlFor="abstractField">Abstract <span className="text-destructive">*</span></Label>
                <Textarea
                    id="abstractField"
                    {...form.register("abstractField")}
                    placeholder="Paper abstract (between 20 and 250 words)"
                    className="min-h-[150px]"
                />
                {errors.abstractField && <p className="text-sm text-destructive">{errors.abstractField.message as string}</p>}
            </div>

            {/* Keywords — Tag Input */}
            <div className="space-y-3">
                <Label>Keywords <span className="text-destructive">*</span></Label>
                {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {keywords.map((kw, i) => (
                            <Badge key={i} variant="secondary" className="text-sm gap-1 pl-3 pr-1.5 py-1">
                                {kw}
                                <button
                                    type="button"
                                    onClick={() => removeKeyword(i)}
                                    className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
                <div className="flex gap-2">
                    <Input
                        value={keywordInput}
                        onChange={(e) => { setKeywordInput(e.target.value); setKeywordError("") }}
                        onKeyDown={handleKeywordKeyDown}
                        placeholder="Type a keyword and press Enter"
                        className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={addKeyword} className="shrink-0">
                        Add
                    </Button>
                </div>
                {keywordError && <p className="text-sm text-destructive">{keywordError}</p>}
                <p className="text-xs text-muted-foreground">Press Enter or click Add to add each keyword.</p>
            </div>

            {/* Dynamic Fields - rendered linearly after fixed fields */}
            {fields.map((field) => (
                <div key={field.id} className="space-y-2">
                    {field.type === DynamicFieldType.TEXT && (
                        <>
                            <Label htmlFor={field.id}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                            <Input id={field.id} {...form.register(field.id)} placeholder={`Enter ${field.label.toLowerCase()}`} />
                        </>
                    )}

                    {field.type === DynamicFieldType.TEXTAREA && (
                        <>
                            <Label htmlFor={field.id}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                            <Textarea id={field.id} {...form.register(field.id)} placeholder={`Enter ${field.label.toLowerCase()}`} className="min-h-[100px]" />
                        </>
                    )}

                    {field.type === DynamicFieldType.CHECKBOX && (
                        <div className="flex items-center space-x-2 pt-2">
                            <Controller
                                name={field.id}
                                control={form.control}
                                render={({ field: { value, onChange } }: any) => (
                                    <Checkbox
                                        id={field.id}
                                        checked={!!value}
                                        onCheckedChange={onChange}
                                    />
                                )}
                            />
                            <Label htmlFor={field.id} className="cursor-pointer text-sm font-medium leading-none">
                                {field.label} {field.required && <span className="text-destructive">*</span>}
                            </Label>
                        </div>
                    )}

                    {field.type === DynamicFieldType.SELECT && (
                        <>
                            <Label htmlFor={field.id}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                            <Controller
                                name={field.id}
                                control={form.control}
                                render={({ field: { value, onChange } }: any) => (
                                    <Select value={value as string} onValueChange={onChange}>
                                        <SelectTrigger id={field.id}>
                                            <SelectValue placeholder="Select an option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {field.options?.map((opt) => (
                                                <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </>
                    )}

                    {errors[field.id] && <p className="text-sm text-destructive">{errors[field.id]?.message as string}</p>}
                </div>
            ))}

            {/* Submit */}
            <div className="flex justify-end pt-4">
                <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2">
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Registering Paper..." : "Register Paper"}
                </Button>
            </div>
        </form>
    )
}
