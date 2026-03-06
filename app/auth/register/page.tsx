"use client"

import { SignupForm } from "@/app/auth/register/signup-form"

export default function SignupPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center p-6 md:p-10 overflow-hidden">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center blur-sm scale-105"
        style={{ backgroundImage: "url('/images/Rectangle.webp')" }}
      />
      <div className="w-full max-w-sm md:max-w-4xl">
        <SignupForm />
      </div>
    </div>
  )
}
