"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from 'sonner'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CountrySelect } from "@/components/ui/country-select"
import { signup, loginWithGoogle } from "@/app/api/account.api"
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google"
import { z } from "zod"
import { PasswordInput } from "@/components/ui/password-input"
import { Loader2 } from "lucide-react"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

// Zod schema matching backend UserDTO validation
const signupSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name must be between 1 and 50 characters"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name must be between 1 and 50 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email format"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
    country: z
      .string()
      .min(1, "Country is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type FieldErrors = Record<string, string>

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [country, setCountry] = useState("")
  const [roles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const router = useRouter()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFieldErrors({})

    // Client-side validation
    const result = signupSchema.safeParse({
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      country,
    })

    if (!result.success) {
      const errors: FieldErrors = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string
        if (!errors[field]) {
          errors[field] = issue.message
        }
      })
      setFieldErrors(errors)
      return
    }

    setIsLoading(true)
    try {
      const res = await signup({
        firstName,
        lastName,
        email,
        password,
        phoneNumber: "",
        country,
        roles,
      })
      toast.success(res.message || "Account created successfully!")
      router.push("/auth/login")
    } catch (err: any) {
      const data = err.response?.data
      if (data?.errors && typeof data.errors === "object") {
        // Backend field-level validation errors (ProblemDetail with errors map)
        setFieldErrors(data.errors as FieldErrors)
      } else {
        // Business error (ProblemDetail with detail) or generic error
        const message =
          data?.detail || data?.message || "Something went wrong. Please try again."
        toast.error(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast.error("Google sign-up failed. No credential received.")
      return
    }
    setIsLoading(true)
    try {
      const res = await loginWithGoogle(credentialResponse.credential)
      localStorage.setItem("accessToken", res.token)
      document.cookie = `accessToken=${res.token}; path=/; max-age=${60 * 60 * 24}`
      toast.success("Account created & logged in with Google!")
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
          <form className="p-6 md:p-8" onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Create your account</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Fill in the details below to create your account
                </p>
              </div>

              <Field className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    autoFocus
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value)
                      if (fieldErrors.firstName) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.firstName
                          return next
                        })
                      }
                    }}
                  />
                  {fieldErrors.firstName && (
                    <FieldError>{fieldErrors.firstName}</FieldError>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value)
                      if (fieldErrors.lastName) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.lastName
                          return next
                        })
                      }
                    }}
                  />
                  {fieldErrors.lastName && (
                    <FieldError>{fieldErrors.lastName}</FieldError>
                  )}
                </Field>
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.email
                        return next
                      })
                    }
                  }}
                  onBlur={() => {
                    const result = signupSchema.shape.email.safeParse(email)
                    if (!result.success) {
                      setFieldErrors((prev) => ({ ...prev, email: result.error.issues[0].message }))
                    }
                  }}
                />
                {fieldErrors.email && (
                  <FieldError>{fieldErrors.email}</FieldError>
                )}
              </Field>
              <Field className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="country">Country</FieldLabel>
                  <CountrySelect
                    value={country}
                    onValueChange={(val) => {
                      setCountry(val)
                      if (fieldErrors.country) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.country
                          return next
                        })
                      }
                    }}
                  />
                  {fieldErrors.country && (
                    <FieldError>{fieldErrors.country}</FieldError>
                  )}
                </Field>
              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <PasswordInput
                      id="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) {
                          setFieldErrors((prev) => {
                            const next = { ...prev }
                            delete next.password
                            return next
                          })
                        }
                      }}
                      onBlur={() => {
                        const result = signupSchema.shape.password.safeParse(password)
                        if (!result.success) {
                          setFieldErrors((prev) => ({ ...prev, password: result.error.issues[0].message }))
                        }
                      }}
                    />
                    {fieldErrors.password && (
                      <FieldError>{fieldErrors.password}</FieldError>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <PasswordInput
                      id="confirm-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (fieldErrors.confirmPassword) {
                          setFieldErrors((prev) => {
                            const next = { ...prev }
                            delete next.confirmPassword
                            return next
                          })
                        }
                      }}
                      onBlur={() => {
                        if (confirmPassword && password !== confirmPassword) {
                          setFieldErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }))
                        }
                      }}
                    />
                    {fieldErrors.confirmPassword && (
                      <FieldError>{fieldErrors.confirmPassword}</FieldError>
                    )}
                  </Field>
                </Field>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Account"}
                </Button>
              </Field>
              {GOOGLE_CLIENT_ID && (
                <>
                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                    Or continue with
                  </FieldSeparator>
                  <Field className="flex w-full justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => toast.error("Google sign-up failed.")}
                      size="large"
                      text="signup_with"
                      shape="rectangular"
                      theme="outline"
                    />
                  </Field>
                </>
              )}
              <FieldDescription className="text-center">
                Already have an account? <a href="/auth/login">Sign in</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/images/Register.webp"
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
