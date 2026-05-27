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
}

export interface StoreState {
  decisions: Decision[]
  experiments: Experiment[]
  settings: AppSettings
  lastSynced: string | null
  hiddenStaticDecisionIds: string[]
}
