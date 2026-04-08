"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical, Settings, Lock, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
    QuestionType,
    DynamicField,
    FixedFields,
    FormDefinition,
    DEFAULT_FIXED_FIELDS,
    QuestionChoice,
} from "@/types/submission-form"
import { Textarea } from "@/components/ui/textarea"

// ─── Fixed field definitions ──────────────────────────────────────────────────
const FIXED_FIELD_META = [
    {
        id: "title",
        label: "Paper Title",
        description: "Single-line text, max 150 characters",
        alwaysRequired: true,
    },
    {
        id: "abstract",
        label: "Abstract",
        description: "Plain text, 20–250 words",
        alwaysRequired: true,
    },
    {
        id: "keywords",
        label: "Keywords",
        description: "Comma-separated tags; author adds one at a time",
        alwaysRequired: false,
        configurable: true, // can toggle required + set maxCount
    },
    {
        id: "subjectAreas",
        label: "Subject Areas",
        description: "Primary + secondary, from conference-defined list",
        alwaysRequired: true,
    },
] as const

// ─── Props ────────────────────────────────────────────────────────────────────
interface FormBuilderProps {
    initialDefinition?: FormDefinition
    onSave: (definitionJson: string) => void
    isSaving?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FormBuilder({ initialDefinition, onSave, isSaving = false }: FormBuilderProps) {
    const [fixedFields, setFixedFields] = useState<FixedFields>(
        initialDefinition?.fixedFields ?? DEFAULT_FIXED_FIELDS
    )
    const [fields, setFields] = useState<DynamicField[]>(initialDefinition?.fields ?? [])

    // ── Fixed field helpers ──
    const updateFixed = (key: keyof FixedFields, patch: Partial<FixedFields[typeof key]>) => {
        setFixedFields(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
    }

    // ── Custom question helpers ──
    const addQuestion = () => {
        const newQ: DynamicField = {
            id: `q_${Date.now()}`,
            type: QuestionType.COMMENT,
            title: "New Question",
            label: "",
            required: false,
            visibleToReviewers: true,
            displayOrder: fields.length + 1,
        }
        setFields(prev => [...prev, newQ])
    }

    const removeQuestion = (id: string) => setFields(prev => prev.filter(f => f.id !== id))

    const updateQuestion = (id: string, patch: Partial<DynamicField>) =>
        setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))

    const addChoice = (qId: string) => {
        const q = fields.find(f => f.id === qId)
        if (!q) return
        const newChoice: QuestionChoice = {
            id: `ch_${Date.now()}`,
            label: `Choice ${(q.choices?.length ?? 0) + 1}`,
        }
        updateQuestion(qId, { choices: [...(q.choices ?? []), newChoice] })
    }

    const updateChoice = (qId: string, choiceId: string, patch: Partial<QuestionChoice>) => {
        const q = fields.find(f => f.id === qId)
        if (!q) return
        updateQuestion(qId, {
            choices: q.choices?.map(c => c.id === choiceId ? { ...c, ...patch } : c)
        })
    }

    const removeChoice = (qId: string, choiceId: string) => {
        const q = fields.find(f => f.id === qId)
        if (!q) return
        updateQuestion(qId, { choices: q.choices?.filter(c => c.id !== choiceId) })
    }

    // ── Save ──
    const handleSave = () => {
        const def: FormDefinition = { fixedFields, fields }
        onSave(JSON.stringify(def))
    }

    const isChoiceType = (t: QuestionType) =>
        t === QuestionType.OPTIONS || t === QuestionType.OPTIONS_WITH_VALUE

    return (
        <div className="space-y-6">
            <div className="flex justify-end mb-4">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Configuration"}
                </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-4">

                    {/* ── Fixed Fields ── */}
                    <Card className="border-dashed bg-muted/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Lock className="h-3.5 w-3.5" />
                                Standard Fields (Fixed)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {FIXED_FIELD_META.map(meta => {
                                const cfg = fixedFields[meta.id as keyof FixedFields]
                                return (
                                    <div key={meta.id} className="flex items-start gap-3 p-3 rounded-md bg-background border">
                                        <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-1 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-sm">{meta.label}</span>
                                                {cfg.required && (
                                                    <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">
                                                        Required
                                                    </Badge>
                                                )}
                                                {meta.alwaysRequired && (
                                                    <Badge variant="secondary" className="text-[10px]">Always on</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>

                                            {/* Keywords configurable options */}
                                            {'configurable' in meta && meta.configurable && (
                                                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <Switch
                                                            checked={cfg.required}
                                                            onCheckedChange={v => updateFixed("keywords", { required: v })}
                                                        />
                                                        <span>Required</span>
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-muted-foreground shrink-0">Min:</span>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={fixedFields.keywords.maxCount ?? 10}
                                                            value={fixedFields.keywords.minCount ?? 1}
                                                            onChange={e => updateFixed("keywords", { minCount: +e.target.value })}
                                                            className="h-7 w-16 text-xs"
                                                        />
                                                        <span className="text-muted-foreground shrink-0">Max:</span>
                                                        <Input
                                                            type="number"
                                                            min={fixedFields.keywords.minCount ?? 1}
                                                            max={20}
                                                            value={fixedFields.keywords.maxCount ?? 10}
                                                            onChange={e => updateFixed("keywords", { maxCount: +e.target.value })}
                                                            className="h-7 w-16 text-xs"
                                                        />
                                                        <span className="text-muted-foreground">keywords</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <Settings className="h-4 w-4 text-muted-foreground/30 mt-1 shrink-0" />
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>

                    {/* ── Custom Questions ── */}
                    <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider">
                                Custom Questions ({fields.length})
                            </CardTitle>
                            <Button size="sm" variant="outline" onClick={addQuestion} className="h-8 gap-1">
                                <Plus className="h-3.5 w-3.5" />
                                Add Question
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.length === 0 ? (
                                <div className="text-center py-8 text-sm text-muted-foreground rounded-md border border-dashed">
                                    No custom questions yet. Click <strong>Add Question</strong> to get started.
                                </div>
                            ) : (
                                fields.map((q, idx) => (
                                    <div
                                        key={q.id}
                                        className="group relative flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm hover:border-primary/50 transition-colors"
                                    >
                                        {/* Row: index + type selector */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">
                                                Q{idx + 1}
                                            </span>
                                            <div className="flex-1 grid sm:grid-cols-2 gap-3">
                                                {/* Title (short name) */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Question Title</Label>
                                                    <Input
                                                        value={q.title}
                                                        onChange={e => updateQuestion(q.id, { title: e.target.value })}
                                                        placeholder="e.g. Student paper?"
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                {/* Type */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Type</Label>
                                                    <Select
                                                        value={q.type}
                                                        onValueChange={v => updateQuestion(q.id, {
                                                            type: v as QuestionType,
                                                            choices: isChoiceType(v as QuestionType)
                                                                ? (q.choices?.length ? q.choices : [
                                                                    { id: `ch_${Date.now()}`, label: "Option 1" },
                                                                    { id: `ch_${Date.now() + 1}`, label: "Option 2" },
                                                                ])
                                                                : undefined,
                                                        })}
                                                    >
                                                        <SelectTrigger className="h-8 text-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value={QuestionType.COMMENT}>💬 Comment (Text)</SelectItem>
                                                            <SelectItem value={QuestionType.AGREEMENT}>☑ Agreement (Checkbox)</SelectItem>
                                                            <SelectItem value={QuestionType.OPTIONS}>🔘 Options (Radio/Dropdown)</SelectItem>
                                                            <SelectItem value={QuestionType.OPTIONS_WITH_VALUE}>🔢 Options with Value</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Question body text */}
                                        <div className="space-y-1 pl-8">
                                            <Label className="text-xs text-muted-foreground">Question text shown to author</Label>
                                            <Textarea
                                                value={q.label}
                                                onChange={e => updateQuestion(q.id, { label: e.target.value })}
                                                placeholder="e.g. Is the primary author a registered student?"
                                                className="min-h-[60px] text-sm resize-none"
                                            />
                                        </div>

                                        {/* COMMENT: maxLength */}
                                        {q.type === QuestionType.COMMENT && (
                                            <div className="pl-8 flex items-center gap-2 text-xs">
                                                <span className="text-muted-foreground">Max length:</span>
                                                <Input
                                                    type="number"
                                                    min={50}
                                                    max={5000}
                                                    value={q.maxLength ?? 500}
                                                    onChange={e => updateQuestion(q.id, { maxLength: +e.target.value })}
                                                    className="h-7 w-20"
                                                />
                                                <span className="text-muted-foreground">characters</span>
                                            </div>
                                        )}

                                        {/* OPTIONS / OPTIONS_WITH_VALUE: choices */}
                                        {isChoiceType(q.type) && (
                                            <div className="pl-8 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs text-muted-foreground">Choices</Label>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 px-2 text-xs"
                                                        onClick={() => addChoice(q.id)}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" /> Add Choice
                                                    </Button>
                                                </div>
                                                {q.choices?.map((choice, ci) => (
                                                    <div key={choice.id} className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground w-4">{ci + 1}.</span>
                                                        <Input
                                                            value={choice.label}
                                                            onChange={e => updateChoice(q.id, choice.id, { label: e.target.value })}
                                                            placeholder={`Choice ${ci + 1}`}
                                                            className="h-7 text-sm flex-1"
                                                        />
                                                        {q.type === QuestionType.OPTIONS_WITH_VALUE && (
                                                            <Input
                                                                type="number"
                                                                value={choice.numericValue ?? ""}
                                                                onChange={e => updateChoice(q.id, choice.id, {
                                                                    numericValue: e.target.value ? +e.target.value : null
                                                                })}
                                                                placeholder="Value"
                                                                className="h-7 w-16 text-sm"
                                                            />
                                                        )}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                                            onClick={() => removeChoice(q.id, choice.id)}
                                                            disabled={(q.choices?.length ?? 0) <= 1}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Footer: Required + Visibility + Delete */}
                                        <div className="pl-8 flex items-center justify-between gap-4 pt-1 border-t border-dashed mt-1">
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                                                    <Checkbox
                                                        checked={q.required}
                                                        onCheckedChange={v => updateQuestion(q.id, { required: !!v })}
                                                    />
                                                    Required
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                                                    {q.visibleToReviewers ? (
                                                        <Eye className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <EyeOff className="h-3.5 w-3.5" />
                                                    )}
                                                    <Checkbox
                                                        checked={!!q.visibleToReviewers}
                                                        onCheckedChange={v => updateQuestion(q.id, { visibleToReviewers: !!v })}
                                                    />
                                                    Visible to reviewers
                                                </label>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
                                                onClick={() => removeQuestion(q.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                        {fields.length > 0 && (
                            <CardFooter className="bg-muted/30 border-t px-6 py-4">
                                <Button variant="outline" onClick={addQuestion} className="w-full border-dashed">
                                    <Plus className="h-4 w-4 mr-2" /> Add Another Question
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-4 hidden md:block">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-md">Question Types</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <div>
                                <p className="font-medium text-foreground">💬 Comment</p>
                                <p className="text-xs">Free-text textarea. Set a max character limit.</p>
                            </div>
                            <div>
                                <p className="font-medium text-foreground">☑ Agreement</p>
                                <p className="text-xs">Author checks a box to agree (e.g., ethical declaration).</p>
                            </div>
                            <div>
                                <p className="font-medium text-foreground">🔘 Options</p>
                                <p className="text-xs">Radio / multi-choice / dropdown. Good for categories.</p>
                            </div>
                            <div>
                                <p className="font-medium text-foreground">🔢 Options with Value</p>
                                <p className="text-xs">Each choice has a numeric score — aids chair decision-making.</p>
                            </div>
                            <div className="pt-3 border-t text-xs">
                                <span className="font-medium text-foreground">Visible to reviewers</span> — uncheck to make the answer private (Chair-only).
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
