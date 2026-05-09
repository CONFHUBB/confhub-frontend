"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserRole } from "@/hooks/useUserRole"
import { HeroSection } from "@/components/hero-section"
import { StatsSection } from "@/components/home/stats-section"
import { HowItWorks } from "@/components/home/how-it-works"
import { AudienceSection } from "@/components/home/audience-section"
import { ReviewerHonorSection } from "@/components/home/reviewer-honor-section"
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
      <div className="sticky z-40 border-b border-secondary/10 bg-white/80 backdrop-blur" style={{ top: "62px" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3">
          <nav className="flex items-center justify-center gap-3 overflow-x-auto text-sm font-medium text-text-medium">
            <a href="#hero" className="whitespace-nowrap hover:text-primary">Overview</a>
            <span className="text-text-light">|</span>
            <a href="#stats" className="whitespace-nowrap hover:text-primary">Trusted by</a>
            <span className="text-text-light">|</span>
            <a href="#features" className="whitespace-nowrap hover:text-primary">Core Workflow</a>
            <span className="text-text-light">|</span>
            <a href="#audience" className="whitespace-nowrap hover:text-primary">Who it&apos;s for</a>
            <span className="text-text-light">|</span>
            <a href="#honors" className="whitespace-nowrap hover:text-primary">Hall of Honor</a>
            <span className="text-text-light">|</span>
            <a href="#explore" className="whitespace-nowrap hover:text-primary">Explore</a>
            <span className="text-text-light">|</span>
            <a href="#cta" className="whitespace-nowrap hover:text-primary">Get started</a>
          </nav>
        </div>
      </div>
      <HeroSection />
      <StatsSection />
      <HowItWorks />
      <AudienceSection />
      <ReviewerHonorSection />
      <DynamicDataSection />
      <CTASection />
    </div>
  )
}
