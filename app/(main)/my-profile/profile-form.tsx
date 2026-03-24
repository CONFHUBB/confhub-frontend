"use client"

import { useState } from "react"
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
import type { UserProfileRequest, UserProfile } from "@/types/user"
import toast from "react-hot-toast"

interface ProfileFormProps {
    initialData?: UserProfile | null
    onSubmit: (data: UserProfileRequest) => Promise<void>
    userName?: string
    userEmail?: string
}

const USER_TYPES = [
    { value: "academia", label: "Academia" },
    { value: "industry", label: "Industry" },
    { value: "government", label: "Government" },
    { value: "student", label: "Student" },
    { value: "other", label: "Other" },
]

export function ProfileForm({ initialData, onSubmit, userName, userEmail }: ProfileFormProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [avatarPreview, setAvatarPreview] = useState(initialData?.avatarUrl || "")

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
            orcidId: initialData?.orcidId || "",
            semanticScholarId: initialData?.semanticScholarId || "",
        },
    })

    const watchedUserType = watch("userType")
    const watchedInstitutionCountry = watch("institutionCountry")
    const watchedSecondaryCountry = watch("secondaryCountry")

    const handleFormSubmit = async (data: UserProfileRequest) => {
        try {
            setIsSaving(true)
            await onSubmit(data)
            toast.success("Profile updated successfully!")
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to update profile")
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
                            {watchedUserType && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary capitalize mt-1">
                                    {watchedUserType}
                                </span>
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
                                        <Label htmlFor="orcidId" className="text-sm font-semibold">ORCID iD</Label>
                                        <Input
                                            id="orcidId"
                                            placeholder="0000-0002-1825-0097"
                                            {...register("orcidId")}
                                        />
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
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 shrink-0">
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
