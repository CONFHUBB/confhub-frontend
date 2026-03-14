"use client"

import { useState, useEffect } from "react"
import { getUsers } from "@/app/api/user.api"
import type { User } from "@/types/user"
import type { RoleAssignmentData } from "@/types/conference-form"
import toast from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select } from "antd"
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from "@/components/ui/field"
import { ArrowLeft, Mail, Plus, Shield, Trash2, UserIcon } from "lucide-react"

interface AssignRoleProps {
    initialAssignments: RoleAssignmentData[]
    onSubmit: (assignments: RoleAssignmentData[]) => void
}

const ROLES = [
    { value: "CONFERENCE_CHAIR", label: "Conference Chair" },
    { value: "PROGRAM_CHAIR", label: "Program Chair" },
    { value: "REVIEWER", label: "Reviewer" },
    { value: "AUTHOR", label: "Author" },
    { value: "ATTENDEE", label: "Attendee" },
]

let nextId = 1

export function AssignRole({ initialAssignments, onSubmit }: AssignRoleProps) {
    const [isLoadingUsers, setIsLoadingUsers] = useState(true)
    const [users, setUsers] = useState<User[]>([])
    const [errors, setErrors] = useState<Record<string, string>>({})

    const [assignments, setAssignments] = useState<RoleAssignmentData[]>(() => {
        if (initialAssignments.length > 0) return initialAssignments
        return [{ id: nextId++, userId: "", role: "", isExternal: false, externalEmail: "" }]
    })

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await getUsers()
                setUsers(data)
            } catch (error) {
                console.error("Failed to load users:", error)
                toast.error("Failed to load users.")
            } finally {
                setIsLoadingUsers(false)
            }
        }
        fetchUsers()
    }, [])

    const addAssignment = () => {
        setAssignments((prev) => [...prev, { id: nextId++, userId: "", role: "", isExternal: false, externalEmail: "" }])
    }

    const removeAssignment = (id: number) => {
        if (assignments.length <= 1) return
        setAssignments((prev) => prev.filter((a) => a.id !== id))
        setErrors((prev) => {
            const next = { ...prev }
            Object.keys(next)
                .filter((k) => k.endsWith(`_${id}`))
                .forEach((k) => delete next[k])
            return next
        })
    }

    const updateAssignment = (
        id: number,
        field: "userId" | "role" | "isExternal" | "externalEmail",
        value: string | boolean
    ) => {
        setAssignments((prev) =>
            prev.map((a) => {
                if (a.id !== id) return a
                const updated = { ...a, [field]: value }
                if (field === "isExternal") {
                    if (value === true) {
                        updated.userId = ""
                    } else {
                        updated.externalEmail = ""
                    }
                }
                // When selecting an internal user, store their email for invitation
                if (field === "userId" && typeof value === "string") {
                    const selectedUser = users.find((u) => String(u.id) === value)
                    if (selectedUser) {
                        updated.externalEmail = selectedUser.email
                    }
                }
                return updated
            })
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
        assignments.forEach((a) => {
            if (a.isExternal) {
                if (!a.externalEmail.trim()) {
                    newErrors[`externalEmail_${a.id}`] = "Email is required."
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.externalEmail)) {
                    newErrors[`externalEmail_${a.id}`] = "Please enter a valid email."
                }
            } else {
                if (!a.userId) newErrors[`userId_${a.id}`] = "Please select a user."
            }
            if (!a.role) newErrors[`role_${a.id}`] = "Please select a role."
        })
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        onSubmit(assignments)
    }

    return (
        <form onSubmit={handleSubmit}>
            <FieldSet>
                <FieldLegend>Assign Roles</FieldLegend>
                <FieldDescription>
                    Select users and assign them roles for this conference. Toggle &quot;External User&quot; to invite someone outside the system via email.
                </FieldDescription>

                <div className="mt-6 space-y-6">
                    {assignments.map((assignment, index) => (
                        <div
                            key={assignment.id}
                            className="rounded-lg border p-4"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm font-medium">
                                    Assignment {index + 1}
                                </span>
                                {assignments.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            removeAssignment(assignment.id)
                                        }
                                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                )}
                            </div>

                            <FieldGroup>
                                {/* External User Toggle */}
                                <Field>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <FieldLabel className="mb-0">
                                                <Mail className="size-4" />
                                                External User
                                            </FieldLabel>
                                            <FieldDescription>
                                                Invite a user outside the system via email.
                                            </FieldDescription>
                                        </div>
                                        <Switch
                                            checked={assignment.isExternal}
                                            onCheckedChange={(checked) =>
                                                updateAssignment(
                                                    assignment.id,
                                                    "isExternal",
                                                    checked
                                                )
                                            }
                                        />
                                    </div>
                                </Field>

                                {/* User Select (internal) or Email Input (external) */}
                                {assignment.isExternal ? (
                                    <Field
                                        data-invalid={
                                            !!errors[`externalEmail_${assignment.id}`] ||
                                            undefined
                                        }
                                    >
                                        <FieldLabel>
                                            <Mail className="size-4" />
                                            Email Address
                                        </FieldLabel>
                                        <Input
                                            type="email"
                                            placeholder="e.g. reviewer@university.edu"
                                            value={assignment.externalEmail}
                                            onChange={(e) =>
                                                updateAssignment(
                                                    assignment.id,
                                                    "externalEmail",
                                                    e.target.value
                                                )
                                            }
                                            aria-invalid={!!errors[`externalEmail_${assignment.id}`]}
                                        />
                                        <FieldDescription>
                                            An invitation email will be sent to this address.
                                        </FieldDescription>
                                        {errors[`externalEmail_${assignment.id}`] && (
                                            <FieldError>
                                                {errors[`externalEmail_${assignment.id}`]}
                                            </FieldError>
                                        )}
                                    </Field>
                                ) : (
                                    <Field
                                        data-invalid={
                                            !!errors[`userId_${assignment.id}`] ||
                                            undefined
                                        }
                                    >
                                        <FieldLabel>
                                            <UserIcon className="size-4" />
                                            User
                                        </FieldLabel>
                                        <Select
                                            showSearch
                                            optionFilterProp="label"
                                            className="w-full h-10"
                                            placeholder={isLoadingUsers ? "Loading users..." : "Select a user"}
                                            value={assignment.userId || undefined}
                                            onChange={(value: string) => updateAssignment(assignment.id, "userId", value)}
                                            disabled={isLoadingUsers}
                                            options={users.map(u => ({ label: `${u.fullName} (${u.email})`, value: String(u.id) }))}
                                        />
                                        {errors[`userId_${assignment.id}`] && (
                                            <FieldError>
                                                {errors[`userId_${assignment.id}`]}
                                            </FieldError>
                                        )}
                                    </Field>
                                )}

                                {/* Role */}
                                <Field
                                    data-invalid={
                                        !!errors[`role_${assignment.id}`] ||
                                        undefined
                                    }
                                >
                                    <FieldLabel>
                                        <Shield className="size-4" />
                                        Role
                                    </FieldLabel>
                                    <Select
                                        showSearch
                                        optionFilterProp="label"
                                        className="w-full h-10"
                                        placeholder="Select a role"
                                        value={assignment.role || undefined}
                                        onChange={(value: string) => updateAssignment(assignment.id, "role", value)}
                                        options={ROLES}
                                    />
                                    {errors[`role_${assignment.id}`] && (
                                        <FieldError>
                                            {errors[`role_${assignment.id}`]}
                                        </FieldError>
                                    )}
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
                    onClick={addAssignment}
                >
                    <Plus className="mr-2 size-4" />
                    Add Another Assignment
                </Button>
            </FieldSet>

            <div className="mt-8 flex items-center justify-end gap-4">
                <Button type="submit" disabled={isLoadingUsers}>
                    Save Roles
                </Button>
            </div>
        </form>
    )
}
