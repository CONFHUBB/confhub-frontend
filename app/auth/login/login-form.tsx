"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Loader2 } from "lucide-react"
import { login, loginWithGoogle } from "@/app/api/account.api"
import { getUserByEmail, getUserProfile } from "@/app/api/user.api"
import { getCurrentUserEmail } from "@/lib/auth"
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()
  const searchParams = useSearchParams()

  // Show session expired message if redirected from JWT interceptor
  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      toast('Your session has expired. Please log in again.', {
        icon: '🔒',
        duration: 5000,
        id: 'session-expired-toast',
      })
    }
  }, [searchParams])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const emailErr = validate(email, V.required, V.email)
    if (emailErr) errs.email = emailErr
    const passErr = validate(password, V.required, (v) => V.minLen(v, 8))
    if (passErr) errs.password = passErr
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})

    setIsLoading(true)
    try {
      const res = await login({ email, password })
      localStorage.setItem("accessToken", res.token)
      document.cookie = `accessToken=${res.token}; path=/; max-age=${60 * 60 * 24}` // 24 hours
      // Check if profile is already complete
      try {
        const user = await getUserByEmail(email)
        if (user?.id) {
          const profile = await getUserProfile(user.id)
          if (profile?.userType && profile?.institution) {
            document.cookie = `profileCompleted=true; path=/; max-age=${60 * 60 * 24 * 365}`
          }
        }
      } catch {}
      toast.success(res.message || "Login successful!")
      router.push("/")
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Invalid email or password."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast.error("Google login failed. No credential received.")
      return
    }
    setIsLoading(true)
    try {
      const res = await loginWithGoogle(credentialResponse.credential)
      localStorage.setItem("accessToken", res.token)
      document.cookie = `accessToken=${res.token}; path=/; max-age=${60 * 60 * 24}`
      // Check if profile is already complete
      try {
        const gEmail = getCurrentUserEmail()
        if (gEmail) {
          const user = await getUserByEmail(gEmail)
          if (user?.id) {
            const profile = await getUserProfile(user.id)
            if (profile?.userType && profile?.institution) {
              document.cookie = `profileCompleted=true; path=/; max-age=${60 * 60 * 24 * 365}`
            }
          }
        }
      } catch {}
      toast.success("Logged in with Google!")
      router.push("/")
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Google authentication failed."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const formContent = (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                  Login to your ConfHub account
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(p => { const n = {...p}; delete n.email; return n }) }}
                  onBlur={() => { const err = validate(email, V.required, V.email); setErrors(p => err ? {...p, email: err} : (() => { const n = {...p}; delete n.email; return n })()) }}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="/auth/forgot-password"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(p => { const n = {...p}; delete n.password; return n }) }}
                  onBlur={() => { const err = validate(password, V.required, (v) => V.minLen(v, 8)); setErrors(p => err ? {...p, password: err} : (() => { const n = {...p}; delete n.password; return n })()) }}
                />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Logging in...</> : "Login"}
                </Button>
              </Field>
              {GOOGLE_CLIENT_ID && (
                <>
                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                    Or continue with
                  </FieldSeparator>
                  <Field className="flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => toast.error("Google login failed.")}
                      size="large"
                      width="100%"
                      text="continue_with"
                      shape="rectangular"
                      theme="outline"
                    />
                  </Field>
                </>
              )}
              <FieldDescription className="text-center">
                Don&apos;t have an account? <a href="/auth/register">Sign up</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/images/Login.webp"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )

  // Wrap with GoogleOAuthProvider only if client ID is configured
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID} locale="en">
        {formContent}
      </GoogleOAuthProvider>
    )
  }

  return formContent
}
