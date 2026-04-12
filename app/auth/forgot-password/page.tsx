"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from 'sonner'
import { cn } from "@/lib/utils"
import { V, validate } from "@/lib/validation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { forgotPassword, resetPassword } from "@/app/api/account.api"
import { ArrowLeft, Mail, KeyRound, ShieldCheck, Loader2 } from "lucide-react"

type Step = "email" | "reset"

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  const handleRequestOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const emailErr = validate(email, V.required, V.email)
    if (emailErr) errs.email = emailErr
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})

    setIsLoading(true)
    try {
      const res = await forgotPassword({ email })
      toast.success(res.message || "OTP sent to your email!")
      setStep("reset")
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.detail || "Failed to send OTP. Please check your email.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const otpErr = validate(otp, V.required)
    if (otpErr) errs.otp = otpErr
    const passErr = validate(newPassword, V.required, (v) => V.minLen(v, 8))
    if (passErr) errs.newPassword = passErr
    if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords do not match"
    if (!confirmPassword) errs.confirmPassword = "Please confirm your new password"
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})

    setIsLoading(true)
    try {
      const res = await resetPassword({ email, otp, newPassword })
      toast.success(res.message || "Password reset successfully!")
      router.push("/auth/login")
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.detail || "Failed to reset password.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8">
            {step === "email" ? (
              <form onSubmit={handleRequestOtp}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-3 text-center mb-2">
                    <div className="rounded-full bg-indigo-100 p-3">
                      <Mail className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold">Forgot Password</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                      Enter your email address and we&apos;ll send you a verification code to reset your password.
                    </p>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="email">Email Address</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors(p => { const n = {...p}; delete n.email; return n }) }}
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                  </Field>
                  <Field>
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send Verification Code"}
                    </Button>
                  </Field>
                  <FieldDescription className="text-center">
                    <a href="/auth/login" className="inline-flex items-center gap-1 text-sm hover:underline">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Login
                    </a>
                  </FieldDescription>
                </FieldGroup>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-3 text-center mb-2">
                    <div className="rounded-full bg-green-100 p-3">
                      <ShieldCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold">Reset Password</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                      We sent a verification code to <strong>{email}</strong>. Enter it below along with your new password.
                    </p>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="otp">Verification Code (OTP)</FieldLabel>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      maxLength={6}
                      onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setErrors(p => { const n = {...p}; delete n.otp; return n }) }}
                      className="text-center text-lg tracking-[0.5em] font-mono"
                    />
                    {errors.otp && <p className="text-xs text-red-500 mt-1">{errors.otp}</p>}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                    <PasswordInput
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setErrors(p => { const n = {...p}; delete n.newPassword; return n }) }}
                    />
                    {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>}
                    <FieldDescription>Must be at least 8 characters.</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirmPassword">Confirm New Password</FieldLabel>
                    <PasswordInput
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setErrors(p => { const n = {...p}; delete n.confirmPassword; return n }) }}
                    />
                    {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                  </Field>
                  <Field>
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting...</> : "Reset Password"}
                    </Button>
                  </Field>
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => { setStep("email"); setOtp(""); setNewPassword(""); setConfirmPassword(""); setErrors({}) }}
                      className="inline-flex items-center gap-1 text-muted-foreground hover:underline"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsLoading(true)
                        try {
                          const res = await forgotPassword({ email })
                          toast.success(res.message || "New OTP sent!")
                        } catch (err: any) {
                          toast.error("Failed to resend OTP.")
                        } finally {
                          setIsLoading(false)
                        }
                      }}
                      disabled={isLoading}
                      className="text-indigo-600 hover:underline disabled:opacity-50"
                    >
                      Resend code
                    </button>
                  </div>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
