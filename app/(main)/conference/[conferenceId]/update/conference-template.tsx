"use client"

import { useState } from "react"
import type { TemplateData } from "@/types/conference-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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
import { ArrowLeft, Copy, FileText, Info, Mail, Plus, Trash2, Type } from "lucide-react"
import toast from "react-hot-toast"
import { Textarea } from "@/components/ui/textarea"

interface ConferenceTemplateProps {
    initialTemplates: TemplateData[]
    onSubmit: (templates: TemplateData[]) => void
}

const TEMPLATE_VARIABLES = [
    { variable: "{{conferenceName}}", description: "Conference name" },
    { variable: "{{conferenceAcronym}}", description: "Conference acronym" },
    { variable: "{{location}}", description: "Conference location" },
    { variable: "{{startDate}}", description: "Conference start date" },
    { variable: "{{endDate}}", description: "Conference end date" },
    { variable: "{{websiteUrl}}", description: "Conference website URL" },
    { variable: "{{roleName}}", description: "Assigned role name" },
    { variable: "{{recipientEmail}}", description: "Recipient email address" },
]

let nextId = 1

export function ConferenceTemplate({ initialTemplates, onSubmit }: ConferenceTemplateProps) {
    const [errors, setErrors] = useState<Record<string, string>>({})

    const [templates, setTemplates] = useState<TemplateData[]>(() => {
        if (initialTemplates.length > 0) return initialTemplates
        return [{ id: nextId++, templateType: "", subject: "", body: "", isDefault: false }]
    })

    const copyVariable = (variable: string) => {
        navigator.clipboard.writeText(variable)
        toast.success(`Copied ${variable}`)
    }

    const addTemplate = () => {
        setTemplates((prev) => [
            ...prev,
            { id: nextId++, templateType: "", subject: "", body: "", isDefault: false },
        ])
    }

    const removeTemplate = (id: number) => {
        if (templates.length <= 1) return
        setTemplates((prev) => prev.filter((t) => t.id !== id))
        setErrors((prev) => {
            const next = { ...prev }
            Object.keys(next)
                .filter((k) => k.endsWith(`_${id}`))
                .forEach((k) => delete next[k])
            return next
        })
    }

    const updateTemplate = (
        id: number,
        field: keyof Omit<TemplateData, "id">,
        value: string | boolean
    ) => {
        setTemplates((prev) =>
            prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
        )
        const errorKey = `${String(field)}_${id}`
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
        templates.forEach((t) => {
            const typeErr = validateField(t.templateType, V.required, (v) => V.maxLen(v, 50))
            if (typeErr) newErrors[`templateType_${t.id}`] = typeErr

            const subjErr = validateField(t.subject, V.required, (v) => V.maxLen(v, 200))
            if (subjErr) newErrors[`subject_${t.id}`] = subjErr

            const bodyErr = validateField(t.body, V.required, (v) => V.maxLen(v, 5000))
            if (bodyErr) newErrors[`body_${t.id}`] = bodyErr
        })
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        onSubmit(templates)
    }

    const [activePreviewIndex, setActivePreviewIndex] = useState(0)
    const activeTemplate = templates[activePreviewIndex] || templates[0]

    const previewData = {
        conferenceName: "Tech Summit 2023",
        conferenceAcronym: "TS-23",
        location: "Convention Center",
        startDate: "Oct 25, 2023",
        endDate: "Oct 27, 2023",
        websiteUrl: "https://example.com/ts23",
        roleName: "Speaker",
        recipientEmail: "john.doe@example.com"
    }

    const replaceVariables = (text: string) => {
        if (!text) return ""
        let result = text
        Object.entries(previewData).forEach(([key, value]) => {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
        })
        return result
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            <form onSubmit={handleSubmit} className="flex flex-col min-w-0">
                {/* Template Variables Reference */}
                <div className="mb-8 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-indigo-800 dark:text-indigo-300">
                        <Info className="size-4" />
                        Available Template Variables
                    </div>
                    <p className="mb-3 text-xs text-indigo-700 dark:text-indigo-400">
                        Use these variables in the Subject and Body fields. They will be replaced with actual values when sending emails.
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                        {TEMPLATE_VARIABLES.map((v) => (
                            <button
                                key={v.variable}
                                type="button"
                                onClick={() => copyVariable(v.variable)}
                                className="group flex items-center justify-between rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs transition-colors hover:bg-indigo-100 dark:border-blue-700 dark:bg-blue-900/40 dark:hover:bg-blue-800/60"
                            >
                                <span>
                                    <code className="mr-2 font-mono font-semibold text-indigo-700 dark:text-indigo-300">
                                        {v.variable}
                                    </code>
                                    <span className="text-muted-foreground">{v.description}</span>
                                </span>
                                <Copy className="size-3 text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                        ))}
                    </div>
                </div>

                <FieldSet>
                    <FieldLegend>Conference Templates</FieldLegend>
                    <FieldDescription>
                        Configure email templates for your conference notifications. Use the variables above in Subject and Body fields.
                    </FieldDescription>

                    <div className="mt-6 space-y-6">
                        {templates.map((template, index) => (
                            <div
                                key={template.id}
                                className="rounded-lg border p-4"
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        Template {index + 1}
                                    </span>
                                    {templates.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                removeTemplate(template.id)
                                            }
                                            className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>

                                <FieldGroup>
                                    {/* Template Type */}
                                    <Field
                                        data-invalid={
                                            !!errors[`templateType_${template.id}`] ||
                                            undefined
                                        }
                                    >
                                        <FieldLabel>
                                            <Type className="size-4" />
                                            Template Type
                                        </FieldLabel>
                                        <Input
                                            placeholder="e.g. INVITATION, ACCEPTANCE, REJECTION, REMINDER"
                                            value={template.templateType}
                                            onChange={(e) =>
                                                updateTemplate(
                                                    template.id,
                                                    "templateType",
                                                    e.target.value
                                                )
                                            }
                                            aria-invalid={
                                                !!errors[`templateType_${template.id}`]
                                            }
                                        />
                                        <FieldDescription>
                                            The type/category of this template. Use &quot;INVITATION&quot; for role invitation emails.
                                        </FieldDescription>
                                        {errors[`templateType_${template.id}`] && (
                                            <FieldError>
                                                {errors[`templateType_${template.id}`]}
                                            </FieldError>
                                        )}
                                    </Field>

                                    {/* Subject */}
                                    <Field
                                        data-invalid={
                                            !!errors[`subject_${template.id}`] ||
                                            undefined
                                        }
                                    >
                                        <FieldLabel>
                                            <Mail className="size-4" />
                                            Subject
                                        </FieldLabel>
                                        <Input
                                            placeholder="e.g. Invitation: You are invited as {{roleName}} for {{conferenceName}}"
                                            value={template.subject}
                                            onFocus={() => setActivePreviewIndex(index)}
                                            onChange={(e) => {
                                                setActivePreviewIndex(index)
                                                updateTemplate(
                                                    template.id,
                                                    "subject",
                                                    e.target.value
                                                )
                                            }}
                                            aria-invalid={
                                                !!errors[`subject_${template.id}`]
                                            }
                                        />
                                        <FieldDescription>
                                            The email subject line. You can use template variables.
                                        </FieldDescription>
                                        {errors[`subject_${template.id}`] && (
                                            <FieldError>
                                                {errors[`subject_${template.id}`]}
                                            </FieldError>
                                        )}
                                    </Field>

                                    {/* Body */}
                                    <Field
                                        data-invalid={
                                            !!errors[`body_${template.id}`] ||
                                            undefined
                                        }
                                    >
                                        <FieldLabel>
                                            <FileText className="size-4" />
                                            Body
                                        </FieldLabel>

                                        <div className={`mt-1 rounded-md border ${errors[`body_${template.id}`] ? "border-destructive focus-within:ring-destructive" : ""}`}>
                                            <Textarea
                                                className="min-h-[200px]"
                                                placeholder="Write your email body here..."
                                                value={template.body}
                                                onFocus={() => setActivePreviewIndex(index)}
                                                onChange={(e) => {
                                                    setActivePreviewIndex(index)
                                                    updateTemplate(template.id, "body", e.target.value)
                                                }}
                                                aria-invalid={!!errors[`body_${template.id}`]}
                                            />
                                        </div>

                                        <FieldDescription>
                                            The email body content. You can use template variables within the editor text.
                                        </FieldDescription>
                                        {errors[`body_${template.id}`] && (
                                            <FieldError>
                                                {errors[`body_${template.id}`]}
                                            </FieldError>
                                        )}
                                    </Field>

                                    {/* Is Default */}
                                    <Field>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <FieldLabel className="mb-0">
                                                    Default Template
                                                </FieldLabel>
                                                <FieldDescription>
                                                    Use this as the default template for its type.
                                                </FieldDescription>
                                            </div>
                                            <Switch
                                                checked={template.isDefault}
                                                onCheckedChange={(checked: boolean) =>
                                                    updateTemplate(
                                                        template.id,
                                                        "isDefault",
                                                        checked
                                                    )
                                                }
                                            />
                                        </div>
                                    </Field>
                                </FieldGroup>
                            </div>
                        ))}
                    </div>

                    {/* Add another button */}
                    <Button
                        type="button"
                        variant="outline"
                        className="mt-4 w-full"
                        onClick={addTemplate}
                    >
                        <Plus className="mr-2 size-4" />
                        Add Another Template
                    </Button>
                </FieldSet>

                <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t py-4 -mx-8 px-8 md:-mx-12 md:px-12 flex items-center justify-end gap-4">
                    <Button type="submit">
                        Save Templates
                    </Button>
                </div>
            </form>

            {/* Email Preview Pane */}
            <div className="hidden xl:block sticky top-8 rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="border-b bg-indigo-50/50 px-5 py-4 dark:bg-indigo-950/20">
                    <h3 className="text-base flex items-center gap-2 font-semibold text-indigo-800 dark:text-indigo-300">
                        <Mail className="size-4" />
                        Email Preview (Live)
                    </h3>
                </div>
                <div className="flex flex-col p-5">
                    <div className="space-y-3 border-b pb-5 text-sm">
                        <div className="grid grid-cols-[60px_1fr] items-start gap-2">
                            <span className="text-muted-foreground">From:</span>
                            <span className="font-medium">Conference System</span>
                        </div>
                        <div className="grid grid-cols-[60px_1fr] items-start gap-2">
                            <span className="text-muted-foreground">To:</span>
                            <span className="font-medium">John Doe &lt;{previewData.recipientEmail}&gt;</span>
                        </div>
                        <div className="grid grid-cols-[60px_1fr] items-start gap-2">
                            <span className="text-muted-foreground">Subject:</span>
                            <span className="font-medium">{replaceVariables(activeTemplate?.subject || "No subject")}</span>
                        </div>
                    </div>
                    <div className="prose prose-sm dark:prose-invert mt-5 max-w-none whitespace-pre-wrap text-sm text-foreground">
                        {replaceVariables(activeTemplate?.body || "Email body content will appear here...")}
                    </div>
                </div>
            </div>
        </div>
    )
}
