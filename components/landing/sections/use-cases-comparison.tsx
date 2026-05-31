"use client"

import { Check } from "lucide-react"
import { Container, Section, Eyebrow, Heading, Reveal, Stagger, StaggerItem } from "../primitives"
import { CTAButton } from "../cta-button"
import { Logo } from "../logo"

const USE_CASES = [
  { domain: "Leadership", line: "High-stakes calls and resource bets you can audit later." },
  { domain: "Product", line: "Roadmap trade-offs, build vs. buy, and feature hypotheses." },
  { domain: "Operations", line: "Process changes and vendor choices that don't quietly revert." },
  { domain: "Strategy", line: "Market entry, pricing, and org design with explicit assumptions." },
]

const CAPABILITIES = [
  "Persistent context",
  "Structured reasoning & trade-offs",
  "Pre-mortem & risk checks",
  "Execution & revisit loop",
  "Decision memory",
]

export function UseCasesComparison() {
  return (
    <Section id="compare">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow index="05" className="justify-center">
              Where it fits
            </Eyebrow>
            <Heading className="mt-5 text-3xl leading-[1.12] sm:text-4xl lg:text-[2.85rem]">
              Built for decisions that deserve a second look.
            </Heading>
            <p className="mt-5 text-pretty text-base leading-relaxed text-white/55">
              Chat, docs, and dashboards each hold a fragment. DecisionOS is the
              one place the whole decision stays coherent.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-12">
          {/* use cases — short */}
          <Reveal>
            <Stagger className="space-y-2.5">
              {USE_CASES.map((u) => (
                <StaggerItem key={u.domain}>
                  <div className="flex items-baseline gap-4 rounded-lg border border-hairline bg-surface-1 px-5 py-4 transition-colors hover:border-hairline-strong">
                    <span className="w-24 flex-shrink-0 text-sm font-semibold text-white">
                      {u.domain}
                    </span>
                    <span className="text-sm leading-relaxed text-white/55">{u.line}</span>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>

          {/* comparison — compact, no wide table */}
          <Reveal delay={0.08}>
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Logo className="h-4 w-4" />
                What only DecisionOS keeps coherent
              </div>
              <ul className="mt-5 space-y-3">
                {CAPABILITIES.map((c) => (
                  <li key={c} className="flex items-center gap-3 text-sm text-white/75">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-hairline pt-4 text-xs leading-relaxed text-white/55">
                Other tools cover one or two of these. None hold the whole loop —
                from reasoning to remembered outcome.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mt-10 flex justify-center">
          <CTAButton href="/app" variant="secondary" icon="arrow">
            Open the app
          </CTAButton>
        </Reveal>
      </Container>
    </Section>
  )
}
