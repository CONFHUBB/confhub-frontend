"use client"

import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { DynamicField, DynamicFieldType, FormDefinition } from "@/types/submission-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export interface FormRendererProps {
    definitionJson: string
    onSubmit: (fixedData: any, extraAnswersJson: string) => void
    isSubmitting?: boolean
}

const generateSchema = (fields: DynamicField[]) => {
    const schemaShape: Record<string, any> = {
        title: z.string().min(1, { message: "Title is required" }),
        abstractField: z.string().min(1, { message: "Abstract is required" }),
        keyword1: z.string().min(1, { message: "Keyword 1 is required" }),
        keyword2: z.string().optional(),
        keyword3: z.string().optional(),
        keyword4: z.string().optional(),
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
            keyword1: "",
            keyword2: "",
            keyword3: "",
            keyword4: "",
            ...fields.reduce((acc, field) => {
                acc[field.id] = field.type === DynamicFieldType.CHECKBOX ? false : ""
                return acc
            }, {} as any)
        }
    })

    const { formState: { errors } } = form

    const handleSubmit = (data: FormData) => {
        const fixedData = {
            title: data.title,
            abstractField: data.abstractField,
            keyword1: data.keyword1,
            keyword2: data.keyword2,
            keyword3: data.keyword3,
            keyword4: data.keyword4,
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

            {/* Keywords */}
            <div className="space-y-3">
                <Label>Keywords</Label>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Input {...form.register("keyword1")} placeholder="Keyword 1 (required)" />
                        {errors.keyword1 && <p className="text-sm text-destructive">{errors.keyword1.message as string}</p>}
                    </div>
                    <Input {...form.register("keyword2")} placeholder="Keyword 2 (optional)" />
                    <Input {...form.register("keyword3")} placeholder="Keyword 3 (optional)" />
                    <Input {...form.register("keyword4")} placeholder="Keyword 4 (optional)" />
                </div>
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
