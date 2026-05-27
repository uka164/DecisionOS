import type { Decision } from "./types"

export type InsightType = "warning" | "info" | "action" | "pattern"

export interface Insight {
  id: string
  type: InsightType
  title: string
  description: string
  metric: string
  action?: { label: string; href: string }
}

// ─── Threshold constants ──────────────────────────────────────────────────────

const MIN_DECISIONS = 5
const HIGH_IMPACT_THRESHOLD = 4
const ROLLBACK_OMISSION_PCT = 40
const HIGH_RISK_SEVERITY = 70
const LOW_QUALITY_SCORE = 60
const RISK_QUALITY_COUNT = 3
const AGING_MS = 7 * 24 * 60 * 60 * 1000
const CONSTRAINT_CLUSTER_PCT = 40

const ROLLBACK_KEYWORDS = ["rollback", "fallback", "revert"] as const

// ─── Metric functions ─────────────────────────────────────────────────────────

function checkRollbackOmission(decisions: Decision[]): Insight | null {
  const pool = decisions.filter(
    (d) => d.impact >= HIGH_IMPACT_THRESHOLD && d.rawThinking?.trim().length > 0
  )
  if (pool.length === 0) return null

  const missing = pool.filter((d) => {
    const text = d.rawThinking.toLowerCase()
    return !ROLLBACK_KEYWORDS.some((kw) => text.includes(kw))
  })

  const pct = (missing.length / pool.length) * 100
  if (pct <= ROLLBACK_OMISSION_PCT) return null

  return {
    id: "rollback-omission",
    type: "warning",
    title: "Rollback planning gap",
    description: `${Math.round(pct)}% of high-impact decisions lack rollback, fallback, or revert language in raw thinking.`,
    metric: `${missing.length} / ${pool.length}`,
    action: { label: "Review decisions", href: "/decisions?status=in-progress" },
  }
}

function checkRiskQualityBlindspot(decisions: Decision[]): Insight | null {
  const count = decisions.filter(
    (d) =>
      d.risks.some((r) => r.severity >= HIGH_RISK_SEVERITY) &&
      d.qualityScore < LOW_QUALITY_SCORE
  ).length

  if (count < RISK_QUALITY_COUNT) return null

  return {
    id: "risk-quality-blindspot",
    type: "info",
    title: "High risk, low quality",
    description: `${count} decisions carry high-severity risks but scored below ${LOW_QUALITY_SCORE} on quality. Documentation may need strengthening.`,
    metric: `${count} decisions`,
    action: { label: "Open decisions", href: "/decisions" },
  }
}

function checkDecisionAging(decisions: Decision[], now: number): Insight | null {
  const stale = decisions.filter(
    (d) =>
      d.status === "in-progress" &&
      now - new Date(d.updatedAt ?? d.createdAt).getTime() > AGING_MS
  )

  if (stale.length === 0) return null

  return {
    id: "decision-aging",
    type: "action",
    title: "Stale in-progress decisions",
    description: `${stale.length} decision${stale.length !== 1 ? "s" : ""} ${stale.length !== 1 ? "have" : "has"} been in-progress for over 7 days without an update.`,
    metric: `${stale.length} stale`,
    action: { label: "Review now", href: "/decisions?status=in-progress" },
  }
}

function checkConstraintClustering(decisions: Decision[]): Insight | null {
  const allConstraints = decisions.flatMap((d) => d.constraints)
  if (allConstraints.length === 0) return null

  const freq = new Map<string, number>()
  for (const c of allConstraints) {
    const key = c.toLowerCase().trim()
    if (key) freq.set(key, (freq.get(key) ?? 0) + 1)
  }

  let topTag = ""
  let topCount = 0
  for (const [tag, count] of freq) {
    if (count > topCount) {
      topTag = tag
      topCount = count
    }
  }

  if (!topTag) return null

  const pct = (topCount / allConstraints.length) * 100
  if (pct < CONSTRAINT_CLUSTER_PCT) return null

  return {
    id: "constraint-clustering",
    type: "pattern",
    title: "Dominant constraint pattern",
    description: `"${topTag}" appears in ${Math.round(pct)}% of all constraint tags — a recurring blocker across decisions.`,
    metric: `${topCount} occurrences`,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateInsights(decisions: Decision[], now: number): Insight[] | null {
  if (decisions.length < MIN_DECISIONS) return null

  const results = [
    checkRollbackOmission(decisions),
    checkRiskQualityBlindspot(decisions),
    checkDecisionAging(decisions, now),
    checkConstraintClustering(decisions),
  ]

  return results.filter((insight): insight is Insight => insight !== null)
}
