"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Check, User, Flag, AlertTriangle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Container,
  Section,
  Eyebrow,
  Heading,
  Reveal,
  EASE_OUT,
} from "../primitives"
import { CTAButton } from "../cta-button"

const STAGES = [
  { label: "Decision", state: "done" },
  { label: "Owner", state: "done" },
  { label: "Milestone", state: "active" },
  { label: "Dependency", state: "risk" },
  { label: "Status", state: "active" },
  { label: "Learning", state: "todo" },
] as const

const FACTS = [
  { icon: User, label: "Owner", value: "Platform team" },
  { icon: Flag, label: "Next milestone", value: "Cutover · Jun 14" },
  { icon: AlertTriangle, label: "Risk", value: "1 blocked dependency", warn: true },
  { icon: RefreshCw, label: "Learning loop", value: "Review scheduled" },
]

export function Execution() {
  const reduce = useReducedMotion()

  return (
    <Section id="execute">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <Eyebrow index="07">Execution</Eyebrow>
            <Heading className="mt-5 text-3xl leading-[1.12] sm:text-4xl lg:text-5xl">
              Decisions don&apos;t end at consensus.
            </Heading>
            <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-white/55">
              The moment a call is made, DecisionOS turns it into an execution
              system — owners, milestones, dependencies, and status, all linked
              back to the reasoning that started it.
            </p>
            <p className="mt-5 max-w-md text-pretty text-lg font-medium leading-relaxed text-white/80">
              They become execution systems with a built-in learning loop.
            </p>
            <div className="mt-8">
              <CTAButton href="#request" variant="ghost" icon="arrow">
                See execution tracking
              </CTAButton>
            </div>
          </Reveal>

          {/* execution record */}
          <Reveal delay={0.1}>
            <div className="rounded-lg border border-white/[0.07] bg-bg-card/60 p-5 backdrop-blur-xl shadow-[0_24px_90px_-64px_var(--primary-glow)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase text-white/35">
                    Execution record
                  </div>
                  <h3 className="mt-1.5 text-base font-semibold leading-snug text-white">
                    Adopt event-driven architecture
                  </h3>
                </div>
                <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  In progress
                </span>
              </div>

              {/* stage pipeline */}
              <div className="mt-6 flex items-center gap-1.5">
                {STAGES.map((s, i) => (
                  <div key={s.label} className="flex flex-1 items-center gap-1.5">
                    <motion.div
                      className="flex-1"
                      initial={false}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, ease: EASE_OUT, delay: i * 0.12 }}
                    >
                      <div
                        className={cn(
                          "flex h-7 items-center justify-center rounded-md text-[10px] font-medium transition-colors",
                          s.state === "done" && "bg-primary/15 text-primary",
                          s.state === "active" && "bg-white/[0.08] text-white",
                          s.state === "risk" && "bg-rose-500/15 text-rose-300",
                          s.state === "todo" && "bg-white/[0.03] text-white/35"
                        )}
                      >
                        {s.state === "done" ? <Check className="h-3.5 w-3.5" /> : null}
                        {s.state === "active" && !reduce && (
                          <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" />
                        )}
                      </div>
                      <div className="mt-1.5 text-center text-[9px] text-white/40">
                        {s.label}
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>

              {/* facts grid */}
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {FACTS.map((f, i) => {
                  const Icon = f.icon
                  return (
                    <motion.div
                      key={f.label}
                      initial={false}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.4 + i * 0.1 }}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3.5"
                    >
                      <div className="flex items-center gap-2 text-white/40">
                        <Icon className={cn("h-3.5 w-3.5", f.warn && "text-amber-400")} />
                        <span className="text-[10px] uppercase">{f.label}</span>
                      </div>
                      <div
                        className={cn(
                          "mt-1.5 text-sm font-medium",
                          f.warn ? "text-amber-200" : "text-white/80"
                        )}
                      >
                        {f.value}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}
