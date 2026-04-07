"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserRole } from "@/hooks/useUserRole"
import { StatsSection } from "@/components/home/stats-section"
import { FeaturedConferences } from "@/components/home/featured-conferences"
import { HowItWorks } from "@/components/home/how-it-works"
import { DemoConference } from "@/components/home/demo-conference"
import { LatestPapers } from "@/components/home/latest-papers"
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

  // Admin/staff đang được redirect, không render gì thêm
  if (isAdminOrStaff) return null

  // Người dùng thông thường → hiển thị landing page
  return (
    <div className="flex flex-col">
      <StatsSection />
      <FeaturedConferences />
      <HowItWorks />
      <DemoConference />
      <LatestPapers />
    </div>
  )
}
