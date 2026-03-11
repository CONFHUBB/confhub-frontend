"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { PlusCircle, Search } from "lucide-react"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"

const Grainient = dynamic(
  () => import("@/components/ui/Grainient/Grainient"),
  { ssr: false }
)

export function HeroSection() {
  return (
    <section className="relative flex min-h-[400px] items-center justify-center overflow-hidden mt-2">
      {/* Grainient Background */}
      <div className="absolute inset-0">
        <Grainient
          color1="#a0b0fe"
          color2="#5458fe"
          color3="#9ba6ee"
          timeSpeed={1.25}
          colorBalance={0}
          warpStrength={1}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={50}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          grainAnimated={false}
          contrast={1.5}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
          Modern Conference Management
          <br />
          <span className="text-white/90">
            for Researchers &amp; Organizers.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl leading-relaxed text-white/80 sm:text-xl">
          Streamline your conference workflow from paper submissions to registration
          and reporting. Designed for efficiency and collaboration.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-white px-8 font-semibold shadow-lg hover:bg-white/90"
          >
            <Link href="/conference/create">
              <PlusCircle className="size-5 text-violet-600" />
              <AnimatedGradientText className="font-semibold text-base">
                Create New Conference
              </AnimatedGradientText>
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full border-white/40 font-semibold bg-white/10 text-base px-8 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
          >
            <Link href="/conference">
              <Search className=" size-5" />
              Browse Conferences
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
