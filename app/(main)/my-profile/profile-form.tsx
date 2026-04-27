"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CountrySelect } from "@/components/ui/country-select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
    Loader2,
    Save,
    User,
    Building2,
    Phone,
    GraduationCap,
    Globe,
    BookOpen,
} from "lucide-react"
import type { UserProfileRequest, UserProfile, UserStatus } from "@/types/user"
import { toast } from 'sonner'
import { FieldError } from "@/components/ui/field"
import { V } from "@/lib/validation"

interface ProfileFormProps {
    initialData?: UserProfile | null
    onSubmit: (data: UserProfileRequest) => Promise<void>
    userName?: string
    userEmail?: string
    userStatus?: UserStatus
    userStatusUntil?: string | null
}

const USER_TYPES = [
    { value: "ACADEMIA", label: "Academia" },
    { value: "INDUSTRY", label: "Industry" },
    { value: "GOVERNMENT", label: "Government" },
    { value: "STUDENT", label: "Student" },
    { value: "OTHER", label: "Other" },
]

const USER_STATUSES: Array<{ value: UserStatus; label: string }> = [
    { value: "AVAILABLE", label: "Available" },
    { value: "BUSY", label: "Busy" },
    { value: "VACATION", label: "Vacation" },
    { value: "FOCUSING", label: "Focusing" },
    { value: "SICK", label: "Sick" },
]

type StatusDurationOption = "30_MIN" | "1_HOUR" | "4_HOURS" | "TODAY" | "THIS_WEEK" | "CUSTOM"

const DURATION_OPTIONS: Array<{ value: StatusDurationOption; label: string }> = [
    { value: "30_MIN", label: "30 minutes" },
    { value: "1_HOUR", label: "1 hour" },
    { value: "4_HOURS", label: "4 hours" },
    { value: "TODAY", label: "Today" },
    { value: "THIS_WEEK", label: "This week" },
    { value: "CUSTOM", label: "Custom date and time" },
]

const toDateTimeLocalInput = (value?: string | null): string => {
    if (!value) return ""
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) {
        return value.length >= 16 ? value.slice(0, 16) : ""
    }
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    const hh = String(d.getHours()).padStart(2, "0")
    const mi = String(d.getMinutes()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

const calculateStatusUntil = (option: Exclude<StatusDurationOption, "CUSTOM">): string => {
    const now = new Date()

    if (option === "30_MIN") {
        return toDateTimeLocalInput(new Date(now.getTime() + 30 * 60 * 1000).toISOString())
    }
    if (option === "1_HOUR") {
        return toDateTimeLocalInput(new Date(now.getTime() + 60 * 60 * 1000).toISOString())
    }
    if (option === "4_HOURS") {
        return toDateTimeLocalInput(new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString())
    }
    if (option === "TODAY") {
        const todayEnd = new Date(now)
        todayEnd.setHours(23, 59, 0, 0)
        return toDateTimeLocalInput(todayEnd.toISOString())
    }

    const weekEnd = new Date(now)
    const daysUntilSunday = (7 - now.getDay()) % 7
    weekEnd.setDate(now.getDate() + daysUntilSunday)
    weekEnd.setHours(23, 59, 0, 0)
    return toDateTimeLocalInput(weekEnd.toISOString())
}

const getRemainingLabel = (status?: UserStatus, statusUntil?: string | null): string | null => {
    if (!status || status === "AVAILABLE" || !statusUntil) return null
    const ms = new Date(statusUntil).getTime() - Date.now()
    if (Number.isNaN(ms)) return null
    if (ms <= 0) return "Status duration has ended."

    const minutes = Math.floor(ms / 60000)
    if (minutes < 60) return `Ends in ${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Ends in ${hours}h ${minutes % 60}m`
    const days = Math.floor(hours / 24)
    return `Ends in ${days}d ${hours % 24}h`
}

export function ProfileForm({ initialData, onSubmit, userName, userEmail, userStatus, userStatusUntil }: ProfileFormProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [avatarPreview, setAvatarPreview] = useState(initialData?.avatarUrl || "")
    const [durationOption, setDurationOption] = useState<StatusDurationOption | "">(() => {
        const effectiveStatus = initialData?.userStatus || userStatus
        const effectiveStatusUntil = initialData?.userStatusUntil || userStatusUntil
        if (effectiveStatus && effectiveStatus !== "AVAILABLE" && effectiveStatusUntil) {
            return "CUSTOM"
        }
        return ""
    })

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UserProfileRequest>({
        defaultValues: {
            userType: initialData?.userType || "",
            jobTitle: initialData?.jobTitle || "",
            department: initialData?.department || "",
            institution: initialData?.institution || "",
            institutionCountry: initialData?.institutionCountry || "",
            institutionUrl: initialData?.institutionUrl || "",
            secondaryInstitution: initialData?.secondaryInstitution || "",
            secondaryCountry: initialData?.secondaryCountry || "",
            phoneOffice: initialData?.phoneOffice || "",
            phoneMobile: initialData?.phoneMobile || "",
            avatarUrl: initialData?.avatarUrl || "",
            biography: initialData?.biography || "",
            websiteUrl: initialData?.websiteUrl || "",
            dblpId: initialData?.dblpId || "",
            googleScholarLink: initialData?.googleScholarLink || "",
            orcid: initialData?.orcid || "",
            semanticScholarId: initialData?.semanticScholarId || "",
            userStatus: initialData?.userStatus || userStatus || "AVAILABLE",
            userStatusUntil: initialData?.userStatusUntil || userStatusUntil || null,
        },
    })

    const watchedUserType = watch("userType")
    const watchedUserStatus = watch("userStatus")
    const watchedUserStatusUntil = watch("userStatusUntil")
    const watchedInstitutionCountry = watch("institutionCountry")
    const watchedSecondaryCountry = watch("secondaryCountry")
    const remainingLabel = getRemainingLabel(watchedUserStatus, watchedUserStatusUntil)

    useEffect(() => {
        if (watchedUserStatus === "AVAILABLE") {
            if (watchedUserStatusUntil) setValue("userStatusUntil", null)
            setDurationOption("")
        }
    }, [watchedUserStatus, watchedUserStatusUntil, setValue])

    const handleFormSubmit = async (data: UserProfileRequest) => {
        try {
            const payload: UserProfileRequest = {
                ...data,
                userStatusUntil: data.userStatusUntil || null,
            }

            if (payload.userStatus && payload.userStatus !== "AVAILABLE") {
                if (!payload.userStatusUntil) {
                    toast.error("Please choose a duration for your status.")
                    return
                }

                const until = new Date(payload.userStatusUntil)
                if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
                    toast.error("Status duration must be in the future.")
                    return
                }
            } else {
                payload.userStatusUntil = null
            }

            setIsSaving(true)
            await onSubmit(payload)
            toast.success("Profile updated successfully!")
        } catch (err: unknown) {
            const message = typeof err === "object" && err !== null && "response" in err
                ? ((err as { response?: { data?: { message?: string; detail?: string } } }).response?.data?.message
                    || (err as { response?: { data?: { message?: string; detail?: string } } }).response?.data?.detail)
                : null
            toast.error(message || "Failed to update profile")
        } finally {
            setIsSaving(false)
        }
    }

    const initials = userName
        ? userName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "U"

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Profile Header Card */}
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
                <CardContent className="pt-8 pb-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative group">
                            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 blur-sm group-hover:blur-md transition-all" />
                            <Avatar className="relative h-24 w-24 ring-4 ring-background shadow-xl">
                                <AvatarImage src={avatarPreview} alt={userName || "User"} />
                                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/5">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="text-center sm:text-left space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">{userName || "User"}</h2>
                            <p className="text-sm text-muted-foreground">{userEmail}</p>
                            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-1">
                                {watchedUserType && (
                                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary capitalize">
                                        {watchedUserType}
                                    </span>
                                )}
                                <Select
                                    value={watchedUserStatus}
                                    onValueChange={(val) => {
                                        const nextStatus = val as UserStatus
                                        setValue("userStatus", nextStatus)
                                        if (nextStatus === "AVAILABLE") {
                                            setValue("userStatusUntil", null)
                                            setDurationOption("")
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-7 w-[132px] rounded-full border-primary/30 bg-background/90 px-3 text-xs font-medium">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {USER_STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>
                                                {s.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {watchedUserStatus && watchedUserStatus !== "AVAILABLE" && (
                                    <Select
                                        value={durationOption}
                                        onValueChange={(val) => {
                                            const option = val as StatusDurationOption
                                            setDurationOption(option)
                                            if (option !== "CUSTOM") {
                                                setValue("userStatusUntil", calculateStatusUntil(option), { shouldDirty: true })
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-7 w-[200px] rounded-full border-primary/30 bg-background/90 px-3 text-xs font-medium">
                                            <SelectValue placeholder="Duration" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DURATION_OPTIONS.map((d) => (
                                                <SelectItem key={d.value} value={d.value}>
                                                    {d.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            {watchedUserStatus && watchedUserStatus !== "AVAILABLE" && durationOption === "CUSTOM" && (
                                <div className="mt-2 w-full max-w-[300px]">
                                    <Input
                                        type="datetime-local"
                                        value={toDateTimeLocalInput(watchedUserStatusUntil)}
                                        min={toDateTimeLocalInput(new Date().toISOString())}
                                        onChange={(e) => setValue("userStatusUntil", e.target.value || null, { shouldDirty: true })}
                                        className="h-8 text-xs"
                                    />
                                </div>
                            )}
                            {remainingLabel && (
                                <p className="text-xs text-muted-foreground mt-1">{remainingLabel}</p>
                            )}
                        </div>
                        <div className="sm:ml-auto">
                            <Button type="submit" disabled={isSaving} size="lg" className="gap-2 shadow-md">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Save Profile
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabbed Form Sections */}
            <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-11">
                    <TabsTrigger value="personal" className="gap-1.5 text-xs sm:text-sm">
                        <User className="h-4 w-4 hidden sm:inline-block" />
                        Personal
                    </TabsTrigger>
                    <TabsTrigger value="affiliation" className="gap-1.5 text-xs sm:text-sm">
                        <Building2 className="h-4 w-4 hidden sm:inline-block" />
                        Affiliation
                    </TabsTrigger>
                    <TabsTrigger value="contact" className="gap-1.5 text-xs sm:text-sm">
                        <Phone className="h-4 w-4 hidden sm:inline-block" />
                        Contact
                    </TabsTrigger>
                    <TabsTrigger value="academic" className="gap-1.5 text-xs sm:text-sm">
                        <GraduationCap className="h-4 w-4 hidden sm:inline-block" />
                        Academic
                    </TabsTrigger>
                </TabsList>

                {/* Personal Information Tab */}
                <TabsContent value="personal" className="mt-4">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Personal Information
                            </CardTitle>
                            <CardDescription>
                                Tell the community about yourself.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="userType" className="text-sm font-medium">User Type</Label>
                                    <Select
                                        value={watchedUserType}
                                        onValueChange={(val) => setValue("userType", val)}
                                    >
                                        <SelectTrigger id="userType">
                                            <SelectValue placeholder="Select your type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {USER_TYPES.map((t) => (
                                                <SelectItem key={t.value} value={t.value}>
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="jobTitle" className="text-sm font-medium">Job Title</Label>
                                    <Input
                                        id="jobTitle"
                                        placeholder="e.g. Associate Professor"
                                        {...register("jobTitle")}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="avatarUrl" className="text-sm font-medium">Avatar URL</Label>
                                <div className="flex gap-3">
                                    <Input
                                        id="avatarUrl"
                                        placeholder="https://example.com/avatar.jpg"
                                        {...register("avatarUrl")}
                                        onChange={(e) => {
                                            register("avatarUrl").onChange(e)
                                            setAvatarPreview(e.target.value)
                                        }}
                                        className="flex-1"
                                    />
                                    {avatarPreview && (
                                        <Avatar className="h-10 w-10 shrink-0">
                                            <AvatarImage src={avatarPreview} />
                                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Provide a direct link to your profile photo.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="biography" className="text-sm font-medium">Biography</Label>
                                <Textarea
                                    id="biography"
                                    placeholder="Write a short bio about yourself, your research interests, and expertise..."
                                    rows={5}
                                    {...register("biography")}
                                    className="resize-none"
                                />
                                <p className="text-xs text-muted-foreground">
                                    A brief summary visible on your public profile.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Affiliation Tab */}
                <TabsContent value="affiliation" className="mt-4">
                    <div className="space-y-4">
                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    Primary Institution
                                </CardTitle>
                                <CardDescription>
                                    Your main academic or professional affiliation.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="institution" className="text-sm font-medium">Institution Name</Label>
                                        <Input
                                            id="institution"
                                            placeholder="e.g. FPT University"
                                            {...register("institution")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                                        <Input
                                            id="department"
                                            placeholder="e.g. Computer Science"
                                            {...register("department")}
                                        />
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Country</Label>
                                        <CountrySelect
                                            value={watchedInstitutionCountry}
                                            onValueChange={(val) => setValue("institutionCountry", val)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="institutionUrl" className="text-sm font-medium">Institution Website</Label>
                                        <Input
                                            id="institutionUrl"
                                            placeholder="https://university.edu.vn"
                                            {...register("institutionUrl")}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Building2 className="h-5 w-5 text-muted-foreground" />
                                    Secondary Institution
                                    <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                                </CardTitle>
                                <CardDescription>
                                    A secondary affiliation, if applicable.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="secondaryInstitution" className="text-sm font-medium">Institution Name</Label>
                                        <Input
                                            id="secondaryInstitution"
                                            placeholder="e.g. Vietnam National University"
                                            {...register("secondaryInstitution")}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Country</Label>
                                        <CountrySelect
                                            value={watchedSecondaryCountry}
                                            onValueChange={(val) => setValue("secondaryCountry", val)}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Contact Tab */}
                <TabsContent value="contact" className="mt-4">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Phone className="h-5 w-5 text-primary" />
                                Contact Details
                            </CardTitle>
                            <CardDescription>
                                How colleagues and organizers can reach you.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="phoneOffice" className="text-sm font-medium">Office Phone</Label>
                                    <Input
                                        id="phoneOffice"
                                        placeholder="+84 28 1234 5678"
                                        {...register("phoneOffice")}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phoneMobile" className="text-sm font-medium">Mobile Phone</Label>
                                    <Input
                                        id="phoneMobile"
                                        placeholder="+84 912 345 678"
                                        {...register("phoneMobile")}
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label htmlFor="websiteUrl" className="text-sm font-medium flex items-center gap-1.5">
                                    <Globe className="h-4 w-4" />
                                    Personal Website
                                </Label>
                                <Input
                                    id="websiteUrl"
                                    placeholder="https://yourwebsite.com"
                                    {...register("websiteUrl")}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Your personal or academic homepage.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Academic Profiles Tab */}
                <TabsContent value="academic" className="mt-4">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5 text-primary" />
                                Academic & Research Profiles
                            </CardTitle>
                            <CardDescription>
                                Link your research profiles to improve discoverability.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-5">
                                <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                                        <BookOpen className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <Label htmlFor="orcid" className="text-sm font-semibold">ORCID iD</Label>
                                        <Input
                                            id="orcid"
                                            placeholder="0000-0002-1825-0097"
                                            {...register("orcid", { validate: val => V.orcid(val) || undefined })}
                                        />
                                        {errors.orcid?.message && <FieldError>{errors.orcid.message}</FieldError>}
                                        <p className="text-xs text-muted-foreground">
                                            Your unique ORCID identifier (e.g. 0000-0002-1825-0097).
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 shrink-0">
                                        <GraduationCap className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <Label htmlFor="googleScholarLink" className="text-sm font-semibold">Google Scholar</Label>
                                        <Input
                                            id="googleScholarLink"
                                            placeholder="https://scholar.google.com/citations?user=XXXXX"
                                            {...register("googleScholarLink")}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Full URL to your Google Scholar profile.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-600 shrink-0">
                                        <Globe className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <Label htmlFor="dblpId" className="text-sm font-semibold">DBLP</Label>
                                        <Input
                                            id="dblpId"
                                            placeholder="Your DBLP author ID"
                                            {...register("dblpId")}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Your DBLP computer science bibliography ID.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 shrink-0">
                                        <BookOpen className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <Label htmlFor="semanticScholarId" className="text-sm font-semibold">Semantic Scholar</Label>
                                        <Input
                                            id="semanticScholarId"
                                            placeholder="Your Semantic Scholar author ID"
                                            {...register("semanticScholarId")}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Your Semantic Scholar unique identifier.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Bottom Save Button */}
            <div className="flex justify-end pt-2 pb-8">
                <Button type="submit" disabled={isSaving} size="lg" className="gap-2 shadow-md min-w-[160px]">
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            Save Profile
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
