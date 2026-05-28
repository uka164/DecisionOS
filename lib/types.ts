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
}

export interface StoreState {
  decisions: Decision[]
  experiments: Experiment[]
  settings: AppSettings
  lastSynced: string | null
  hiddenStaticDecisionIds: string[]
}
