"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserRole } from "@/hooks/useUserRole"
import { HeroSection } from "@/components/hero-section"
import { StatsSection } from "@/components/home/stats-section"
import { HowItWorks } from "@/components/home/how-it-works"
import { AudienceSection } from "@/components/home/audience-section"
import { DynamicDataSection } from "@/components/home/dynamic-data-section"
import { CTASection } from "@/components/home/cta-section"

import { Loader2 } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const { isAdminOrStaff, isLoading } = useUserRole()

  useEffect(() => {
    if (!isLoading && isAdminOrStaff) {
      router.replace("/dashboard")
    }
  }, [isAdminOrStaff, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Admin/staff are being redirected — render nothing
  if (isAdminOrStaff) return null

  // Regular users → new landing page
  return (
    <div className="flex flex-col">
      <HeroSection />
      <StatsSection />
      <HowItWorks />
      <AudienceSection />
      <DynamicDataSection />
      <CTASection />
    </div>
  )
}
