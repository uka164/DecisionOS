"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Container, Section, Eyebrow, Heading, Reveal, EASE_OUT } from "../primitives"
import { CTAButton } from "../cta-button"

const TABS = [
  {
    id: "leadership",
    label: "Leadership",
    cta: "Use DecisionOS for leadership alignment",
    flows: [
      { title: "Board decisions", desc: "Frame the call, the options, and the reasoning the board can audit later." },
      { title: "Strategic bets", desc: "Weigh long-horizon investments with explicit confidence and risk." },
      { title: "Resource allocation", desc: "Decide where capital and headcount go — and revisit when it changes." },
    ],
  },
  {
    id: "product",
    label: "Product",
    cta: "Use DecisionOS for product decisions",
    flows: [
      { title: "Roadmap trade-offs", desc: "Rank competing bets by impact, effort, and strategic fit." },
      { title: "Build vs. buy", desc: "Compare paths with linked context that survives the debate." },
      { title: "Feature bets", desc: "Capture the hypothesis, then close the loop on what actually happened." },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    cta: "Use DecisionOS for operational clarity",
    flows: [
      { title: "Process changes", desc: "Document why a process changed so it isn't quietly reverted." },
      { title: "Vendor selection", desc: "Score vendors against weighted criteria, transparently." },
      { title: "Incident retros", desc: "Turn post-mortems into decisions with owners and follow-through." },
    ],
  },
  {
    id: "strategy",
    label: "Strategy",
    cta: "Use DecisionOS for strategic planning",
    flows: [
      { title: "Market entry", desc: "Structure the bet, the assumptions, and the kill criteria." },
      { title: "Pricing models", desc: "Reason through pricing changes with explicit trade-offs." },
      { title: "Org design", desc: "Capture the logic behind structure changes for the next reorg." },
    ],
  },
  {
    id: "ai-native",
    label: "AI-native teams",
    cta: "Use DecisionOS for AI decisions",
    flows: [
      { title: "Model selection", desc: "Compare models on cost, quality, and latency with a clear rationale." },
      { title: "Eval trade-offs", desc: "Decide what to optimize and record why you accepted the trade." },
      { title: "Agent architecture", desc: "Keep design decisions linked as the system evolves fast." },
    ],
  },
]

export function UseCases() {
  const [active, setActive] = useState(0)
  const tab = TABS[active]

  return (
    <Section id="use-cases" className="border-y border-white/[0.05] bg-white/[0.012]">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow index="08" className="justify-center">
              Use cases
            </Eyebrow>
            <Heading className="mt-5 text-3xl leading-[1.12] sm:text-4xl lg:text-[2.85rem]">
              Built for the decisions your team actually makes.
            </Heading>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mt-12">
          {/* segmented control */}
          <div className="-mx-5 mb-8 flex gap-2 overflow-x-auto px-5 pb-1 sm:justify-center [scrollbar-width:none]">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "relative flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active === i ? "text-white" : "text-white/50 hover:text-white/80"
                )}
              >
                {active === i && (
                  <motion.span
                    layoutId="usecase-pill"
                    className="absolute inset-0 rounded-full border border-white/[0.12] bg-white/[0.06]"
                    transition={{ duration: 0.4, ease: EASE_OUT }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>

          {/* workflows */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab.id}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="grid gap-3 sm:grid-cols-3"
            >
              {tab.flows.map((flow, i) => (
                <div
                  key={flow.title}
                  className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.14]"
                >
                  <span className="font-mono text-[10px] text-primary/70">
                    0{i + 1}
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-white">
                    {flow.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">
                    {flow.desc}
                  </p>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex justify-center">
            <CTAButton href="#request" variant="secondary" icon="arrow">
              {tab.cta}
            </CTAButton>
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}
