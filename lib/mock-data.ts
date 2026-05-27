import type { Decision, Experiment } from "./types"
import { calculateQualityScoreFromDecision } from "./utils/calculateQualityScore"
export { calculateQualityScoreFromDecision as calculateQualityScore }

export const STATIC_DECISIONS: Decision[] = [
  {
    id: "static-d1",
    title: "Rewrite auth or patch it again?",
    status: "in-progress",
    createdAt: "2026-04-07T09:00:00.000Z",
    impact: 4,
    qualityScore: 30,
    tags: ["AUTH", "ARCH"],
    rawThinking:
      "// been patching this for 6 months\n// every sprint there's another edge case\n// full rewrite would take 3-4 weeks but we'd actually sleep at night\n// patch again = faster but i hate it",
    tradeoffs: [
      { axis: "Speed", value: 35 },
      { axis: "Stability", value: 80 },
      { axis: "Cost", value: 40 },
      { axis: "DevEx", value: 85 },
    ],
    riskLevel: "high",
    badges: [],
    options: [
      {
        title: "Full rewrite",
        description: "3-4 weeks. Clean slate. JWT refresh done properly.",
      },
      {
        title: "Patch again",
        description: "1 day. Ship the fix. Repeat in 2 months.",
      },
    ],
    constraints: ["Time", "Tech Debt"],
    risks: [
      { text: "Rewrite delays other roadmap items by a sprint", severity: 72 },
    ],
  },
  {
    id: "static-d2",
    title: "Chose MongoDB over Postgres for user events",
    status: "decided",
    createdAt: "2025-11-15T14:00:00.000Z",
    impact: 5,
    qualityScore: 55,
    tags: ["DB", "ARCH"],
    rawThinking:
      "// events are document-shaped, no clear schema yet\n// mongodb seems like a good fit\n// team has some experience with it\n// postgres felt like overkill for unstructured data at the time",
    tradeoffs: [
      { axis: "Flexibility", value: 85 },
      { axis: "Query power", value: 30 },
      { axis: "Speed", value: 70 },
      { axis: "DevEx", value: 50 },
    ],
    riskLevel: "high",
    badges: [],
    options: [
      {
        title: "MongoDB",
        description: "Flexible schema, document model, easy to start",
      },
      {
        title: "PostgreSQL",
        description: "JSONB support, strong query engine, ACID",
      },
    ],
    preMortem: "If query patterns change or we need joins, MongoDB aggregation pipeline could become a bottleneck.",
    retrospective:
      "Six months in, we're fighting the schema constantly. The reporting dashboard queries are slow. MongoDB aggregation is painful. We're now planning a migration to Postgres.",
    constraints: ["Flexibility", "Time"],
    risks: [
      { text: "Aggregation pipeline complexity if query needs grow", severity: 80 },
      { text: "No foreign key constraints means inconsistent references", severity: 65 },
    ],
    regret: true,
    gotWrong:
      "Underestimated how quickly query patterns would evolve. The flexible schema that seemed like a feature became a liability as soon as we needed reporting. Should have used Postgres with JSONB from day one.",
    summary: "Chose MongoDB for user event storage. Regretting it now — migration to Postgres is planned.",
  },
  {
    id: "static-d3",
    title: "Build search in-house or buy Algolia?",
    status: "in-progress",
    createdAt: "2026-05-06T11:00:00.000Z",
    impact: 3,
    qualityScore: 45,
    tags: ["SEARCH", "BUILD-VS-BUY"],
    rawThinking:
      "// algolia costs ~$500/mo at our scale, not crazy\n// building ourselves: probably 2 weeks minimum, then ongoing maintenance\n// main concern: search quality — algolia has typo tolerance, ranking etc out of the box\n// could use postgres full text for now and revisit later?\n// decision: marked for revisit by EOD 24th May",
    tradeoffs: [
      { axis: "Cost", value: 40 },
      { axis: "Speed", value: 75 },
      { axis: "Control", value: 60 },
      { axis: "Quality", value: 30 },
    ],
    riskLevel: "medium",
    badges: [],
    options: [
      {
        title: "Algolia",
        description: "Instant results, typo tolerance, good DX, $500/mo",
      },
      {
        title: "Build with Postgres FTS",
        description: "Zero cost, good enough for now, 2 weeks work",
      },
    ],
    constraints: ["Budget", "Time"],
    risks: [
      { text: "Algolia lock-in if we grow dependent on their ranking", severity: 55 },
      { text: "Home-built search quality disappoints users", severity: 60 },
    ],
    revisitAt: "2026-05-24",
  },
  {
    id: "static-d4",
    title: "Remote-first hiring for next 3 engineers",
    status: "decided",
    createdAt: "2026-03-20T10:00:00.000Z",
    impact: 3,
    qualityScore: 68,
    tags: ["TEAM", "HIRING"],
    rawThinking:
      "// local hiring pool is thin for our stack\n// remote opens up the talent pool massively\n// salary delta: local ~120k, remote (latam/eastern eu) ~70-80k, similar output\n// timezone: max 5hr overlap is workable if we're async-first\n// concern: onboarding is harder remote, but we've done it before",
    tradeoffs: [
      { axis: "Talent pool", value: 95 },
      { axis: "Cost", value: 80 },
      { axis: "Collaboration", value: 50 },
      { axis: "Culture", value: 60 },
    ],
    riskLevel: "low",
    badges: [],
    options: [
      {
        title: "Remote-first (global)",
        description: "Hire from anywhere, max timezone overlap ±5hr",
      },
      {
        title: "Local / hybrid only",
        description: "Same city or region, easier collaboration, smaller pool",
      },
    ],
    preMortem: "Cultural misalignment or timezone friction could slow onboarding and reduce team cohesion.",
    constraints: ["Budget", "Team"],
    risks: [
      { text: "Timezone gaps causing delayed feedback loops", severity: 40 },
      { text: "Onboarding quality suffers without in-person time", severity: 45 },
    ],
    summary: "Going remote-first for next 3 hires. Review after Q3 to assess team health and onboarding quality.",
    revisitAt: "2026-08-25",
  },
  {
    id: "static-d5",
    title: "Upgrade to Next.js 15 now or wait?",
    status: "draft",
    createdAt: "2026-05-25T16:00:00.000Z",
    impact: 2,
    qualityScore: 10,
    tags: ["FRONTEND"],
    rawThinking: "probably should wait but feeling the fomo",
    tradeoffs: [],
    riskLevel: null,
    badges: [],
    options: [],
    constraints: [],
    risks: [],
  },
]

export const STATIC_EXPERIMENTS: Experiment[] = [
  {
    id: "exp1",
    number: 4,
    title: "Postgres FTS vs Algolia relevance",
    status: "active",
    hypothesis: {
      metric: "Search success rate",
      expected: 80,
      unit: "%",
      rationale:
        "If Postgres FTS achieves 80%+ user search success (user clicks a result), we skip Algolia entirely.",
    },
    result: {
      actual: 67,
      trend: [55, 60, 63, 67],
      startDate: "2026-05-08",
    },
    confidenceInterval: 72,
    decisionId: "static-d3",
  },
  {
    id: "exp2",
    number: 5,
    title: "Async onboarding vs sync pairing",
    status: "active",
    hypothesis: {
      metric: "Time to first PR",
      expected: 3,
      unit: " days",
      rationale:
        "Structured async onboarding doc should get new remote hire to first PR in under 3 days.",
    },
    result: {
      actual: null,
      trend: [],
      startDate: "2026-04-01",
    },
    confidenceInterval: 55,
    decisionId: "static-d4",
  },
  {
    id: "exp3",
    number: 6,
    title: "Auth rewrite canary — error rate",
    status: "paused",
    hypothesis: {
      metric: "Auth error rate",
      expected: 0.1,
      unit: "%",
      rationale:
        "Rewrite should bring auth error rate below 0.1% vs current 0.6% on patch approach.",
    },
    result: {
      actual: null,
      trend: [0.6, 0.6, 0.58],
      startDate: "2026-04-15",
    },
    confidenceInterval: 40,
    decisionId: "static-d1",
  },
]

export function mergeWithStatic(userDecisions: Decision[]): Decision[] {
  return mergeWithStaticState(userDecisions, [])
}

export function isStaticDecisionId(id: string): boolean {
  return STATIC_DECISIONS.some((decision) => decision.id === id)
}

export function isPersistableDecision(decision: Decision): boolean {
  return !isStaticDecisionId(decision.id) || isEditedStaticDecision(decision)
}

export function mergeWithStaticState(userDecisions: Decision[], hiddenStaticDecisionIds: string[]): Decision[] {
  const hidden = new Set(hiddenStaticDecisionIds)
  const visibleUserDecisions = userDecisions.filter((decision) => !hidden.has(decision.id))
  const userMap = new Map<string, Decision>(visibleUserDecisions.map((d) => [d.id, d]))
  const merged  = new Map<string, Decision>()

  for (const staticDecision of STATIC_DECISIONS) {
    if (hidden.has(staticDecision.id)) continue
    const userVersion = userMap.get(staticDecision.id)
    merged.set(staticDecision.id, userVersion ?? {
      ...staticDecision,
      qualityScore: calculateQualityScoreFromDecision(staticDecision),
    })
  }

  for (const userDecision of visibleUserDecisions) {
    if (!merged.has(userDecision.id)) {
      merged.set(userDecision.id, userDecision)
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function isEditedStaticDecision(decision: Decision): boolean {
  const original = STATIC_DECISIONS.find((item) => item.id === decision.id)
  if (!original) return false

  const baseline = {
    ...original,
    qualityScore: calculateQualityScoreFromDecision(original),
  }

  return JSON.stringify(decision) !== JSON.stringify(baseline)
}
