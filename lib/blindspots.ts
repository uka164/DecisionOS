import type { Decision } from "./types"

export type BlindSpotSeverity = "info" | "warn" | "critical"

export interface BlindSpot {
  id: string
  severity: BlindSpotSeverity
  title: string
  description: string
  why: string
  suggestion: string
  affectedIds: string[]
}

export interface BlindSpotRule {
  id: string
  detect: (decisions: Decision[], now: number) => BlindSpot | null
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

export const HIGH_IMPACT_THRESHOLD = 4
export const HIGH_RISK_SEVERITY = 70
export const STALE_IN_PROGRESS_MS = 14 * 24 * 60 * 60 * 1000
export const REACTIVE_TIME_PCT = 50
export const REACTIVE_MIN_DECISIONS = 4
export const ROLLBACK_KEYWORDS = ["rollback", "fallback", "revert", "exit", "undo"] as const
export const REACTIVE_CONSTRAINT = "time"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasHumanFrame(d: Decision): boolean {
  return Boolean(
    d.valuesAtStake?.trim() ||
    d.humanCost?.trim() ||
    d.guidingPrinciple?.trim()
  )
}

function hasExitPath(d: Decision): boolean {
  const corpus = [d.rawThinking, d.preMortem, d.guidingPrinciple, d.summary]
    .filter((t): t is string => Boolean(t?.trim()))
    .join(" ")
    .toLowerCase()
  return ROLLBACK_KEYWORDS.some((kw) => corpus.includes(kw))
}

function isOpenStatus(d: Decision): boolean {
  return d.status === "draft" || d.status === "in-progress"
}

// ─── Rules ────────────────────────────────────────────────────────────────────

const noHumanFrameOnHighImpact: BlindSpotRule = {
  id: "no-human-frame-high-impact",
  detect: (decisions) => {
    const affected = decisions.filter(
      (d) => d.impact >= HIGH_IMPACT_THRESHOLD && !hasHumanFrame(d) && d.status !== "voided"
    )
    if (affected.length === 0) return null
    return {
      id: "no-human-frame-high-impact",
      severity: "warn",
      title: "Human cost missing",
      description: `${affected.length} high-impact decision${affected.length === 1 ? "" : "s"} do not name values, people affected, or a guiding principle.`,
      why: "Impact lands on people, not spreadsheets. Skipping this is how decisions look smart and feel wrong.",
      suggestion: "Open each and answer one of: who pays if this is wrong, what value is at stake, what rule must still hold.",
      affectedIds: affected.map((d) => d.id),
    }
  },
}

const noRevisitOnHighImpact: BlindSpotRule = {
  id: "no-revisit-high-impact",
  detect: (decisions) => {
    const affected = decisions.filter(
      (d) =>
        d.impact >= HIGH_IMPACT_THRESHOLD &&
        !d.revisitAt &&
        d.status !== "archived" &&
        d.status !== "voided"
    )
    if (affected.length === 0) return null
    return {
      id: "no-revisit-high-impact",
      severity: "warn",
      title: "No learning loop",
      description: `${affected.length} high-impact decision${affected.length === 1 ? " has" : "s have"} no revisit date — no scheduled honest check-in.`,
      why: "If you do not pre-commit to looking back, you will not. The lesson stays trapped in the rationalisation.",
      suggestion: "Set a revisit date 30–90 days out. Even a wrong date is better than none.",
      affectedIds: affected.map((d) => d.id),
    }
  },
}

const highRiskNoPreMortem: BlindSpotRule = {
  id: "high-risk-no-premortem",
  detect: (decisions) => {
    const affected = decisions.filter((d) => {
      const accepted = d.status === "decided" || d.status === "in-progress"
      const hasHighRisk =
        d.riskLevel === "high" ||
        d.riskLevel === "critical" ||
        d.risks.some((r) => r.severity >= HIGH_RISK_SEVERITY)
      return accepted && hasHighRisk && !d.preMortem?.trim()
    })
    if (affected.length === 0) return null
    return {
      id: "high-risk-no-premortem",
      severity: "critical",
      title: "Risk accepted without a failure story",
      description: `${affected.length} decision${affected.length === 1 ? "" : "s"} carry high-severity risk with no pre-mortem written.`,
      why: "Naming the risk is not the same as imagining the failure. Without a failure story, the brain treats the risk as theoretical.",
      suggestion: "Write one paragraph: 'It is six months later and this failed. Why?'",
      affectedIds: affected.map((d) => d.id),
    }
  },
}

const tunnelVision: BlindSpotRule = {
  id: "tunnel-vision",
  detect: (decisions) => {
    const affected = decisions.filter((d) => {
      const realOptions = d.options.filter((o) => o.title.trim().length > 0)
      return realOptions.length < 2 && d.status !== "voided" && d.status !== "archived"
    })
    if (affected.length === 0) return null
    return {
      id: "tunnel-vision",
      severity: "warn",
      title: "Tunnel vision",
      description: `${affected.length} decision${affected.length === 1 ? "" : "s"} have fewer than two real options on record.`,
      why: "A single-option decision is rarely a decision — it is a justification. The alternative you did not write down is the one you did not consider.",
      suggestion: "Add at least one genuine alternative — even 'do nothing' counts when it is honest.",
      affectedIds: affected.map((d) => d.id),
    }
  },
}

const regretWithoutLearning: BlindSpotRule = {
  id: "regret-without-learning",
  detect: (decisions) => {
    const affected = decisions.filter((d) => {
      const hasReviewLesson = d.review?.lesson?.trim() || d.review?.wrongAssumption?.trim()
      return d.regret === true && !d.gotWrong?.trim() && !hasReviewLesson
    })
    if (affected.length === 0) return null
    return {
      id: "regret-without-learning",
      severity: "critical",
      title: "Avoided learning",
      description: `${affected.length} regret-marked decision${affected.length === 1 ? "" : "s"} have no 'what I got wrong' note or review lesson.`,
      why: "Marking regret without naming what was wrong is performance, not learning. The pattern repeats.",
      suggestion: "Open each and write the one sentence you do not want to write.",
      affectedIds: affected.map((d) => d.id),
    }
  },
}

const reactivePattern: BlindSpotRule = {
  id: "reactive-time-pattern",
  detect: (decisions) => {
    if (decisions.length < REACTIVE_MIN_DECISIONS) return null
    const withTime = decisions.filter((d) =>
      d.constraints.some((c) => c.toLowerCase().trim() === REACTIVE_CONSTRAINT)
    )
    if (withTime.length === 0) return null
    const pct = (withTime.length / decisions.length) * 100
    if (pct < REACTIVE_TIME_PCT) return null
    return {
      id: "reactive-time-pattern",
      severity: "info",
      title: "Reactive decision pattern",
      description: `'Time' is a constraint on ${Math.round(pct)}% of your decisions.`,
      why: "When every decision is time-pressured, the cause is rarely time — it is upstream planning. The fire is downstream of the leak.",
      suggestion: "Look at the next two decisions on this list and ask what would have to be true for time not to be the constraint.",
      affectedIds: withTime.map((d) => d.id),
    }
  },
}

const noExitPath: BlindSpotRule = {
  id: "no-exit-path",
  detect: (decisions) => {
    const affected = decisions.filter(
      (d) =>
        d.impact >= HIGH_IMPACT_THRESHOLD &&
        d.rawThinking?.trim().length > 0 &&
        !hasExitPath(d) &&
        d.status !== "voided"
    )
    if (affected.length === 0) return null
    return {
      id: "no-exit-path",
      severity: "warn",
      title: "No exit path",
      description: `${affected.length} high-impact decision${affected.length === 1 ? "" : "s"} contain no rollback, fallback, revert, or undo language.`,
      why: "A decision you cannot reverse is a one-way door. If you have not described how to walk back, you are betting the rationale will hold up under every future condition.",
      suggestion: "Write one sentence: 'If this fails, the way out is …'.",
      affectedIds: affected.map((d) => d.id),
    }
  },
}

const unclosedLoop: BlindSpotRule = {
  id: "unclosed-loop",
  detect: (decisions, now) => {
    const affected = decisions.filter(
      (d) =>
        isOpenStatus(d) &&
        now - new Date(d.updatedAt ?? d.createdAt).getTime() > STALE_IN_PROGRESS_MS
    )
    if (affected.length === 0) return null
    return {
      id: "unclosed-loop",
      severity: "info",
      title: "Unclosed loop",
      description: `${affected.length} decision${affected.length === 1 ? " has" : "s have"} been open for more than 14 days without an update.`,
      why: "An in-progress decision that does not move is usually decided in practice but not on paper. The record lies by omission.",
      suggestion: "For each: mark it decided, void it, or write one line on why it is genuinely still moving.",
      affectedIds: affected.map((d) => d.id),
    }
  },
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const BLIND_SPOT_RULES: ReadonlyArray<BlindSpotRule> = [
  noHumanFrameOnHighImpact,
  noRevisitOnHighImpact,
  highRiskNoPreMortem,
  tunnelVision,
  regretWithoutLearning,
  reactivePattern,
  noExitPath,
  unclosedLoop,
]

const SEVERITY_ORDER: Record<BlindSpotSeverity, number> = {
  critical: 0,
  warn: 1,
  info: 2,
}

/**
 * Run every blind-spot rule against the current decision set.
 * Returns blind spots sorted by severity (critical first) then by affected count.
 * Static example decisions are excluded so the user sees their own pattern, not the demo's.
 */
export function detectBlindSpots(decisions: Decision[], now: number): BlindSpot[] {
  const userDecisions = decisions.filter((d) => !d.id.startsWith("static-"))
  if (userDecisions.length === 0) return []

  const found: BlindSpot[] = []
  for (const rule of BLIND_SPOT_RULES) {
    const result = rule.detect(userDecisions, now)
    if (result) found.push(result)
  }

  return found.sort((a, b) => {
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (sev !== 0) return sev
    return b.affectedIds.length - a.affectedIds.length
  })
}
