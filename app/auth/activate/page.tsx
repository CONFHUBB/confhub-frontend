"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CountrySelect } from "@/components/ui/country-select"
import { Loader2, UserPlus, Shield, CheckCircle2 } from "lucide-react"
import { activateAccount } from "@/app/api/account.api"
import { createOrUpdateUserProfile } from "@/app/api/user.api"
import type { UserProfileRequest } from "@/types/user"
import { toast } from 'sonner'
import { V, validate } from "@/lib/validation"

const USER_TYPES = [
    { value: "ACADEMIA", label: "Academia" },
    { value: "INDUSTRY", label: "Industry" },
    { value: "GOVERNMENT", label: "Government" },
    { value: "STUDENT", label: "Student" },
    { value: "OTHER", label: "Other" },
]

type Step = "activate" | "profile" | "done"

export default function ActivatePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <ActivateContent />
        </Suspense>
    )
}

function ActivateContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const emailParam = searchParams.get("email") || ""
    const invitationToken = searchParams.get("token") || ""

    const [step, setStep] = useState<Step>("activate")
    const [isLoading, setIsLoading] = useState(false)

    // Step 1: Activate form
    const [email, setEmail] = useState(emailParam)
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")

    // After activation
    const [userId, setUserId] = useState<number | null>(null)
    const [token, setToken] = useState<string | null>(null)

    // Step 2: Profile form
    const [userType, setUserType] = useState("")
    const [jobTitle, setJobTitle] = useState("")
    const [institution, setInstitution] = useState("")
    const [department, setDepartment] = useState("")
    const [institutionCountry, setInstitutionCountry] = useState("")

    // Validation errors
    const [errors, setErrors] = useState<Record<string, string>>({})
    const clearErr = (field: string) => setErrors(p => { const n = {...p}; delete n[field]; return n })

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault()
        const errs: Record<string, string> = {}
        const fnErr = validate(firstName, V.required, (v) => V.maxLen(v, 50))
        if (fnErr) errs.firstName = fnErr
        const lnErr = validate(lastName, V.required, (v) => V.maxLen(v, 50))
        if (lnErr) errs.lastName = lnErr
        const pwErr = validate(newPassword, V.required, V.password)
        if (pwErr) errs.newPassword = pwErr
        if (!errs.newPassword) {
            const mErr = V.matchField(newPassword, confirmPassword)
            if (mErr) errs.confirmPassword = mErr
        }
        if (Object.keys(errs).length > 0) { setErrors(errs); return }
        setErrors({})

        setIsLoading(true)
        try {
            const result = await activateAccount({
                email,
                invitationToken,
                newPassword,
                firstName,
                lastName,
            })

            // Store token for authenticated API calls
            setToken(result.token)
            setUserId(result.id)
            localStorage.setItem("token", result.token)

            toast.success("Account activated! Please complete your profile.")
            setStep("profile")
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data?.detail || "Activation failed. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userId) return
        const errs: Record<string, string> = {}
        const jtErr = V.maxLen(jobTitle, 100)
        if (jtErr) errs.jobTitle = jtErr
        const instErr = V.maxLen(institution, 200)
        if (instErr) errs.institution = instErr
        const deptErr = V.maxLen(department, 200)
        if (deptErr) errs.department = deptErr
        if (Object.keys(errs).length > 0) { setErrors(errs); return }
        setErrors({})

        setIsLoading(true)
        try {
            const profileData: UserProfileRequest = {
                userType,
                jobTitle,
                institution,
                department,
                institutionCountry,
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
            await createOrUpdateUserProfile(userId, profileData)
            toast.success("Profile saved! Redirecting...")
            setStep("done")
            setTimeout(() => {
                router.push("/")
            }, 1500)
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to save profile")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSkipProfile = () => {
        toast.success("You can update your profile later. Redirecting...")
        setTimeout(() => {
            router.push("/")
        }, 1000)
    }

    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center p-6 md:p-10 overflow-hidden">
            <div
                className="absolute inset-0 -z-10 bg-cover bg-center blur-sm scale-105"
                style={{ backgroundImage: "url('/images/Rectangle.webp')" }}
            />

            <div className="w-full max-w-lg">
                {/* Step indicators */}
                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className={`flex items-center gap-1.5 text-sm font-medium ${step === "activate" ? "text-white" : "text-white/60"}`}>
                        <Shield className="h-4 w-4" />
                        Set Password
                    </div>
                    <div className="w-8 h-px bg-white/30" />
                    <div className={`flex items-center gap-1.5 text-sm font-medium ${step === "profile" ? "text-white" : "text-white/60"}`}>
                        <UserPlus className="h-4 w-4" />
                        Profile
                    </div>
                    <div className="w-8 h-px bg-white/30" />
                    <div className={`flex items-center gap-1.5 text-sm font-medium ${step === "done" ? "text-white" : "text-white/60"}`}>
                        <CheckCircle2 className="h-4 w-4" />
                        Done
                    </div>
                </div>

                {/* Step 1: Activate Account */}
                {step === "activate" && (
                    <Card className="shadow-xl border-0">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold">Activate Your Account</CardTitle>
                            <CardDescription>
                                You&apos;ve been invited to a conference. Set up your account to get started.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleActivate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        readOnly={!!emailParam}
                                        className={emailParam ? "bg-muted" : ""}
                                        required
                                    />
                                </div>


                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input
                                            id="firstName"
                                            placeholder="John"
                                            value={firstName}
                                            onChange={(e) => { setFirstName(e.target.value); clearErr('firstName') }}
                                            required
                                        />
                                        {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            placeholder="Doe"
                                            value={lastName}
                                            onChange={(e) => { setLastName(e.target.value); clearErr('lastName') }}
                                            required
                                        />
                                        {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="At least 8 characters"
                                        value={newPassword}
                                        onChange={(e) => { setNewPassword(e.target.value); clearErr('newPassword') }}
                                        minLength={8}
                                        required
                                    />
                                    {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="Re-enter your password"
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); clearErr('confirmPassword') }}
                                        required
                                    />
                                    {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                                </div>

                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating...</>
                                    ) : (
                                        <><Shield className="mr-2 h-4 w-4" /> Activate Account</>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Setup Profile */}
                {step === "profile" && (
                    <Card className="shadow-xl border-0">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
                            <CardDescription>
                                Tell us a bit about yourself. You can update these details later.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleProfileSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="userType">User Type</Label>
                                        <Select value={userType} onValueChange={setUserType}>
                                            <SelectTrigger id="userType">
                                                <SelectValue placeholder="Select type" />
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
                                        <Label htmlFor="profileJobTitle">Job Title</Label>
                                        <Input
                                            id="profileJobTitle"
                                            placeholder="e.g. Professor"
                                            value={jobTitle}
                                            onChange={(e) => { setJobTitle(e.target.value); clearErr('jobTitle') }}
                                        />
                                        {errors.jobTitle && <p className="text-xs text-red-500 mt-1">{errors.jobTitle}</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="profileInstitution">Institution</Label>
                                    <Input
                                        id="profileInstitution"
                                        placeholder="e.g. FPT University"
                                        value={institution}
                                        onChange={(e) => { setInstitution(e.target.value); clearErr('institution') }}
                                    />
                                    {errors.institution && <p className="text-xs text-red-500 mt-1">{errors.institution}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="profileDepartment">Department</Label>
                                        <Input
                                            id="profileDepartment"
                                            placeholder="e.g. Computer Science"
                                            value={department}
                                            onChange={(e) => { setDepartment(e.target.value); clearErr('department') }}
                                        />
                                        {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Country</Label>
                                        <CountrySelect
                                            value={institutionCountry}
                                            onValueChange={setInstitutionCountry}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button type="button" variant="outline" className="flex-1" onClick={handleSkipProfile}>
                                        Skip for now
                                    </Button>
                                    <Button type="submit" className="flex-1" disabled={isLoading}>
                                        {isLoading ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                                        ) : (
                                            <><UserPlus className="mr-2 h-4 w-4" /> Save & Continue</>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Done */}
                {step === "done" && (
                    <Card className="shadow-xl border-0">
                        <CardContent className="pt-8 pb-8 text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="rounded-full bg-green-100 p-3">
                                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
                            <p className="text-muted-foreground">
                                Your account is activated and profile is saved. Redirecting you to the dashboard...
                            </p>
                            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
