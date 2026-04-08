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
import { Loader2, X, Sparkles, PenLine, AlertCircle, CheckCircle2, Target } from "lucide-react"
import { suggestKeywords, checkWriting, checkTrackFit, type WritingSuggestion } from "@/app/api/ai-assistant.api"
import { toast } from 'sonner'

export interface FormRendererProps {
    definitionJson: string
    onSubmit: (fixedData: any, extraAnswersJson: string) => void
    isSubmitting?: boolean
    trackId?: number
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
export function FormRenderer({ definitionJson, onSubmit, isSubmitting = false, trackId }: FormRendererProps) {
    const [keywords, setKeywords] = useState<string[]>([])
    const [keywordInput, setKeywordInput] = useState("")
    const [keywordError, setKeywordError] = useState("")
    const [suggestingKeywords, setSuggestingKeywords] = useState(false)
    const [checkingWriting, setCheckingWriting] = useState(false)
    const [writingSuggestions, setWritingSuggestions] = useState<WritingSuggestion[]>([])
    const [writingAssessment, setWritingAssessment] = useState("") 
    
    const [checkingTrackFit, setCheckingTrackFit] = useState(false)
    const [trackFitResult, setTrackFitResult] = useState<{ matchScore: number, explanation: string, suggestedTrack: string | null } | null>(null)

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

    // ── AI: Suggest Keywords ──
    const handleSuggestKeywords = async () => {
        const abstractText = form.getValues("abstractField") as string
        if (!abstractText || abstractText.trim().length < 50) {
            toast.error("Please write at least 50 characters in the abstract first")
            return
        }
        setSuggestingKeywords(true)
        try {
            const result = await suggestKeywords({ abstractText: abstractText.trim() })
            if (result.keywords && result.keywords.length > 0) {
                const newKeywords = result.keywords.filter(kw => !keywords.includes(kw))
                const addable = newKeywords.slice(0, kwMax - keywords.length)
                setKeywords(prev => [...prev, ...addable])
                toast.success(`Added ${addable.length} AI-suggested keywords`)
            } else {
                toast.error("AI could not extract keywords. Try rephrasing your abstract.")
            }
        } catch {
            toast.error("Failed to suggest keywords. Please try again.")
        } finally {
            setSuggestingKeywords(false)
        }
    }

    // ── AI: Check Academic Writing ──
    const handleCheckWriting = async () => {
        const abstractText = form.getValues("abstractField") as string
        const title = form.getValues("title") as string
        if (!abstractText || abstractText.trim().length < 50) {
            toast.error("Please write at least 50 characters in the abstract first")
            return
        }
        setCheckingWriting(true)
        setWritingSuggestions([])
        setWritingAssessment("")
        try {
            const result = await checkWriting({ title: title?.trim(), abstractText: abstractText.trim() })
            setWritingSuggestions(result.suggestions || [])
            setWritingAssessment(result.overallAssessment || "")
            if (result.suggestions.length === 0) {
                toast.success("Your writing looks great! No issues found.")
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to check writing. Please try again.")
        } finally {
            setCheckingWriting(false)
        }
    }

    // ── AI: Check Track Fit ──
    const handleCheckTrackFit = async () => {
        if (!trackId) {
            toast.error("Track ID not available")
            return
        }
        const abstractText = form.getValues("abstractField") as string
        if (!abstractText || abstractText.trim().length < 50) {
            toast.error("Please write at least 50 characters in the abstract first")
            return
        }
        
        setCheckingTrackFit(true)
        setTrackFitResult(null)
        try {
            const result = await checkTrackFit({ 
                trackId, 
                abstractText: abstractText.trim(),
                keywords: keywords.join(', ')
            })
            setTrackFitResult(result)
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to check track fit. Please try again.")
        } finally {
            setCheckingTrackFit(false)
        }
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
                
                {/* AI Tools */}
                <div className="flex gap-2 pt-1 flex-wrap">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCheckWriting}
                        disabled={checkingWriting}
                        className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                        {checkingWriting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
                        {checkingWriting ? "Analyzing Writing..." : "✨ Check Academic Writing"}
                    </Button>
                    
                    {trackId && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCheckTrackFit}
                            disabled={checkingTrackFit}
                            className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                            {checkingTrackFit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
                            {checkingTrackFit ? "Matching..." : "🎯 AI Track Matcher"}
                        </Button>
                    )}
                </div>

                {/* Track Fit Result Panel */}
                {trackFitResult && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3 mt-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                                <Target className="h-4 w-4" />
                                Track Fit Analysis
                            </div>
                            <Badge variant={trackFitResult.matchScore >= 70 ? "default" : trackFitResult.matchScore >= 40 ? "secondary" : "destructive"}>
                                Match Score: {trackFitResult.matchScore}%
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-700 bg-white p-3 rounded border">{trackFitResult.explanation}</p>
                        {trackFitResult.suggestedTrack && (
                            <div className="flex items-center gap-2 p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                <span>Suggested better track: <strong>{trackFitResult.suggestedTrack}</strong></span>
                            </div>
                        )}
                    </div>
                )}
                {/* Writing Suggestions Panel */}
                {writingSuggestions.length > 0 && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-indigo-700 font-medium text-sm">
                                <PenLine className="h-4 w-4" />
                                Writing Suggestions ({writingSuggestions.length})
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-medium"
                                onClick={() => {
                                    let currentAbstract = form.getValues("abstractField") as string
                                    let applied = 0
                                    writingSuggestions.forEach(s => {
                                        if (currentAbstract.includes(s.original)) {
                                            currentAbstract = currentAbstract.replace(s.original, s.suggested)
                                            applied++
                                        }
                                    })
                                    if (applied > 0) {
                                        form.setValue("abstractField", currentAbstract, { shouldDirty: true, shouldValidate: true })
                                        setWritingSuggestions([])
                                        setWritingAssessment("")
                                        toast.success(`Applied ${applied} fix${applied > 1 ? 'es' : ''} to your abstract`)
                                    } else {
                                        toast.info("No matching text found. The fixes may have been applied already.")
                                    }
                                }}
                            >
                                <CheckCircle2 className="h-3 w-3" />
                                Apply All Fixes
                            </Button>
                        </div>
                        {writingSuggestions.map((s, i) => (
                            <div key={i} className="p-3 bg-white rounded-lg border space-y-2 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={`text-[10px] ${
                                            s.type === 'SPELLING' ? 'text-orange-600 border-orange-200 bg-orange-50' :
                                            s.type === 'GRAMMAR' ? 'text-red-600 border-red-200 bg-red-50' :
                                            s.type === 'TONE' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                                            'text-blue-600 border-blue-200 bg-blue-50'
                                        }`}>{s.type}</Badge>
                                        <span className="text-xs text-gray-500">{s.reason}</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[10px] gap-1 px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 shrink-0"
                                        onClick={() => {
                                            const currentAbstract = form.getValues("abstractField") as string
                                            if (currentAbstract.includes(s.original)) {
                                                form.setValue("abstractField", currentAbstract.replace(s.original, s.suggested), { shouldDirty: true, shouldValidate: true })
                                                setWritingSuggestions(prev => prev.filter((_, idx) => idx !== i))
                                                toast.success("Fix applied!")
                                            } else {
                                                toast.info("Text not found — it may have been changed already.")
                                                setWritingSuggestions(prev => prev.filter((_, idx) => idx !== i))
                                            }
                                        }}
                                    >
                                        <CheckCircle2 className="h-3 w-3" />
                                        Apply
                                    </Button>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="line-through text-red-500">{s.original}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-emerald-700 font-medium">{s.suggested}</span>
                                </div>
                            </div>
                        ))}
                        {writingAssessment && (
                            <p className="text-xs text-indigo-600 italic pt-1">📝 {writingAssessment}</p>
                        )}
                    </div>
                )}
                {writingSuggestions.length === 0 && writingAssessment && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        {writingAssessment}
                    </div>
                )}
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
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleSuggestKeywords}
                        disabled={suggestingKeywords || keywords.length >= kwMax}
                        className="shrink-0 gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                    >
                        {suggestingKeywords ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {suggestingKeywords ? "Suggesting..." : "AI Suggest"}
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
