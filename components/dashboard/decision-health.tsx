"use client"

import { useMemo } from "react"
import { useNow } from "@/hooks/useNow"
import { cn } from "@/lib/utils"
import type { Decision } from "@/lib/types"

const HIGH_RISK_SEVERITY = 70
const OPEN = new Set<Decision["status"]>(["draft", "in-progress"])
const LIVE = new Set<Decision["status"]>(["in-progress", "decided"])

interface Metric {
  value: number
  label: string
  /** Emphasis colour applied only when the metric is non-zero and worth noticing. */
  tone: "neutral" | "attention" | "risk"
}

function computeHealth(decisions: Decision[], now: number): Metric[] {
  const open = decisions.filter((d) => OPEN.has(d.status)).length

  const needsReview = decisions.filter(
    (d) => d.revisitAt && !d.review?.completedAt && new Date(d.revisitAt).getTime() <= now
  ).length

  const unresolvedRisk = decisions.filter(
    (d) =>
      LIVE.has(d.status) &&
      (d.riskLevel === "high" ||
        d.riskLevel === "critical" ||
        d.risks.some((r) => r.severity >= HIGH_RISK_SEVERITY))
  ).length

  return [
    { value: open, label: open === 1 ? "open decision" : "open decisions", tone: "neutral" },
    { value: needsReview, label: needsReview === 1 ? "needs review" : "need review", tone: "attention" },
    { value: unresolvedRisk, label: unresolvedRisk === 1 ? "unresolved risk" : "unresolved risks", tone: "risk" },
  ]
}

const TONE_CLASS: Record<Metric["tone"], string> = {
  neutral: "text-white/85",
  attention: "text-warning",
  risk: "text-destructive",
}

export function DecisionHealth({ decisions }: { decisions: Decision[] }) {
  const now = useNow()
  const metrics = useMemo(
    () => (now == null ? null : computeHealth(decisions, now)),
    [decisions, now]
  )

  if (!metrics) {
    return <div aria-hidden className="h-[68px] rounded-xl border border-white/[0.06] bg-white/[0.015]" />
  }

  return (
    <section
      aria-label="Decision health"
      className="grid grid-cols-3 divide-x divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015]"
    >
      {metrics.map((m) => (
        <div key={m.label} className="flex flex-col gap-0.5 px-5 py-4">
          <span
            className={cn(
              "font-mono text-2xl tabular-nums",
              m.value === 0 ? "text-white/35" : TONE_CLASS[m.tone]
            )}
          >
            {m.value}
          </span>
          <span className="text-xs text-white/45">{m.label}</span>
        </div>
      ))}
    </section>
  )
}
