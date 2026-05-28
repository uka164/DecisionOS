"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Container, Section, Eyebrow, Heading, Reveal, EASE_OUT } from "../primitives"
import { CTAButton } from "../cta-button"
import { WorkspaceMock } from "../workspace-mock"

const FEATURES = [
  {
    label: "Reasoning canvas",
    desc: "Lay out the decision, its options, and the trade-offs between them in one structured brief.",
    pos: { x: "50%", y: "46%" },
  },
  {
    label: "Context graph",
    desc: "Every linked doc, thread, and prior decision stays attached — so the why travels with the what.",
    pos: { x: "17%", y: "42%" },
  },
  {
    label: "Priority model",
    desc: "A live, explainable score from weighted criteria. Adjust the inputs, watch the ranking move.",
    pos: { x: "83%", y: "34%" },
  },
  {
    label: "Execution trail",
    desc: "Owners, status, and dependencies tracked from consensus through to delivered outcome.",
    pos: { x: "83%", y: "74%" },
  },
]

export function ProductPreview() {
  const [active, setActive] = useState(0)

  return (
    <Section id="product">
      <Container>
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow index="04">Product</Eyebrow>
            <Heading className="mt-5 text-3xl leading-[1.12] sm:text-4xl lg:text-[2.85rem]">
              The Decision Workspace.
            </Heading>
            <p className="mt-5 text-pretty text-base leading-relaxed text-white/55">
              One surface for the whole decision — reasoning, context,
              priority, and execution in view at once. Inspect any part.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mt-14">
          <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
            {/* annotated mock */}
            <div className="relative lg:col-span-3">
              <WorkspaceMock />
              {/* hotspots — desktop only, mapped to workspace regions */}
              <div className="absolute inset-0 hidden lg:block">
                {FEATURES.map((f, i) => (
                  <button
                    key={f.label}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => setActive(i)}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: f.pos.x, top: f.pos.y }}
                    aria-label={f.label}
                  >
                    <span className="relative flex h-4 w-4 items-center justify-center">
                      {active === i && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-30" />
                      )}
                      <span
                        className={cn(
                          "relative h-3 w-3 rounded-full border transition-all duration-300",
                          active === i
                            ? "border-primary bg-primary shadow-[0_0_12px_var(--primary-glow)]"
                            : "border-white/40 bg-white/20 hover:border-primary/60"
                        )}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* feature selector */}
            <div className="lg:col-span-2">
              {/* mobile chips */}
              <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:hidden [scrollbar-width:none]">
                {FEATURES.map((f, i) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => setActive(i)}
                    className={cn(
                      "flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                      active === i
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-white/10 bg-white/[0.03] text-white/55"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* desktop list */}
              <div className="hidden flex-col gap-1.5 lg:flex">
                {FEATURES.map((f, i) => (
                  <button
                    key={f.label}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => setActive(i)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors duration-300",
                      active === i
                        ? "border-white/[0.14] bg-white/[0.04]"
                        : "border-transparent hover:bg-white/[0.02]"
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-xs transition-colors",
                        active === i ? "text-primary" : "text-white/30"
                      )}
                    >
                      0{i + 1}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors",
                        active === i ? "text-white" : "text-white/55"
                      )}
                    >
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* active description */}
              <div className="mt-5 rounded-lg border border-white/[0.07] bg-white/[0.02] p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: EASE_OUT }}
                  >
                    <div className="font-mono text-[10px] uppercase text-primary/80">
                      {FEATURES[active].label}
                    </div>
                    <p className="mt-2 text-pretty text-sm leading-relaxed text-white/65">
                      {FEATURES[active].desc}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-6">
                <CTAButton href="#request" variant="ghost" icon="arrow">
                  Open interactive demo
                </CTAButton>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}
