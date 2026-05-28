"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Container, Section, Eyebrow, Heading, Reveal, EASE_OUT } from "../primitives"
import { CTAButton } from "../cta-button"

type CriterionKey = "impact" | "urgency" | "confidence" | "effort" | "dependency" | "fit"

const CRITERIA: { key: CriterionKey; label: string; hint: string }[] = [
  { key: "impact", label: "Impact", hint: "Outcome size" },
  { key: "urgency", label: "Urgency", hint: "Time pressure" },
  { key: "confidence", label: "Confidence", hint: "Evidence strength" },
  { key: "effort", label: "Effort", hint: "Lower is better" },
  { key: "dependency", label: "Dependency", hint: "Fewer is better" },
  { key: "fit", label: "Strategic fit", hint: "Aligns to bets" },
]

// Each initiative is pre-rated 0–100 per criterion, oriented so higher = better
// (effort/dependency stored as "efficiency": high means low effort / few deps).
const INITIATIVES = [
  { id: "billing", name: "Migrate billing to event-driven", r: { impact: 92, urgency: 58, confidence: 55, effort: 30, dependency: 45, fit: 88 } },
  { id: "pricing", name: "Ship usage-based pricing", r: { impact: 82, urgency: 88, confidence: 72, effort: 62, dependency: 70, fit: 80 } },
  { id: "onboarding", name: "Rebuild the onboarding flow", r: { impact: 58, urgency: 52, confidence: 86, effort: 78, dependency: 84, fit: 52 } },
  { id: "mobile", name: "Launch the mobile app", r: { impact: 76, urgency: 38, confidence: 46, effort: 28, dependency: 40, fit: 70 } },
]

const PRESETS: { label: string; weights: Record<CriterionKey, number> }[] = [
  { label: "Move fast", weights: { impact: 60, urgency: 95, confidence: 40, effort: 80, dependency: 50, fit: 45 } },
  { label: "Reduce risk", weights: { impact: 55, urgency: 40, confidence: 95, effort: 60, dependency: 90, fit: 50 } },
  { label: "Strategic bets", weights: { impact: 95, urgency: 35, confidence: 45, effort: 30, dependency: 40, fit: 95 } },
]

const DEFAULT_WEIGHTS: Record<CriterionKey, number> = {
  impact: 80,
  urgency: 60,
  confidence: 50,
  effort: 45,
  dependency: 35,
  fit: 75,
}

export function Prioritization() {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const ranked = useMemo(() => {
    const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1
    return INITIATIVES.map((it) => {
      const score = CRITERIA.reduce(
        (sum, c) => sum + weights[c.key] * it.r[c.key],
        0
      ) / total
      return { ...it, score: Math.round(score) }
    }).sort((a, b) => b.score - a.score)
  }, [weights])

  const setWeight = (key: CriterionKey, value: number) => {
    setActivePreset(null)
    setWeights((w) => ({ ...w, [key]: value }))
  }

  const applyPreset = (label: string, w: Record<CriterionKey, number>) => {
    setActivePreset(label)
    setWeights(w)
  }

  return (
    <Section id="prioritize" className="border-y border-white/[0.05] bg-white/[0.012]">
      <Container>
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow index="06">Prioritization</Eyebrow>
            <Heading className="mt-5 text-3xl leading-[1.12] sm:text-4xl lg:text-[2.85rem]">
              Priorities become explainable, revisable, and aligned.
            </Heading>
            <p className="mt-5 text-pretty text-base leading-relaxed text-white/55">
              Set what your team values. The ranking updates live — and anyone
              can see exactly why one initiative outranks another.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mt-12">
          <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
            {/* controls */}
            <div className="lg:col-span-2">
              {/* presets */}
              <div className="mb-6 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.label, p.weights)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                      activePreset === p.label
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* sliders — desktop */}
              <div className="hidden space-y-4 rounded-lg border border-white/[0.07] bg-white/[0.02] p-5 lg:block">
                <div className="font-mono text-[10px] uppercase text-white/35">
                  Criteria weights
                </div>
                {CRITERIA.map((c) => (
                  <div key={c.key}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <label htmlFor={`w-${c.key}`} className="text-sm text-white/70">
                        {c.label}
                        <span className="ml-2 text-[11px] text-white/30">{c.hint}</span>
                      </label>
                      <span className="font-mono text-xs text-primary">{weights[c.key]}</span>
                    </div>
                    <input
                      id={`w-${c.key}`}
                      type="range"
                      min={0}
                      max={100}
                      value={weights[c.key]}
                      onChange={(e) => setWeight(c.key, Number(e.target.value))}
                      className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 [accent-color:var(--primary)]"
                    />
                  </div>
                ))}
              </div>

              {/* mobile note */}
              <p className="text-sm leading-relaxed text-white/45 lg:hidden">
                Pick a scenario above to see how priorities shift. The full model
                exposes a weighted slider for every criterion.
              </p>
            </div>

            {/* live ranking */}
            <div className="lg:col-span-3">
              <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase text-white/35">
                <span>Ranked initiatives</span>
                <span>Score</span>
              </div>
              <div className="relative space-y-2.5">
                {ranked.map((it, i) => (
                  <motion.div
                    key={it.id}
                    layout
                    transition={{ duration: 0.6, ease: EASE_OUT }}
                    className={cn(
                      "flex items-center gap-4 rounded-lg border px-4 py-3.5 backdrop-blur-md",
                      i === 0
                        ? "border-primary/25 bg-primary/[0.05]"
                        : "border-white/[0.07] bg-white/[0.02]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold",
                        i === 0 ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-white/50"
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">
                        {it.name}
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-secondary to-primary"
                          animate={{ width: `${it.score}%` }}
                          transition={{ duration: 0.6, ease: EASE_OUT }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-lg font-semibold text-white tabular-nums">
                      {it.score}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-7">
                <CTAButton href="#request" variant="ghost" icon="arrow">
                  Try the prioritization model
                </CTAButton>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}
