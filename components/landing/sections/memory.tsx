"use client"

import { motion } from "framer-motion"
import { Container, Section, Eyebrow, Heading, Reveal, EASE_OUT } from "../primitives"
import { CTAButton } from "../cta-button"
import { cn } from "@/lib/utils"

// Decision nodes positioned along a gentle timeline (viewBox 0 0 420 260).
const NODES = [
  { x: 40, y: 200, r: 5, o: 0.4 },
  { x: 130, y: 150, r: 6, o: 0.55 },
  { x: 215, y: 185, r: 6, o: 0.7 },
  { x: 300, y: 120, r: 7, o: 0.85 },
  { x: 380, y: 70, r: 10, o: 1 },
]
const LAST = NODES[NODES.length - 1]

export function Memory() {
  return (
    <Section id="memory">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {/* copy */}
          <Reveal>
            <Eyebrow index="05">Context memory</Eyebrow>
            <Heading className="mt-5 text-3xl leading-[1.12] sm:text-4xl lg:text-[2.85rem]">
              Every decision becomes reusable intelligence.
            </Heading>
            <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-white/55">
              DecisionOS keeps the reasoning, not just the outcome. Past
              decisions stay linked to the ones that follow — so context
              compounds instead of disappearing.
            </p>
            <p className="mt-5 max-w-md text-pretty text-lg font-medium leading-relaxed text-white/80">
              Not a forgotten artifact. A memory your organization can reason
              from.
            </p>
            <div className="mt-8">
              <CTAButton href="#request" variant="ghost" icon="arrow">
                See the memory layer
              </CTAButton>
            </div>
          </Reveal>

          {/* memory graph (desktop) */}
          <Reveal delay={0.1} className="hidden lg:block">
            <div className="relative rounded-lg border border-white/[0.06] bg-white/[0.015] p-6 shadow-[0_24px_90px_-64px_var(--primary-glow)]">
              <div className="mb-4 flex items-center justify-between font-mono text-[10px] uppercase text-white/35">
                <span>Earlier</span>
                <span className="text-primary/70">Now</span>
              </div>
              <svg viewBox="0 0 420 260" className="h-auto w-full">
                {/* influence arcs into the newest decision */}
                {NODES.slice(0, -1).map((n, i) => {
                  const midX = (n.x + LAST.x) / 2
                  const midY = Math.min(n.y, LAST.y) - 40
                  return (
                    <motion.path
                      key={i}
                      d={`M ${n.x} ${n.y} Q ${midX} ${midY} ${LAST.x} ${LAST.y}`}
                      fill="none"
                      stroke="url(#mem-grad)"
                      strokeWidth="1.25"
                      initial={false}
                      whileInView={{ pathLength: 1, opacity: 0.45 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.3, ease: EASE_OUT, delay: 0.4 + i * 0.15 }}
                    />
                  )
                })}
                {/* baseline timeline connecting nodes in order */}
                <motion.path
                  d={`M ${NODES.map((n) => `${n.x} ${n.y}`).join(" L ")}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                  initial={false}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, ease: EASE_OUT }}
                />
                {/* nodes */}
                {NODES.map((n, i) => (
                  <motion.circle
                    key={i}
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill={i === NODES.length - 1 ? "var(--primary)" : "rgba(255,255,255,0.5)"}
                    fillOpacity={n.o}
                    initial={false}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.2 + i * 0.15 }}
                    style={{
                      transformOrigin: `${n.x}px ${n.y}px`,
                      filter:
                        i === NODES.length - 1
                          ? "drop-shadow(0 0 10px var(--primary-glow))"
                          : "none",
                    }}
                  />
                ))}
                <defs>
                  <linearGradient id="mem-grad" x1="0" y1="0" x2="420" y2="0" gradientUnits="userSpaceOnUse">
                    <stop stopColor="var(--secondary)" />
                    <stop offset="1" stopColor="var(--primary)" />
                  </linearGradient>
                </defs>
              </svg>
              <p className="mt-4 text-center text-xs text-white/40">
                Older decisions inform the newest one — automatically.
              </p>
            </div>
          </Reveal>

          {/* before / after (mobile) */}
          <Reveal delay={0.1} className="lg:hidden">
            <div className="grid gap-3 sm:grid-cols-2">
              <BeforeAfter
                tone="muted"
                title="Without DecisionOS"
                body="Decisions vanish into docs and chat. Each new debate restarts from zero."
              />
              <BeforeAfter
                tone="primary"
                title="With DecisionOS"
                body="Every decision links to the ones before it. Reasoning compounds into memory."
              />
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}

function BeforeAfter({
  tone,
  title,
  body,
}: {
  tone: "muted" | "primary"
  title: string
  body: string
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-5",
        tone === "primary"
          ? "border-primary/25 bg-primary/[0.06]"
          : "border-white/[0.07] bg-white/[0.015]"
      )}
    >
      <div
        className={cn(
          "font-mono text-[10px] uppercase",
          tone === "primary" ? "text-primary/80" : "text-white/40"
        )}
      >
        {title}
      </div>
      <p
        className={cn(
          "mt-2 text-sm leading-relaxed",
          tone === "primary" ? "text-white/80" : "text-white/55"
        )}
      >
        {body}
      </p>
    </div>
  )
}
