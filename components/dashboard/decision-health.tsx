"use client"

import { useMemo } from "react"
import { useNow } from "@/hooks/useNow"
import { cn } from "@/lib/utils"
import type { Decision } from "@/lib/types"

const HIGH_RISK_SEVERITY = 70
const LIVE = new Set<Decision["status"]>(["in-progress", "decided"])

interface Metric {
  value: number
  label: string
  help: string
  /** Emphasis colour applied only when the metric is non-zero and worth noticing. */
  tone: "neutral" | "attention" | "risk" | "aligned"
}

function computeHealth(decisions: Decision[], now: number): Metric[] {
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

  const executionGaps = decisions.filter((d) => {
    if (!LIVE.has(d.status)) return false
    const trail = d.executionTrail ?? []
    return trail.length === 0 || trail.every((step) => !step.done)
  }).length

  return [
    { value: needsReview, label: "revisit health", help: "due now", tone: needsReview > 0 ? "attention" : "aligned" },
    { value: unresolvedRisk, label: "unresolved risk", help: "live decisions", tone: "risk" },
    { value: executionGaps, label: "execution gaps", help: "missing first move", tone: "neutral" },
  ]
}

const TONE_CLASS: Record<Metric["tone"], string> = {
  neutral: "text-white/85",
  attention: "text-warning",
  risk: "text-destructive",
  aligned: "text-success",
}

export function DecisionHealth({ decisions }: { decisions: Decision[] }) {
  const now = useNow()
  const metrics = useMemo(
    () => (now == null ? null : computeHealth(decisions, now)),
    [decisions, now]
  )

  if (!metrics) {
    return <div aria-hidden className="h-[88px] rounded-lg border border-white/[0.06] bg-white/[0.015]" />
  }

  return (
    <section aria-label="Decision health" className="rounded-lg border border-white/[0.06] bg-white/[0.015]">
      <div className="border-b border-white/[0.05] px-5 py-3">
        <h2 className="font-mono text-xs uppercase text-white/40">Decision Health</h2>
      </div>
      <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col gap-0.5 px-5 py-4">
            <span
              className={cn(
                "font-mono text-2xl tabular-nums",
                m.value === 0 && m.tone !== "aligned" ? "text-white/35" : TONE_CLASS[m.tone]
              )}
            >
              {m.value}
            </span>
            <span className="text-xs font-medium text-white/55">{m.label}</span>
            <span className="text-[11px] text-white/30">{m.value === 0 ? "clear" : m.help}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
