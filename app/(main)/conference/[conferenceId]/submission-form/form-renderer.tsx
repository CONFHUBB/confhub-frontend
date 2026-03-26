"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState } from "react"
import {
    DynamicField,
    FormDefinition,
    QuestionType,
    DEFAULT_FIXED_FIELDS,
} from "@/types/submission-form"
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

// ─── Schema generation ────────────────────────────────────────────────────────
const generateSchema = (fields: DynamicField[]) => {
    const shape: Record<string, any> = {
        title: z.string().min(1, { message: "Title is required" }).max(150, { message: "Maximum 150 characters" }),
        abstractField: z.string().min(1, { message: "Abstract is required" }).refine((val) => {
            const wordCount = val.trim().split(/\s+/).filter(w => w.length > 0).length
            return wordCount >= 20 && wordCount <= 250
        }, { message: "Abstract must be between 20 and 250 words" }),
    }

    fields.forEach((field) => {
        const isChoice = field.type === QuestionType.OPTIONS || field.type === QuestionType.OPTIONS_WITH_VALUE
        switch (field.type) {
            case QuestionType.AGREEMENT:
            case QuestionType.CHECKBOX:
                shape[field.id] = field.required
                    ? z.boolean().refine(v => v === true, { message: "This field is required" })
                    : z.boolean().optional()
                break
            case QuestionType.COMMENT:
            case QuestionType.TEXT:
            case QuestionType.TEXTAREA:
                shape[field.id] = field.required
                    ? z.string().min(1, { message: "This field is required" })
                          .max(field.maxLength ?? 5000, { message: `Maximum ${field.maxLength ?? 5000} characters` })
                    : z.string().optional()
                break
            case QuestionType.OPTIONS:
            case QuestionType.OPTIONS_WITH_VALUE:
            case QuestionType.SELECT:
            default:
                shape[field.id] = field.required
                    ? z.string().min(1, { message: "Please select an option" })
                    : z.string().optional()
        }
    })
    return z.object(shape)
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FormRenderer({ definitionJson, onSubmit, isSubmitting = false }: FormRendererProps) {
    const [keywords, setKeywords] = useState<string[]>([])
    const [keywordInput, setKeywordInput] = useState("")
    const [keywordError, setKeywordError] = useState("")

    // Parse form definition
    let formDef: FormDefinition = { fields: [] }
    try {
        if (definitionJson) formDef = JSON.parse(definitionJson) as FormDefinition
    } catch {
        // fallback to empty
    }

    const fields = formDef.fields ?? []
    const fixed = formDef.fixedFields ?? DEFAULT_FIXED_FIELDS
    const kwMin = fixed.keywords.minCount ?? 1
    const kwMax = fixed.keywords.maxCount ?? 10
    const kwRequired = fixed.keywords.required

    // Build schema + form
    const schema = generateSchema(fields)
    type FormData = z.infer<typeof schema>

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: "",
            abstractField: "",
            ...fields.reduce((acc, f) => {
                acc[f.id] = (f.type === QuestionType.AGREEMENT || f.type === QuestionType.CHECKBOX)
                    ? false : ""
                return acc
            }, {} as any),
        }
    })

    const { formState: { errors } } = form

    // ── Keywords helpers ──
    const addKeyword = () => {
        const trimmed = keywordInput.trim()
        if (!trimmed) return
        if (keywords.includes(trimmed)) { setKeywordError("This keyword already exists"); return }
        if (keywords.length >= kwMax) { setKeywordError(`Maximum ${kwMax} keywords allowed`); return }
        setKeywords(p => [...p, trimmed])
        setKeywordInput("")
        setKeywordError("")
    }

    const removeKeyword = (i: number) => setKeywords(p => p.filter((_, idx) => idx !== i))

    const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") { e.preventDefault(); addKeyword() }
    }

    // ── Submit ──
    const handleSubmit = (data: FormData) => {
        if (kwRequired && keywords.length === 0) {
            setKeywordError("At least one keyword is required")
            return
        }
        if (keywords.length < kwMin) {
            setKeywordError(`Minimum ${kwMin} keyword${kwMin > 1 ? 's' : ''} required`)
            return
        }
        if (keywords.length > kwMax) {
            setKeywordError(`Maximum ${kwMax} keywords allowed`)
            return
        }
        setKeywordError("")

        const fixedData = {
            title: data.title,
            abstractField: data.abstractField,
            keywords,
        }

        const extraAnswers: Record<string, any> = {}
        fields.forEach(f => { extraAnswers[f.id] = (data as any)[f.id] })

        onSubmit(fixedData, JSON.stringify(extraAnswers))
    }

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

            {/* ── Title ── */}
            <div className="space-y-2">
                <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                <Input id="title" {...form.register("title")} placeholder="Title of paper (up to 150 characters)" />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message as string}</p>}
            </div>

            {/* ── Abstract ── */}
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

            {/* ── Keywords — Tag Input ── */}
            <div className="space-y-3">
                <Label>
                    Keywords{" "}
                    {kwRequired && <span className="text-destructive">*</span>}
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                        {kwMin > 0 ? `${kwMin}–` : "Up to "}{kwMax}
                    </span>
                </Label>
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
                        onChange={e => { setKeywordInput(e.target.value); setKeywordError("") }}
                        onKeyDown={handleKeywordKeyDown}
                        placeholder="Type a keyword and press Enter"
                        className="flex-1"
                        disabled={keywords.length >= kwMax}
                    />
                    <Button type="button" variant="outline" onClick={addKeyword} className="shrink-0" disabled={keywords.length >= kwMax}>
                        Add
                    </Button>
                </div>
                {keywordError && <p className="text-sm text-destructive">{keywordError}</p>}
                <p className="text-xs text-muted-foreground">
                    {keywords.length}/{kwMax} keywords added. Press Enter or click Add.
                </p>
            </div>

            {/* ── Custom questions ── */}
            {fields.map(field => (
                <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>
                        {field.title || field.label}
                        {field.required && <span className="text-destructive"> *</span>}
                    </Label>
                    {field.label && field.title && field.label !== field.title && (
                        <p className="text-sm text-muted-foreground -mt-1">{field.label}</p>
                    )}

                    {/* COMMENT / TEXT / TEXTAREA */}
                    {(field.type === QuestionType.COMMENT || field.type === QuestionType.TEXT) && (
                        <Input
                            id={field.id}
                            {...form.register(field.id)}
                            placeholder={`Enter ${(field.title || field.label).toLowerCase()}`}
                        />
                    )}
                    {field.type === QuestionType.TEXTAREA && (
                        <Textarea
                            id={field.id}
                            {...form.register(field.id)}
                            placeholder={`Enter ${(field.title || field.label).toLowerCase()}`}
                            className="min-h-[100px]"
                            maxLength={field.maxLength}
                        />
                    )}

                    {/* AGREEMENT / CHECKBOX */}
                    {(field.type === QuestionType.AGREEMENT || field.type === QuestionType.CHECKBOX) && (
                        <div className="flex items-center space-x-2 pt-1">
                            <Controller
                                name={field.id}
                                control={form.control}
                                render={({ field: { value, onChange } }: any) => (
                                    <Checkbox id={field.id} checked={!!value} onCheckedChange={onChange} />
                                )}
                            />
                            <Label htmlFor={field.id} className="cursor-pointer text-sm font-normal leading-snug">
                                {field.label || "I agree"}
                            </Label>
                        </div>
                    )}

                    {/* OPTIONS / OPTIONS_WITH_VALUE / SELECT */}
                    {(field.type === QuestionType.OPTIONS ||
                      field.type === QuestionType.OPTIONS_WITH_VALUE ||
                      field.type === QuestionType.SELECT) && (
                        <Controller
                            name={field.id}
                            control={form.control}
                            render={({ field: { value, onChange } }: any) => (
                                <Select value={value as string} onValueChange={onChange}>
                                    <SelectTrigger id={field.id}>
                                        <SelectValue placeholder="Select an option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* Render from choices (new) or options (legacy) */}
                                        {(field.choices ?? field.options ?? []).map((opt: any) => (
                                            <SelectItem key={opt.id} value={opt.id}>
                                                {opt.label}
                                                {opt.numericValue != null && (
                                                    <span className="ml-2 text-muted-foreground text-xs">({opt.numericValue})</span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    )}

                    {errors[field.id] && (
                        <p className="text-sm text-destructive">{errors[field.id]?.message as string}</p>
                    )}
                </div>
            ))}

            {/* ── Submit ── */}
            <div className="flex justify-end pt-4">
                <Button type="submit" size="lg" disabled={isSubmitting} className="gap-2">
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Registering Paper..." : "Register Paper"}
                </Button>
            </div>
        </form>
    )
}
