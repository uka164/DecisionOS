import type { Decision } from "./types"
import { detectBlindSpots, type BlindSpotSeverity } from "./blindspots"
import { generateInsights, type InsightType } from "./insights"

/**
 * Signals are the single, calm attention surface of the app. They unify the
 * older Blind Spots + Reflection Prompts into one sparse, severity-ranked list.
 *
 * Design intent (deliberate restraint):
 *  - A signal only exists when something genuinely deserves attention.
 *  - Overlapping observations are deduped by topic so the user never sees the
 *    same concern twice under two different names.
 *  - Severity maps to semantic colour, not decoration.
 */

export type SignalSeverity = "critical" | "attention" | "info"

export interface Signal {
  id: string
  severity: SignalSeverity
  /** Short, plain title. */
  title: string
  /** One calm sentence: the why / the evidence. Kept for older consumers. */
  detail: string
  /** Why this deserves attention. */
  reason: string
  /** The concrete evidence behind the signal. */
  evidence: string
  /** Optional, quieter line: what to do about it. */
  suggestion?: string
  suggestedAction?: string
  /** How many decisions this touches (>= 1). Surfaced as quiet context. */
  count: number
  linkedDecisionId?: string
  action?: { label: string; href: string }
}

const BLINDSPOT_SEVERITY: Record<BlindSpotSeverity, SignalSeverity> = {
  critical: "critical",
  warn: "attention",
  info: "info",
}

// Insights are softer, aggregate observations — never "critical".
const INSIGHT_SEVERITY: Record<InsightType, SignalSeverity> = {
  warning: "attention",
  action: "attention",
  info: "info",
  pattern: "info",
}

/**
 * Topic keys let a blind spot and an insight that describe the same underlying
 * concern collapse into one signal. Blind spots win (they are richer and
 * decision-specific); a same-topic insight is dropped.
 */
function blindSpotTopic(id: string): string {
  switch (id) {
    case "no-human-frame-high-impact": return "human-frame"
    case "no-revisit-high-impact":     return "revisit"
    case "high-risk-no-premortem":     return "risk"
    case "tunnel-vision":              return "options"
    case "regret-without-learning":    return "regret"
    case "reactive-time-pattern":      return "constraint"
    case "no-exit-path":               return "rollback"
    case "unclosed-loop":              return "stale"
    case "execution-stalled":          return "execution"
    default:                           return id
  }
}

function insightTopic(id: string): string {
  switch (id) {
    case "rollback-omission":      return "rollback"
    case "human-frame-omission":   return "human-frame"
    case "risk-quality-blindspot": return "risk"
    case "decision-aging":         return "stale"
    case "constraint-clustering":  return "constraint"
    default:                       return id
  }
}

const SEVERITY_ORDER: Record<SignalSeverity, number> = {
  critical: 0,
  attention: 1,
  info: 2,
}

/**
 * Build the unified, deduped, severity-sorted signal list.
 * Static example decisions are excluded upstream by detectBlindSpots, so the
 * calm (empty) state is always reachable for a real, well-tended decision set.
 */
export function generateSignals(decisions: Decision[], now: number): Signal[] {
  const signals: Signal[] = []
  const seenTopics = new Set<string>()

  for (const bs of detectBlindSpots(decisions, now)) {
    seenTopics.add(blindSpotTopic(bs.id))
    const firstAffected = bs.affectedIds[0]
    signals.push({
      id: bs.id,
      severity: BLINDSPOT_SEVERITY[bs.severity],
      title: bs.title,
      detail: bs.description,
      reason: bs.why,
      evidence: bs.description,
      suggestion: bs.suggestion,
      suggestedAction: bs.suggestion,
      count: bs.affectedIds.length,
      linkedDecisionId: firstAffected,
      action: firstAffected
        ? { label: "Open decision", href: `/decisions/${firstAffected}` }
        : undefined,
    })
  }

  const userDecisions = decisions.filter((d) => !d.id.startsWith("static-"))
  const insights = generateInsights(userDecisions, now) ?? []
  for (const ins of insights) {
    const topic = insightTopic(ins.id)
    if (seenTopics.has(topic)) continue
    seenTopics.add(topic)
    signals.push({
      id: `insight-${ins.id}`,
      severity: INSIGHT_SEVERITY[ins.type],
      title: ins.title,
      detail: ins.description,
      reason: ins.description,
      evidence: ins.metric,
      count: 1,
      action: ins.action,
    })
  }

  return signals.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.count - a.count
  )
}
