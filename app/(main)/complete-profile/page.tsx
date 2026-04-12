"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUserByEmail, getUserProfile, createOrUpdateUserProfile } from "@/app/api/user.api"
import type { UserProfile, UserProfileRequest } from "@/types/user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CountrySelect } from "@/components/ui/country-select"
import { Loader2, Sparkles, Building2, GraduationCap, ArrowRight } from "lucide-react"
import { toast } from 'sonner'
import { getCurrentUserEmail } from '@/lib/auth'
import { ProfileSkeleton } from '@/components/shared/skeletons'

const USER_TYPES = [
    { value: "ACADEMIA", label: "Academia", icon: "🎓" },
    { value: "INDUSTRY", label: "Industry", icon: "🏢" },
    { value: "GOVERNMENT", label: "Government", icon: "🏛️" },
    { value: "STUDENT", label: "Student", icon: "📚" },
    { value: "OTHER", label: "Other", icon: "🌐" },
]

export default function CompleteProfilePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [userId, setUserId] = useState<number | null>(null)
    const [userName, setUserName] = useState("")
    const [userEmail, setUserEmail] = useState("")

    // Form fields (essential only)
    const [userType, setUserType] = useState("")
    const [institution, setInstitution] = useState("")
    const [department, setDepartment] = useState("")
    const [institutionCountry, setInstitutionCountry] = useState("")

    // Validation
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        checkProfile()
    }, [])

    const checkProfile = async () => {
        try {
            const email = getCurrentUserEmail()
            if (!email) {
                router.push("/auth/login")
                return
            }

            const user = await getUserByEmail(email)
            if (!user || !user.id) {
                router.push("/auth/login")
                return
            }

            setUserId(user.id)
            setUserName(user.fullName || "")
            setUserEmail(user.email || "")

            // Check if profile already exists and is complete
            try {
                const profile = await getUserProfile(user.id)
                if (profile && profile.userType && profile.institution) {
                    // Profile already complete — set cookie and redirect
                    document.cookie = `profileCompleted=true; path=/; max-age=${60 * 60 * 24 * 365}`
                    router.push("/")
                    return
                }
                // Profile exists but incomplete — pre-fill what we have
                if (profile) {
                    setUserType(profile.userType || "")
                    setInstitution(profile.institution || "")
                    setDepartment(profile.department || "")
                    setInstitutionCountry(profile.institutionCountry || "")
                }
            } catch {
                // No profile at all — that's fine, user needs to create one
            }
        } catch (err) {
            toast.error("Failed to load profile. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const validate = (): boolean => {
        const errs: Record<string, string> = {}
        if (!userType) errs.userType = "Please select your user type"
        if (!institution.trim()) errs.institution = "Institution is required"
        if (!institutionCountry) errs.institutionCountry = "Please select your country"
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = async () => {
        if (!validate() || !userId) return

        setSaving(true)
        try {
            const data: UserProfileRequest = {
                userType,
                institution,
                department,
                institutionCountry,
                // Default empty values for non-essential fields
                jobTitle: "",
                institutionUrl: "",
                secondaryInstitution: "",
                secondaryCountry: "",
                phoneOffice: "",
                phoneMobile: "",
                avatarUrl: "",
                biography: "",
                websiteUrl: "",
                dblpId: "",
                googleScholarLink: "",
                orcid: "",
                semanticScholarId: "",
            }

            await createOrUpdateUserProfile(userId, data)

            // Set the cookie so middleware knows profile is done
            document.cookie = `profileCompleted=true; path=/; max-age=${60 * 60 * 24 * 365}`

            toast.success("Profile setup complete! Welcome to ConfHub.")
            router.push("/")
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to save profile. Please try again.")
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <ProfileSkeleton />

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-2xl space-y-6">
                {/* Welcome Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200 mb-2">
                        <Sparkles className="h-8 w-8" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Welcome to ConfHub{userName ? `, ${userName.split(' ')[0]}` : ''}!
                    </h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Let's set up your academic profile. This helps conference organizers and reviewers identify you correctly.
                    </p>
                </div>

                {/* Profile Form Card */}
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                            Essential Information
                        </CardTitle>
                        <CardDescription>
                            These fields are required to participate in conferences. You can complete the rest later in your profile settings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* User Type */}
                        <div className="space-y-2">
                            <Label htmlFor="userType" className="text-sm font-medium">
                                User Type <span className="text-red-500">*</span>
                            </Label>
                            <Select value={userType} onValueChange={(val) => { setUserType(val); setErrors(p => { const n = {...p}; delete n.userType; return n }) }}>
                                <SelectTrigger id="userType" className={errors.userType ? "border-red-300 ring-red-100" : ""}>
                                    <SelectValue placeholder="Select your role in academia" />
                                </SelectTrigger>
                                <SelectContent>
                                    {USER_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                            <span className="flex items-center gap-2">
                                                <span>{t.icon}</span>
                                                <span>{t.label}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.userType && <p className="text-xs text-red-500">{errors.userType}</p>}
                        </div>

                        {/* Institution */}
                        <div className="space-y-2">
                            <Label htmlFor="institution" className="text-sm font-medium">
                                Institution <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="institution"
                                placeholder="e.g. FPT University, MIT, Stanford..."
                                value={institution}
                                onChange={(e) => { setInstitution(e.target.value); setErrors(p => { const n = {...p}; delete n.institution; return n }) }}
                                className={errors.institution ? "border-red-300 ring-red-100" : ""}
                            />
                            {errors.institution && <p className="text-xs text-red-500">{errors.institution}</p>}
                        </div>

                        {/* Department (optional but recommended) */}
                        <div className="space-y-2">
                            <Label htmlFor="department" className="text-sm font-medium">
                                Department <span className="text-muted-foreground text-xs">(recommended)</span>
                            </Label>
                            <Input
                                id="department"
                                placeholder="e.g. Computer Science, Software Engineering..."
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            />
                        </div>

                        {/* Country */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                Country <span className="text-red-500">*</span>
                            </Label>
                            <CountrySelect
                                value={institutionCountry}
                                onValueChange={(val) => { setInstitutionCountry(val); setErrors(p => { const n = {...p}; delete n.institutionCountry; return n }) }}
                            />
                            {errors.institutionCountry && <p className="text-xs text-red-500">{errors.institutionCountry}</p>}
                        </div>

                        {/* Submit */}
                        <div className="pt-2">
                            <Button
                                onClick={handleSubmit}
                                disabled={saving}
                                size="lg"
                                className="w-full gap-2 shadow-md bg-indigo-600 hover:bg-indigo-700"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Setting up your profile...
                                    </>
                                ) : (
                                    <>
                                        Get Started
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>

                        <p className="text-xs text-center text-muted-foreground">
                            You can update all profile fields later in <span className="font-medium">Global Assets → My Profile</span>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
