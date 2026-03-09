"use client"

import { useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { Plus, Trash2, GripVertical, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DynamicFieldType, DynamicField, FormDefinition } from "@/types/submission-form"

// Define default fixed fields that cannot be removed
const FIXED_FIELDS = [
    { id: "fixed-title", label: "Title", type: "text", required: true },
    { id: "fixed-abstract", label: "Abstract", type: "textarea", required: true },
    { id: "fixed-keywords", label: "Keywords (Up to 4)", type: "text", required: true }
]

interface FormBuilderProps {
    initialFields?: DynamicField[]
    onSave: (definitionJson: string) => void
    isSaving?: boolean
}

export function FormBuilder({ initialFields = [], onSave, isSaving = false }: FormBuilderProps) {
    const [fields, setFields] = useState<DynamicField[]>(initialFields)

    const addField = () => {
        const newField: DynamicField = {
            id: `field_${Date.now()}`,
            type: DynamicFieldType.TEXT,
            label: "New Field",
            required: false,
        }
        setFields([...fields, newField])
    }

    const removeField = (id: string) => {
        setFields(fields.filter((f) => f.id !== id))
    }

    const updateField = (id: string, updates: Partial<DynamicField>) => {
        setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)))
    }

    const addOption = (fieldId: string) => {
        const field = fields.find((f) => f.id === fieldId)
        if (!field) return

        const newOption = {
            id: `opt_${Date.now()}`,
            value: `Option ${field.options?.length ? field.options.length + 1 : 1}`,
            label: `Option ${field.options?.length ? field.options.length + 1 : 1}`
        }

        updateField(fieldId, {
            options: [...(field.options || []), newOption]
        })
    }

    const updateOption = (fieldId: string, optionId: string, updates: Partial<{ label: string, value: string }>) => {
        const field = fields.find((f) => f.id === fieldId)
        if (!field || !field.options) return

        updateField(fieldId, {
            options: field.options.map((opt) => opt.id === optionId ? { ...opt, ...updates } : opt)
        })
    }

    const removeOption = (fieldId: string, optionId: string) => {
        const field = fields.find((f) => f.id === fieldId)
        if (!field || !field.options) return

        updateField(fieldId, {
            options: field.options.filter((opt) => opt.id !== optionId)
        })
    }

    const handleSave = () => {
        const formDefinition: FormDefinition = { fields }
        const definitionJson = JSON.stringify(formDefinition)
        onSave(definitionJson)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Submission Form Builder</h2>
                    <p className="text-sm text-muted-foreground">
                        Configure the form that authors will fill out when submitting a paper.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Configuration"}
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Form Preview / Editor */}
                <div className="md:col-span-2 space-y-4">
                    <Card className="border-dashed bg-muted/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Standard Fields (Fixed)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {FIXED_FIELDS.map((field) => (
                                <div key={field.id} className="flex items-center gap-3 p-3 rounded-md bg-background border opacity-70">
                                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                                    <div className="flex-1">
                                        <Label className="text-sm font-medium">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                                        <p className="text-xs text-muted-foreground capitalize">{field.type} input</p>
                                    </div>
                                    <Settings className="h-4 w-4 text-muted-foreground/50" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider">
                                Custom Fields ({fields.length})
                            </CardTitle>
                            <Button size="sm" variant="outline" onClick={addField} className="h-8 gap-1">
                                <Plus className="h-3.5 w-3.5" />
                                Add Field
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.length === 0 ? (
                                <div className="text-center py-8 text-sm text-muted-foreground rounded-md border border-dashed">
                                    No custom fields added yet. Click "Add Field" to create forms.
                                </div>
                            ) : (
                                fields.map((field, index) => (
                                    <div key={field.id} className="group relative flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20 hover:border-primary/50">

                                        <div className="flex items-start gap-4">
                                            <div className="mt-2.5 cursor-move opacity-50 transition-opacity group-hover:opacity-100">
                                                <GripVertical className="h-4 w-4" />
                                            </div>

                                            <div className="grid flex-1 gap-4">
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    {/* Field Label */}
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor={`label-${field.id}`} className="text-xs font-semibold text-muted-foreground">Field Label</Label>
                                                        <Input
                                                            id={`label-${field.id}`}
                                                            value={field.label}
                                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                                            placeholder="e.g. Github Repository URL"
                                                            className="h-9"
                                                        />
                                                    </div>

                                                    {/* Field Type */}
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor={`type-${field.id}`} className="text-xs font-semibold text-muted-foreground">Input Type</Label>
                                                        <Select
                                                            value={field.type}
                                                            onValueChange={(val: DynamicFieldType) => {
                                                                updateField(field.id, {
                                                                    type: val,
                                                                    options: val === DynamicFieldType.SELECT ? (field.options || [{ id: `opt_${Date.now()}`, value: "Option 1", label: "Option 1" }]) : undefined
                                                                })
                                                            }}
                                                        >
                                                            <SelectTrigger id={`type-${field.id}`} className="h-9">
                                                                <SelectValue placeholder="Select type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value={DynamicFieldType.TEXT}>Short Text</SelectItem>
                                                                <SelectItem value={DynamicFieldType.TEXTAREA}>Long Text (Textarea)</SelectItem>
                                                                <SelectItem value={DynamicFieldType.CHECKBOX}>Checkbox</SelectItem>
                                                                <SelectItem value={DynamicFieldType.SELECT}>Dropdown Select</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                {/* Options handling for Select type */}
                                                {field.type === DynamicFieldType.SELECT && (
                                                    <div className="rounded-md bg-muted/50 p-3 space-y-3 border">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-xs font-semibold">Dropdown Options</Label>
                                                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => addOption(field.id)}>
                                                                <Plus className="h-3 w-3 mr-1" /> Add Option
                                                            </Button>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {field.options?.map((opt, optIdx) => (
                                                                <div key={opt.id} className="flex items-center gap-2">
                                                                    <Input
                                                                        value={opt.label}
                                                                        onChange={(e) => updateOption(field.id, opt.id, { label: e.target.value, value: e.target.value })}
                                                                        className="h-8 text-sm"
                                                                        placeholder={`Option ${optIdx + 1}`}
                                                                    />
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                                                        onClick={() => removeOption(field.id, opt.id)}
                                                                        disabled={(field.options?.length || 0) <= 1}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`req-${field.id}`}
                                                            checked={field.required}
                                                            onCheckedChange={(checked) => updateField(field.id, { required: !!checked })}
                                                        />
                                                        <Label htmlFor={`req-${field.id}`} className="text-sm font-medium cursor-pointer">
                                                            Required field
                                                        </Label>
                                                    </div>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                                                        onClick={() => removeField(field.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                        {fields.length > 0 && (
                            <CardFooter className="bg-muted/30 border-t px-6 py-4">
                                <Button variant="outline" onClick={addField} className="w-full border-dashed">
                                    <Plus className="h-4 w-4 mr-2" /> Add Another Field
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>

                {/* Cheat Sheet / Instructions Sidebar */}
                <div className="space-y-4 hidden md:block">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-md">How it works</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-4">
                            <p>
                                The <strong>Standard Fields</strong> (Title, Abstract, and Keywords) are required for all papers and cannot be removed.
                            </p>
                            <p>
                                Add <strong>Custom Fields</strong> to collect specific information from authors, such as:
                            </p>
                            <ul className="list-disc pl-4 space-y-2">
                                <li><strong>Short Text:</strong> Links (e.g., Github, Dataset) or short specific answers.</li>
                                <li><strong>Checkbox:</strong> Agreement to track-specific terms or conditions.</li>
                                <li><strong>Dropdown:</strong> Categorization (e.g., "Full Paper" vs "Short Paper").</li>
                            </ul>
                            <p className="text-xs mt-4 pt-4 border-t opacity-70">
                                Data from custom fields will be stored securely and viewable by reviewers.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
