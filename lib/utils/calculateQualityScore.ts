import type { Decision, RiskLevel } from "@/lib/types"

export interface QualityInput {
  options?: { title: string; description: string }[]
  preMortem?: string
  riskLevel?: RiskLevel | null
  retrospective?: string
  title?: string
  rawThinking?: string
  constraints?: string[]
}

export interface QualitySignal {
  id: string
  label: string
  points: number
  earned: boolean
  guidance: string
}

export const QUALITY_SIGNAL_MAX = 100

export function getQualitySignals(input: QualityInput): QualitySignal[] {
  return [
    {
      id: "title",
      label: "Clear title",
      points: 15,
      earned: (input.title?.trim().length ?? 0) > 5,
      guidance: "Name the decision in one specific sentence.",
    },
    {
      id: "context",
      label: "Decision context",
      points: 15,
      earned: (input.rawThinking?.trim().length ?? 0) > 50,
      guidance: "Add enough context for future-you to understand why it mattered.",
    },
    {
      id: "options",
      label: "At least two options",
      points: 15,
      earned: (input.options?.filter((option) => option.title.trim().length > 0).length ?? 0) >= 2,
      guidance: "Compare at least two realistic paths.",
    },
    {
      id: "premortem",
      label: "Pre-mortem",
      points: 20,
      earned: (input.preMortem?.trim().length ?? 0) > 10,
      guidance: "Write what could make this decision fail.",
    },
    {
      id: "risk",
      label: "Risk level",
      points: 10,
      earned: input.riskLevel != null,
      guidance: "Assign the highest expected risk.",
    },
    {
      id: "constraints",
      label: "Constraints",
      points: 10,
      earned: (input.constraints?.length ?? 0) > 0,
      guidance: "Capture limiting factors such as time, budget, security, or scale.",
    },
    {
      id: "retrospective",
      label: "Retrospective",
      points: 15,
      earned: (input.retrospective?.trim().length ?? 0) > 10,
      guidance: "Close the loop after the outcome is known.",
    },
  ]
}

export function getQualityBreakdown(input: QualityInput) {
  const signals = getQualitySignals(input)
  const score = signals.reduce((total, signal) => total + (signal.earned ? signal.points : 0), 0)

  return {
    score: Math.min(QUALITY_SIGNAL_MAX, score),
    earned: signals.filter((signal) => signal.earned),
    missing: signals.filter((signal) => !signal.earned),
    signals,
  }
}

export function getQualityBreakdownFromDecision(decision: Partial<Decision>) {
  const reflectionText = [
    decision.rawThinking,
    decision.valuesAtStake,
    decision.humanCost,
    decision.guidingPrinciple,
  ].filter((text) => text?.trim()).join("\n")

  // The structured `review` is the current source of truth; legacy `retrospective`
  // is kept as a fallback. Either one satisfies the "closed the loop" signal.
  const closedLoop =
    decision.retrospective ?? decision.review?.lesson ?? decision.review?.whatHappened

  return getQualityBreakdown({
    options: decision.options,
    preMortem: decision.preMortem,
    riskLevel: decision.riskLevel,
    retrospective: closedLoop,
    title: decision.title,
    rawThinking: reflectionText,
    constraints: decision.constraints,
  })
}

export function calculateQualityScore(input: QualityInput): number {
  return getQualityBreakdown(input).score
}

export function calculateQualityScoreFromDecision(decision: Partial<Decision>): number {
  return getQualityBreakdownFromDecision(decision).score
}
