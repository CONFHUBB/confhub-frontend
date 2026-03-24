"use client"

import { StatsSection } from "@/components/home/stats-section"
import { FeaturedConferences } from "@/components/home/featured-conferences"
import { HowItWorks } from "@/components/home/how-it-works"
import { DemoConference } from "@/components/home/demo-conference"
import { LatestPapers } from "@/components/home/latest-papers"
import { HomeFooter } from "@/components/home/home-footer"

export default function Home() {
  return (
    <div className="flex flex-col">
      <StatsSection />
      <FeaturedConferences />
      <HowItWorks />
      <DemoConference />
      <LatestPapers />
      <HomeFooter />
    </div>
  )
}
