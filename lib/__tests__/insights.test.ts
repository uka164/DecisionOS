import { describe, expect, it } from "vitest"
import { generateInsights } from "../insights"
import type { Decision } from "../types"

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: `user-test-${Math.random()}`,
    title: "Test decision",
    status: "draft",
    createdAt: new Date("2026-01-01").toISOString(),
    impact: 4,
    qualityScore: 80,
    tags: [],
    rawThinking: "Enough context to trigger insight checks for high-impact records.",
    tradeoffs: [],
    riskLevel: null,
    badges: [],
    options: [],
    constraints: [],
    risks: [],
    ...overrides,
  }
}

describe("generateInsights", () => {
  it("waits for three decisions before producing prompts", () => {
    const decisions = Array.from({ length: 2 }, (_, i) => makeDecision({ id: `user-test-${i}` }))

    expect(generateInsights(decisions, Date.now())).toBeNull()
  })

  it("flags high-impact decisions without a human frame", () => {
    const decisions = Array.from({ length: 5 }, (_, i) =>
      makeDecision({
        id: `user-test-${i}`,
        valuesAtStake: i === 0 ? "Trust" : undefined,
      })
    )

    const insights = generateInsights(decisions, Date.now())

    expect(insights?.some((insight) => insight.id === "human-frame-omission")).toBe(true)
  })
})
