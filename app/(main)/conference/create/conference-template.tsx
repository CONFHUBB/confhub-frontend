"use client"

import { useState } from "react"
import type { TemplateData } from "@/types/conference-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { ArrowLeft, Copy, FileText, Info, Mail, Plus, Trash2, Type } from "lucide-react"
import toast from "react-hot-toast"

interface ConferenceTemplateProps {
    initialTemplates: TemplateData[]
    onSubmit: (templates: TemplateData[]) => void
    onBack: () => void
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

export function ConferenceTemplate({ initialTemplates, onSubmit, onBack }: ConferenceTemplateProps) {
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
            if (!t.templateType.trim())
                newErrors[`templateType_${t.id}`] = "Template type is required."
            if (!t.subject.trim())
                newErrors[`subject_${t.id}`] = "Subject is required."
            if (!t.body.trim())
                newErrors[`body_${t.id}`] = "Body is required."
        })
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        onSubmit(templates)
    }

    return (
        <form onSubmit={handleSubmit}>
            {/* Template Variables Reference */}
            <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-300">
                    <Info className="size-4" />
                    Available Template Variables
                </div>
                <p className="mb-3 text-xs text-blue-700 dark:text-blue-400">
                    Use these variables in the Subject and Body fields. They will be replaced with actual values when sending emails.
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                    {TEMPLATE_VARIABLES.map((v) => (
                        <button
                            key={v.variable}
                            type="button"
                            onClick={() => copyVariable(v.variable)}
                            className="group flex items-center justify-between rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs transition-colors hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/40 dark:hover:bg-blue-800/60"
                        >
                            <span>
                                <code className="mr-2 font-mono font-semibold text-blue-700 dark:text-blue-300">
                                    {v.variable}
                                </code>
                                <span className="text-muted-foreground">{v.description}</span>
                            </span>
                            <Copy className="size-3 text-blue-400 opacity-0 transition-opacity group-hover:opacity-100" />
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
                                        onChange={(e) =>
                                            updateTemplate(
                                                template.id,
                                                "subject",
                                                e.target.value
                                            )
                                        }
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
                                    <Textarea
                                        placeholder={"Dear Colleague,\n\nYou have been invited to {{conferenceName}} as {{roleName}}.\n\nConference Details:\n- Location: {{location}}\n- Start Date: {{startDate}}\n- End Date: {{endDate}}\n\nBest regards,\nConference Management System"}
                                        rows={6}
                                        value={template.body}
                                        onChange={(e) =>
                                            updateTemplate(
                                                template.id,
                                                "body",
                                                e.target.value
                                            )
                                        }
                                        aria-invalid={
                                            !!errors[`body_${template.id}`]
                                        }
                                    />
                                    <FieldDescription>
                                        The email body content. You can use template variables.
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
                                            onCheckedChange={(checked) =>
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

            <div className="mt-8 flex items-center justify-between gap-4">
                <Button type="button" variant="outline" onClick={onBack}>
                    <ArrowLeft className="mr-2 size-4" />
                    Back
                </Button>
                <Button type="submit">
                    Next: Review Type →
                </Button>
            </div>
        </form>
    )
}
