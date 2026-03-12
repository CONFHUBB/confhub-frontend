"use client"

import { useState, useEffect } from "react"
import { ReviewQuestionDTO, ReviewQuestionType, ReviewQuestionShowAs, ReviewQuestionChoiceDTO } from "@/types/track"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select } from "antd"
import { X, Plus, Trash2, Loader2, GripVertical } from "lucide-react"

interface ReviewQuestionDialogProps {
    open: boolean
    onClose: () => void
    onSave: (data: ReviewQuestionDTO) => void
    initialData?: ReviewQuestionDTO | null
    isSaving?: boolean
}

const DEFAULT_QUESTION: ReviewQuestionDTO = {
    text: "",
    note: "",
    type: "COMMENT",
    maxLength: 5000,
    showAs: "RADIO",
    isRequired: true,
    lockedForEdit: false,
    visibleToOtherReviewers: false,
    visibleToAuthorsDuringFeedback: false,
    visibleToAuthorsAfterNotification: false,
    visibleToMetaReviewers: false,
    visibleToSeniorMetaReviewers: false,
    choices: [],
}

export function ReviewQuestionDialog({ open, onClose, onSave, initialData, isSaving }: ReviewQuestionDialogProps) {
    const [formData, setFormData] = useState<ReviewQuestionDTO>(DEFAULT_QUESTION)

    useEffect(() => {
        if (open) {
            setFormData(initialData ? { ...DEFAULT_QUESTION, ...initialData, choices: initialData.choices || [] } : { ...DEFAULT_QUESTION })
        }
    }, [open, initialData])

    const handleChange = (field: keyof ReviewQuestionDTO, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleChoiceChange = (index: number, field: keyof ReviewQuestionChoiceDTO, value: any) => {
        setFormData((prev) => {
            const newChoices = [...(prev.choices || [])]
            newChoices[index] = { ...newChoices[index], [field]: value }
            return { ...prev, choices: newChoices }
        })
    }

    const handleAddChoice = () => {
        setFormData((prev) => {
            const newChoices = [...(prev.choices || [])]
            newChoices.push({ text: `Option ${newChoices.length + 1}`, value: newChoices.length + 1 })
            return { ...prev, choices: newChoices }
        })
    }

    const handleRemoveChoice = (index: number) => {
        setFormData((prev) => {
            const newChoices = [...(prev.choices || [])]
            newChoices.splice(index, 1)
            return { ...prev, choices: newChoices }
        })
    }

    const handleSave = () => {
        const payload = { ...formData }
        // Clean up unneeded fields based on type
        if (payload.type !== "COMMENT") payload.maxLength = undefined
        if (payload.type !== "OPTIONS" && payload.type !== "OPTIONS_WITH_VALUE") {
            payload.showAs = undefined
            payload.choices = undefined
        }
        onSave(payload)
    }

    if (!open) return null

    const isOptions = formData.type === "OPTIONS" || formData.type === "OPTIONS_WITH_VALUE"

    const TYPE_OPTIONS = [
        { label: "Comment / Text", value: "COMMENT" },
        { label: "Agreement (Checkbox)", value: "AGREEMENT" },
        { label: "Options (Choice)", value: "OPTIONS" },
        { label: "Options with Score", value: "OPTIONS_WITH_VALUE" },
    ]

    const SHOW_AS_OPTIONS = [
        { label: "Radio Buttons (Single Choice)", value: "RADIO" },
        { label: "Dropdown (Single Choice)", value: "DROPDOWN" },
        { label: "Checkboxes (Multiple Choice)", value: "CHECKBOX" },
        { label: "Listbox (Multiple Choice)", value: "LISTBOX" },
    ]

    const VISIBILITY_SETTINGS = [
        { key: "isRequired", label: "Required", desc: "Reviewer must answer this question" },
        { key: "lockedForEdit", label: "Locked for Edit", desc: "Cannot be modified once submitted" },
        { key: "visibleToOtherReviewers", label: "Visible to other reviewers", desc: "During the discussion phase" },
        { key: "visibleToAuthorsDuringFeedback", label: "Visible to authors (Feedback)", desc: "During author feedback phase" },
        { key: "visibleToAuthorsAfterNotification", label: "Visible to authors (Notification)", desc: "After decisions are sent" },
        { key: "visibleToMetaReviewers", label: "Visible to meta-reviewers", desc: "Can be seen by meta-reviewers" },
        { key: "visibleToSeniorMetaReviewers", label: "Visible to senior meta-reviewers", desc: "Can be seen by senior meta-reviewers" },
    ] as const

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6 overflow-y-auto">
            <div className="bg-background rounded-xl border shadow-2xl w-full max-w-3xl my-auto flex flex-col max-h-full">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b shrink-0">
                    <h2 className="text-xl font-semibold">
                        {initialData ? "Edit Review Question" : "Add Review Question"}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} disabled={isSaving}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-8">
                    
                    {/* Basic Settings */}
                    <div className="space-y-4">
                        <h3 className="text-sm border-b pb-2 font-semibold text-primary">Basic Settings</h3>
                        
                        <div>
                            <label className="text-sm font-semibold mb-1.5 block">Question Text <span className="text-red-500">*</span></label>
                            <Textarea 
                                className="min-h-[80px]" 
                                placeholder="E.g., What are the main contributions of this paper?"
                                value={formData.text}
                                onChange={(e) => handleChange("text", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold mb-1.5 block">Helper Note <span className="text-muted-foreground font-normal">(Optional)</span></label>
                            <Input 
                                placeholder="Instructions or hints for the reviewer"
                                value={formData.note || ""}
                                onChange={(e) => handleChange("note", e.target.value)}
                            />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold mb-1.5 block">Question Type</label>
                                <Select 
                                    className="w-full h-10"
                                    value={formData.type}
                                    onChange={(v) => handleChange("type", v)}
                                    options={TYPE_OPTIONS}
                                />
                            </div>

                            {formData.type === "COMMENT" && (
                                <div>
                                    <label className="text-sm font-semibold mb-1.5 block">Max Length (chars)</label>
                                    <Input 
                                        type="number"
                                        className="h-10"
                                        min={1}
                                        value={formData.maxLength || 5000}
                                        onChange={(e) => handleChange("maxLength", Number(e.target.value))}
                                    />
                                </div>
                            )}

                            {isOptions && (
                                <div>
                                    <label className="text-sm font-semibold mb-1.5 block">Display As</label>
                                    <Select 
                                        className="w-full h-10"
                                        value={formData.showAs}
                                        onChange={(v) => handleChange("showAs", v)}
                                        options={SHOW_AS_OPTIONS}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Choices Configuration */}
                    {isOptions && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-sm font-semibold text-primary">Choices Configuration</h3>
                                <Button variant="outline" size="sm" onClick={handleAddChoice}>
                                    <Plus className="h-4 w-4 mr-1.5" /> Add Choice
                                </Button>
                            </div>
                            
                            {(!formData.choices || formData.choices.length === 0) ? (
                                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">No choices added yet. Click above to add some.</p>
                            ) : (
                                <div className="space-y-3">
                                    {formData.choices.map((choice, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <GripVertical className="h-5 w-5 text-muted-foreground/50 shrink-0 cursor-move" />
                                            <Input 
                                                className="flex-1 h-10"
                                                placeholder={`Choice ${idx + 1}`}
                                                value={choice.text}
                                                onChange={(e) => handleChoiceChange(idx, "text", e.target.value)}
                                            />
                                            {formData.type === "OPTIONS_WITH_VALUE" && (
                                                <Input 
                                                    type="number"
                                                    className="w-24 h-10"
                                                    placeholder="Score"
                                                    value={choice.value ?? ""}
                                                    onChange={(e) => handleChoiceChange(idx, "value", e.target.value !== "" ? Number(e.target.value) : undefined)}
                                                />
                                            )}
                                            <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemoveChoice(idx)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Visibility Settings */}
                    <div className="space-y-4">
                        <h3 className="text-sm border-b pb-2 font-semibold text-primary">Visibility & Requirements</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                            If all visibility checkboxes below are unchecked (except Required/Locked), only Chairs can view the answers to this question.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {VISIBILITY_SETTINGS.map((setting) => (
                                <div key={setting.key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                                    <Switch 
                                        id={setting.key}
                                        checked={!!formData[setting.key as keyof ReviewQuestionDTO]}
                                        onCheckedChange={(val) => handleChange(setting.key as keyof ReviewQuestionDTO, val)}
                                        className="mt-1"
                                    />
                                    <div className="grid gap-0.5 leading-none cursor-pointer" onClick={() => handleChange(setting.key as keyof ReviewQuestionDTO, !formData[setting.key as keyof ReviewQuestionDTO])}>
                                        <label htmlFor={setting.key} className="text-sm font-medium cursor-pointer">{setting.label}</label>
                                        <p className="text-xs text-muted-foreground">{setting.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t flex items-center justify-end gap-3 shrink-0 bg-muted/20">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !formData.text.trim() || (isOptions && formData.choices?.length === 0)}>
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        {initialData ? "Save Changes" : "Create Question"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
