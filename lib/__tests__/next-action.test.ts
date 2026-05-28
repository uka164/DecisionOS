import { describe, expect, it } from "vitest"
import { getNextHonestAction } from "../next-action"
import type { Decision } from "../types"

const NOW = new Date("2026-05-28").getTime()
const RECENT = new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString()

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: `user-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test decision",
    status: "in-progress",
    createdAt: RECENT,
    impact: 4,
    qualityScore: 60,
    tags: [],
    rawThinking: "Enough context — rollback plan included.",
    valuesAtStake: "Trust",
    revisitAt: "2026-09-01",
    tradeoffs: [],
    riskLevel: null,
    badges: [],
    options: [
      { title: "Path A", description: "" },
      { title: "Path B", description: "" },
    ],
    constraints: [],
    risks: [],
    ...overrides,
  }
}

describe("getNextHonestAction", () => {
  it("returns calm state when there are no user decisions", () => {
    const action = getNextHonestAction([], NOW)
    expect(action.kind).toBe("calm")
    expect(action.decisionId).toBeNull()
  })

  it("ignores static example decisions", () => {
    const action = getNextHonestAction(
      [makeDecision({ id: "static-d1", impact: 5, revisitAt: undefined })],
      NOW
    )
    expect(action.kind).toBe("calm")
  })

  it("prioritises overdue reviews above everything else", () => {
    const decisions = [
      makeDecision({
        revisitAt: "2026-05-01",
        impact: 3,
      }),
      makeDecision({
        regret: true,
        valuesAtStake: undefined,
        revisitAt: undefined,
      }),
    ]
    const action = getNextHonestAction(decisions, NOW)
    expect(action.kind).toBe("review-overdue")
    expect(action.cta.href).toContain("?focus=review")
  })

  it("skips overdue revisits that already have a completed review", () => {
    const decisions = [
      makeDecision({
        revisitAt: "2026-05-01",
        review: { completedAt: new Date(NOW - 1000).toISOString() },
        impact: 3,
      }),
    ]
    const action = getNextHonestAction(decisions, NOW)
    expect(action.kind).not.toBe("review-overdue")
  })

  it("prioritises regret without lesson above set-revisit", () => {
    const decisions = [
      makeDecision({
        regret: true,
        gotWrong: undefined,
        impact: 4,
        revisitAt: "2026-09-01",
      }),
    ]
    const action = getNextHonestAction(decisions, NOW)
    expect(action.kind).toBe("name-regret-lesson")
  })

  it("does not flag regret when review.lesson is filled", () => {
    const decisions = [
      makeDecision({
        regret: true,
        review: { lesson: "Do not commit on Fridays." },
        impact: 3,
      }),
    ]
    const action = getNextHonestAction(decisions, NOW)
    expect(action.kind).not.toBe("name-regret-lesson")
  })

  it("flags missing revisit on high-impact decision", () => {
    const decisions = [
      makeDecision({
        impact: 5,
        revisitAt: undefined,
      }),
    ]
    const action = getNextHonestAction(decisions, NOW)
    expect(action.kind).toBe("set-revisit")
  })

  it("flags missing human frame on high-impact decision", () => {
    const decisions = [
      makeDecision({
        impact: 5,
        valuesAtStake: undefined,
        humanCost: undefined,
        guidingPrinciple: undefined,
      }),
    ]
    const action = getNextHonestAction(decisions, NOW)
    expect(action.kind).toBe("add-human-frame")
  })

  it("flags stale in-progress decision when nothing higher is pending", () => {
    const old = new Date(NOW - 20 * 24 * 60 * 60 * 1000).toISOString()
    const decisions = [
      makeDecision({
        impact: 2,
        status: "in-progress",
        createdAt: old,
      }),
    ]
    const action = getNextHonestAction(decisions, NOW)
    expect(action.kind).toBe("close-stale")
  })

  it("flags tunnel vision when only one option exists", () => {
    const decisions = [
      makeDecision({
        impact: 3,
        options: [{ title: "Only path", description: "" }],
      }),
    ]
    const action = getNextHonestAction(decisions, NOW)
    expect(action.kind).toBe("add-second-option")
  })

  it("returns a calm state, not null or empty, when nothing is urgent", () => {
    const decisions = [makeDecision({ impact: 2 })]
    const action = getNextHonestAction(decisions, NOW)
    expect(action.kind).toBe("calm")
    expect(action.cta.href).toBe("/decisions")
    expect(action.title.length).toBeGreaterThan(0)
  })
})
