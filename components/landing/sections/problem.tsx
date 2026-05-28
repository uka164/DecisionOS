"use client"

import { motion, useReducedMotion } from "framer-motion"
import { MessagesSquare, FileText, CheckSquare, Map, Users } from "lucide-react"
import { Container, Section, Eyebrow, Heading, Reveal, EASE_OUT } from "../primitives"
import { CTAButton } from "../cta-button"

const FRAGMENTS = [
  { icon: MessagesSquare, label: "Slack", x: "8%", y: "10%", drift: { x: -22, y: -16 } },
  { icon: FileText, label: "Docs", x: "62%", y: "4%", drift: { x: 26, y: -10 } },
  { icon: Users, label: "Meetings", x: "4%", y: "60%", drift: { x: -18, y: 22 } },
  { icon: CheckSquare, label: "Tasks", x: "68%", y: "54%", drift: { x: 24, y: 18 } },
  { icon: Map, label: "Roadmaps", x: "38%", y: "78%", drift: { x: 4, y: 28 } },
]

export function Problem() {
  const reduce = useReducedMotion()

  return (
    <Section id="problem">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {/* narrative */}
          <Reveal>
            <Eyebrow index="01">The problem</Eyebrow>
            <Heading className="mt-5 text-3xl leading-[1.1] sm:text-4xl lg:text-5xl">
              Decisions decay the moment the meeting ends.
            </Heading>
            <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-white/55">
              Context scatters across calls, docs, threads, and tools. The
              reasoning behind a choice evaporates. Six weeks later, no one
              remembers why — so the debate starts over.
            </p>
            <p className="mt-5 max-w-md text-pretty text-lg font-medium leading-relaxed text-white/80">
              Most teams do not lack information. They lack a persistent
              structure for thinking.
            </p>
            <div className="mt-8">
              <CTAButton href="#system" variant="ghost" icon="arrow">
                See the system
              </CTAButton>
            </div>
          </Reveal>

          {/* fragmentation diagram */}
          <Reveal delay={0.1}>
            <div className="relative aspect-square w-full max-w-md justify-self-center rounded-lg border border-white/[0.06] bg-white/[0.015] p-2 shadow-[0_24px_90px_-60px_var(--primary-glow)]">
              {/* center node */}
              <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                <div className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-white/10 bg-bg-card/80 text-center backdrop-blur-md">
                  <span className="font-mono text-[9px] uppercase text-white/40">
                    one
                  </span>
                  <span className="text-xs font-medium text-white/70">decision</span>
                </div>
              </div>

              {/* broken connections */}
              <svg className="absolute inset-0 h-full w-full" aria-hidden>
                {FRAGMENTS.map((f, i) => (
                  <motion.line
                    key={i}
                    x1="50%"
                    y1="50%"
                    x2={f.x}
                    y2={f.y}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                    initial={false}
                    whileInView={{ pathLength: 1, opacity: 0.5 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: EASE_OUT, delay: 0.2 + i * 0.08 }}
                  />
                ))}
              </svg>

              {/* drifting fragments */}
              {FRAGMENTS.map((f, i) => {
                const Icon = f.icon
                return (
                  <motion.div
                    key={f.label}
                    className="absolute z-20"
                    style={{ left: f.x, top: f.y }}
                    initial={false}
                    whileInView={{
                      opacity: 1,
                      x: reduce ? 0 : f.drift.x,
                      y: reduce ? 0 : f.drift.y,
                    }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.3 + i * 0.1 }}
                  >
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-bg-card/70 px-3 py-2 backdrop-blur-md">
                      <Icon className="h-3.5 w-3.5 text-white/45" />
                      <span className="text-xs text-white/65">{f.label}</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}
