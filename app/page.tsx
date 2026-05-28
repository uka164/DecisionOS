import type { Metadata } from "next"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingFooter } from "@/components/landing/landing-footer"
import { MobileCTA } from "@/components/landing/mobile-cta"
import { Hero } from "@/components/landing/sections/hero"
import { Problem } from "@/components/landing/sections/problem"
import { Category } from "@/components/landing/sections/category"
import { HowItWorks } from "@/components/landing/sections/how-it-works"
import { ProductPreview } from "@/components/landing/sections/product-preview"
import { Memory } from "@/components/landing/sections/memory"
import { Prioritization } from "@/components/landing/sections/prioritization"
import { Execution } from "@/components/landing/sections/execution"
import { UseCases } from "@/components/landing/sections/use-cases"
import { Trust } from "@/components/landing/sections/trust"
import { Comparison } from "@/components/landing/sections/comparison"
import { Philosophy } from "@/components/landing/sections/philosophy"
import { SocialProof } from "@/components/landing/sections/social-proof"
import { FAQ } from "@/components/landing/sections/faq"
import { FinalCTA } from "@/components/landing/sections/final-cta"

export const metadata: Metadata = {
  title: "DecisionOS — The operating system for organizational intelligence",
  description:
    "DecisionOS helps teams reason clearly, prioritize what matters, preserve context, and execute with alignment.",
  openGraph: {
    title: "DecisionOS — The operating system for organizational intelligence",
    description:
      "Reason clearly, prioritize what matters, preserve context, and execute with alignment.",
    type: "website",
  },
}

export default function LandingPage() {
  return (
    <div className="relative bg-bg-body">
      <LandingNav />
      <main>
        <Hero />
        <Problem />
        <Category />
        <HowItWorks />
        <ProductPreview />
        <Memory />
        <Prioritization />
        <Execution />
        <UseCases />
        <Trust />
        <Comparison />
        <Philosophy />
        <SocialProof />
        <FAQ />
        <FinalCTA />
      </main>
      <LandingFooter />
      <MobileCTA />
    </div>
  )
}
