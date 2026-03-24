"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Search, ArrowRight, Sparkles } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

const Grainient = dynamic(
  () => import("@/components/ui/Grainient/Grainient"),
  { ssr: false }
)

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/conference?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/conference')
    }
  }

  return (
    <section className="relative flex min-h-[560px] items-center justify-center overflow-hidden">
      {/* Grainient Background */}
      <div className="absolute inset-0">
        <Grainient
          color1="#4f46e5"
          color2="#7c3aed"
          color3="#6366f1"
          timeSpeed={0.8}
          colorBalance={0}
          warpStrength={1.2}
          warpFrequency={4}
          warpSpeed={1.5}
          warpAmplitude={60}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={400}
          noiseScale={2}
          grainAmount={0.08}
          grainScale={2}
          grainAnimated={false}
          contrast={1.4}
          gamma={1}
          saturation={1.1}
          centerX={0}
          centerY={0}
          zoom={0.85}
        />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />

      {/* Floating Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] left-[10%] w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[20%] right-[15%] w-48 h-48 bg-indigo-300/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-[40%] right-[8%] w-32 h-32 bg-purple-300/10 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span className="text-sm font-medium text-white/90">Trusted by 50,000+ researchers worldwide</span>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl leading-[1.1]">
          Where Research
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-200 bg-clip-text text-transparent">
            Meets the World
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
          The all-in-one platform for managing academic conferences — from paper submissions 
          and peer reviews to registration and publication.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-10 mx-auto max-w-xl">
          <div className="flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl shadow-black/20 focus-within:bg-white/15 focus-within:border-white/30 transition-all">
            <Search className="ml-5 h-5 w-5 text-white/50 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conferences, topics, papers..."
              className="flex-1 px-4 py-4 bg-transparent text-white placeholder:text-white/40 outline-none text-base"
            />
            <button
              type="submit"
              className="m-1.5 px-6 py-2.5 bg-white text-indigo-700 font-semibold text-sm rounded-xl hover:bg-gray-100 transition-colors shrink-0"
            >
              Search
            </button>
          </div>
        </form>

        {/* CTAs */}
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-white px-8 font-semibold shadow-lg hover:bg-gray-100 text-indigo-700 h-12 text-base"
          >
            <Link href="/conference">
              Browse Conferences
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full border-white/30 font-semibold bg-white/10 text-base px-8 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white h-12"
          >
            <Link href="/conference/create">
              Create Conference
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
