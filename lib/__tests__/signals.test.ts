import { describe, expect, it } from "vitest"
import { generateSignals } from "../signals"
import type { Decision } from "../types"

/** A deliberately "clean" decision that triggers no signals on its own. */
function makeClean(overrides: Partial<Decision> = {}): Decision {
  return {
    id: `user-${Math.random().toString(36).slice(2)}`,
    title: "Clean decision",
    status: "decided",
    createdAt: new Date("2026-01-01").toISOString(),
    updatedAt: new Date("2026-05-01").toISOString(),
    impact: 2,
    qualityScore: 80,
    tags: [],
    rawThinking: "We weighed it; rollback is documented if it fails.",
    valuesAtStake: "User trust",
    revisitAt: "2026-09-01",
    tradeoffs: [],
    riskLevel: null,
    badges: [],
    options: [
      { title: "Option A", description: "" },
      { title: "Option B", description: "" },
    ],
    preMortem: "If this fails in six months it is because adoption stalled.",
    constraints: [],
    risks: [],
    ...overrides,
  }
}

const NOW = new Date("2026-05-28").getTime()

describe("generateSignals", () => {
  it("returns no signals for a well-tended decision set", () => {
    const decisions = Array.from({ length: 5 }, () => makeClean())
    expect(generateSignals(decisions, NOW)).toEqual([])
  })

  it("ignores static example decisions", () => {
    const decisions = Array.from({ length: 5 }, (_, i) =>
      makeClean({ id: `static-${i}`, impact: 5, valuesAtStake: undefined, riskLevel: "high", preMortem: undefined })
    )
    expect(generateSignals(decisions, NOW)).toEqual([])
  })

  it("ranks critical signals before attention and info", () => {
    const decisions = Array.from({ length: 5 }, () => makeClean())
    // Force one critical: high risk accepted with no pre-mortem.
    decisions[0] = makeClean({ status: "in-progress", riskLevel: "high", preMortem: undefined })

    const signals = generateSignals(decisions, NOW)
    expect(signals.length).toBeGreaterThan(0)
    expect(signals[0].severity).toBe("critical")
    expect(signals.some((s) => s.id === "high-risk-no-premortem")).toBe(true)
  })

  it("dedupes a blind spot and an insight that describe the same topic", () => {
    // 5 high-impact decisions missing a human frame triggers BOTH the
    // 'no-human-frame-high-impact' blind spot and the 'human-frame-omission'
    // insight. Only the (richer) blind spot should survive.
    const decisions = Array.from({ length: 5 }, () =>
      makeClean({ impact: 4, valuesAtStake: undefined })
    )

    const signals = generateSignals(decisions, NOW)
    expect(signals.some((s) => s.id === "no-human-frame-high-impact")).toBe(true)
    expect(signals.some((s) => s.id === "insight-human-frame-omission")).toBe(false)
  })
})
