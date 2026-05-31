export type DecisionStatus =
  | "draft"
  | "in-progress"
  | "decided"
  | "archived"
  | "voided"
  | "superseded"

export type RiskLevel = "low" | "medium" | "high" | "critical"

export type BadgeType = "default" | "purple" | "amber" | "emerald" | "rose"

export interface TradeoffAxis {
  axis: string
  value: number
}

export interface DecisionBadge {
  label: string
  type: BadgeType
}

export interface RFCData {
  title: string
  context: string
  proposal: string
  tradeoffs: string
  decision: string
}

export interface DecisionOption {
  title: string
  description: string
}

export interface DecisionRisk {
  text: string
  /** 0–100 */
  severity: number
}

export type ReviewOutcome = "good" | "mixed" | "bad"
export type ReviewProcessQuality = "good" | "mixed" | "poor"
export type ReviewVerdict = "same-again" | "different" | "unsure"

/**
 * A structured, honest review of a decision after the fact.
 * Outcome (what happened) is intentionally separate from process quality
 * (how the decision was made). A good decision can have a bad outcome,
 * and a bad decision can get lucky.
 */
export interface DecisionReview {
  whatHappened?: string
  originalAssumption?: string
  wrongAssumption?: string
  underestimated?: string
  overestimated?: string
  sameAgain?: ReviewVerdict
  lesson?: string
  outcome?: ReviewOutcome
  processQuality?: ReviewProcessQuality
  completedAt?: string
}

/**
 * A single concrete step in a decision's execution trail — the bridge between
 * deciding and doing. Lives on the decision so "decided" never silently means
 * "done".
 */
export interface ExecutionStep {
  id: string
  text: string
  done: boolean
  createdAt: string
  doneAt?: string
}

export interface Decision {
  id: string
  title: string
  status: DecisionStatus
  createdAt: string
  updatedAt?: string
  impact: number
  qualityScore: number
  tags: string[]
  rawThinking: string
  valuesAtStake?: string
  humanCost?: string
  guidingPrinciple?: string
  tradeoffs: TradeoffAxis[]
  riskLevel: RiskLevel | null
  badges: DecisionBadge[]
  metric?: string
  metricLabel?: string
  metricColor?: string
  rfcData?: RFCData
  options: DecisionOption[]
  preMortem?: string
  retrospective?: string
  constraints: string[]
  risks: DecisionRisk[]
  echoTargets?: string[]
  summary?: string
  experiments?: string[]
  regret?: boolean
  revisitAt?: string
  gotWrong?: string
  review?: DecisionReview
  executionTrail?: ExecutionStep[]
  aiCritique?: AICritique
  comments?: DecisionComment[]
}

/**
 * A comment on a decision — the thing that turns a solo journal entry into a
 * conversation. Synced through the durable store, so on a shared/self-hosted
 * instance several people can weigh in on the same decision. `author` is the
 * commenter's display name at the time of writing (no accounts yet).
 */
export interface DecisionComment {
  id: string
  author: string
  text: string
  createdAt: string
  /** Optional: this comment answers the AI's decisive question. */
  answersDecisiveQuestion?: boolean
}

/**
 * Output of the AI reasoning critique — an Opus/Sonnet pass that reads a
 * decision's reasoning and pushes back on it. Persisted on the decision so it
 * survives a return visit. This is the "intelligence" in decision intelligence:
 * not keyword rules, an actual model reading the argument.
 */
export type AICritiqueSeverity = "low" | "medium" | "high"

export interface AICritiqueBlindSpot {
  title: string
  detail: string
  severity: AICritiqueSeverity
}

export interface AICritique {
  /** Model id that produced this critique, e.g. claude-opus-4-8 */
  model: string
  createdAt: string
  /** One honest line: does the reasoning hold up? */
  verdict: string
  /** 0–100 — how well the reasoning withstands scrutiny. */
  reasoningConfidence: number
  /** The single strongest argument against this decision. */
  strongestCounter: string
  /** Things the decider is treating as fact without saying so. */
  unstatedAssumptions: string[]
  /** Specific gaps in the reasoning, most serious first. */
  blindSpots: AICritiqueBlindSpot[]
  /** The best case for the path NOT chosen. */
  steelmanAlternative: string
  /** The one question that should change their mind. */
  decisiveQuestion: string
  /** Length of the reasoning text the critique was based on — used to flag
   *  when the decision has materially changed since the critique ran. */
  sourceChars: number
}

export type ExperimentStatus = "active" | "paused" | "concluded"

export interface ExperimentHypothesis {
  metric: string
  expected: number
  unit: string
  rationale: string
}

export interface ExperimentResult {
  actual: number | null
  trend: number[]
  startDate: string
  endDate?: string
}

export interface ObservationEntry {
  text: string
  timestamp: number
}

export interface Experiment {
  id: string
  number: number
  title: string
  status: ExperimentStatus
  hypothesis: ExperimentHypothesis
  result: ExperimentResult
  confidenceInterval: number
  decisionId?: string
  observations?: ObservationEntry[]
  createdAt?: string
  updatedAt?: string
}

export interface AppSettings {
  theme: "void" | "midnight" | "twilight" | "dawn"
  reducedMotion: boolean
  animationIntensity: number
  ambientMotion: boolean
  notifyRevisits: boolean
  /** Display name attached to your comments. Device-local — never synced, so
   *  each person on a shared instance keeps their own identity. */
  displayName?: string
}

/** What syncs to the durable server store: shared content only, not device
 *  preferences. Settings (theme, identity, motion) stay local to each device. */
export interface RemoteSnapshot {
  decisions: Decision[]
  experiments: Experiment[]
  hiddenStaticDecisionIds: string[]
  /** ISO timestamp of the last write that produced this snapshot. */
  updatedAt: string
}

export interface StoreState {
  decisions: Decision[]
  experiments: Experiment[]
  settings: AppSettings
  lastSynced: string | null
  hiddenStaticDecisionIds: string[]
}
