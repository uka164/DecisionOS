import type { Metadata } from "next"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingFooter } from "@/components/landing/landing-footer"
import { MobileCTA } from "@/components/landing/mobile-cta"
import { Hero } from "@/components/landing/sections/hero"
import { ProductProof } from "@/components/landing/sections/product-proof"
import { DecisionsDecay } from "@/components/landing/sections/decisions-decay"
import { HowItWorks } from "@/components/landing/sections/how-it-works"
import { CoreSystem } from "@/components/landing/sections/core-system"
import { UseCasesComparison } from "@/components/landing/sections/use-cases-comparison"
import { FAQ } from "@/components/landing/sections/faq"
import { FinalCTA } from "@/components/landing/sections/final-cta"

export const metadata: Metadata = {
  title: "DecisionOS - Private decision journal",
  description:
    "DecisionOS helps you log decisions, revisit assumptions, and learn what your reasoning got wrong.",
  openGraph: {
    title: "DecisionOS - Private decision journal",
    description:
      "Log decisions, revisit assumptions, and learn what your reasoning got wrong.",
    type: "website",
  },
}

export default function LandingPage() {
  return (
    <div className="relative bg-bg-body">
      <LandingNav />
      <main>
        <Hero />
        <ProductProof />
        <DecisionsDecay />
        <HowItWorks />
        <CoreSystem />
        <UseCasesComparison />
        <FAQ />
        <FinalCTA />
      </main>
      <LandingFooter />
      <MobileCTA />
    </div>
  )
}
