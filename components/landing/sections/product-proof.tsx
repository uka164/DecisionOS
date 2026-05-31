"use client"

import { PenLine, Radar, Workflow } from "lucide-react"
import { Container, Section, Eyebrow, Heading, Reveal } from "../primitives"
import { CTAButton } from "../cta-button"
import { WorkspaceMock } from "../workspace-mock"

const THINGS = [
  {
    icon: PenLine,
    title: "Captures reasoning",
    line: "The options, trade-offs, and assumptions behind a call — structured, not buried in a thread.",
  },
  {
    icon: Radar,
    title: "Surfaces signals",
    line: "It reads across your decisions and flags only what matters: a recurring risk, a review you owe.",
  },
  {
    icon: Workflow,
    title: "Keeps decisions alive",
    line: "Owners, status, and a revisit date carry each decision from consensus through to outcome.",
  },
]

export function ProductProof() {
  return (
    <Section id="product">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* copy + the three things */}
          <div className="lg:max-w-md">
            <Reveal>
              <Eyebrow index="01">The product</Eyebrow>
              <Heading className="mt-5 text-3xl leading-[1.12] sm:text-4xl lg:text-[2.85rem]">
                One surface for the whole decision.
              </Heading>
              <p className="mt-5 text-pretty text-base leading-relaxed text-white/55">
                DecisionOS does three things — and you can see all of them in a
                single workspace.
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <ul className="mt-8 space-y-4">
                {THINGS.map((t) => {
                  const Icon = t.icon
                  return (
                    <li key={t.title} className="flex gap-3.5">
                      <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-1 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-[15px] font-semibold text-white">{t.title}</h3>
                        <p className="mt-1 text-pretty text-sm leading-relaxed text-white/55">
                          {t.line}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-8">
                <CTAButton href="/app" variant="primary" icon="arrow">
                  Open the workspace
                </CTAButton>
              </div>
            </Reveal>
          </div>

          {/* product screen */}
          <Reveal delay={0.1}>
            <WorkspaceMock />
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}
