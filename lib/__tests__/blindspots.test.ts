import { describe, expect, it } from "vitest"
import { detectBlindSpots } from "../blindspots"
import type { Decision } from "../types"

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: `user-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test decision",
    status: "in-progress",
    createdAt: new Date("2026-04-01").toISOString(),
    impact: 4,
    qualityScore: 60,
    tags: [],
    rawThinking: "Enough context. We considered the alternative and chose this path because of A.",
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

const NOW = new Date("2026-05-28").getTime()

describe("detectBlindSpots", () => {
  it("returns empty when only static example decisions are present", () => {
    const decisions = [makeDecision({ id: "static-d1", impact: 5 })]
    expect(detectBlindSpots(decisions, NOW)).toEqual([])
  })

  it("flags high-impact decisions with no human frame", () => {
    const decisions = [makeDecision({ impact: 5 })]
    const spots = detectBlindSpots(decisions, NOW)
    const spot = spots.find((s) => s.id === "no-human-frame-high-impact")
    expect(spot).toBeDefined()
    expect(spot?.affectedIds).toHaveLength(1)
  })

  it("does not flag human frame when at least one human-frame field is filled", () => {
    const decisions = [
      makeDecision({ impact: 5, valuesAtStake: "Trust", revisitAt: "2026-09-01" }),
    ]
    const spots = detectBlindSpots(decisions, NOW)
    expect(spots.find((s) => s.id === "no-human-frame-high-impact")).toBeUndefined()
  })

  it("flags high-impact decisions with no revisit date", () => {
    const decisions = [
      makeDecision({
        impact: 5,
        valuesAtStake: "Trust",
        humanCost: "Support team",
      }),
    ]
    const spots = detectBlindSpots(decisions, NOW)
    expect(spots.find((s) => s.id === "no-revisit-high-impact")).toBeDefined()
  })

  it("flags accepted high-risk decisions with no pre-mortem", () => {
    const decisions = [
      makeDecision({
        impact: 3,
        status: "decided",
        riskLevel: "high",
        valuesAtStake: "Trust",
        revisitAt: "2026-09-01",
      }),
    ]
    const spots = detectBlindSpots(decisions, NOW)
    const spot = spots.find((s) => s.id === "high-risk-no-premortem")
    expect(spot).toBeDefined()
    expect(spot?.severity).toBe("critical")
  })

  it("does not flag pre-mortem when one is recorded", () => {
    const decisions = [
      makeDecision({
        impact: 3,
        status: "decided",
        riskLevel: "high",
        preMortem: "It is six months later and the migration failed because of replication lag.",
        valuesAtStake: "Trust",
        revisitAt: "2026-09-01",
      }),
    ]
    const spots = detectBlindSpots(decisions, NOW)
    expect(spots.find((s) => s.id === "high-risk-no-premortem")).toBeUndefined()
  })

  it("flags tunnel vision when fewer than two options exist", () => {
    const decisions = [
      makeDecision({
        impact: 2,
        options: [{ title: "Just do it", description: "" }],
        valuesAtStake: "Trust",
      }),
    ]
    const spots = detectBlindSpots(decisions, NOW)
    expect(spots.find((s) => s.id === "tunnel-vision")).toBeDefined()
  })

  it("flags regret without a 'what I got wrong' note or review lesson", () => {
    const decisions = [
      makeDecision({
        impact: 2,
        regret: true,
        valuesAtStake: "Trust",
        revisitAt: "2026-09-01",
      }),
    ]
    const spots = detectBlindSpots(decisions, NOW)
    const spot = spots.find((s) => s.id === "regret-without-learning")
    expect(spot).toBeDefined()
    expect(spot?.severity).toBe("critical")
  })

  it("clears regret-without-learning when the review captures the lesson", () => {
    const decisions = [
      makeDecision({
        impact: 2,
        regret: true,
        valuesAtStake: "Trust",
        revisitAt: "2026-09-01",
        review: { lesson: "Do not ship on Fridays.", completedAt: new Date().toISOString() },
      }),
    ]
    const spots = detectBlindSpots(decisions, NOW)
    expect(spots.find((s) => s.id === "regret-without-learning")).toBeUndefined()
  })

  it("flags a reactive time pattern when 'Time' dominates constraints", () => {
    const decisions = Array.from({ length: 4 }, () =>
      makeDecision({
        impact: 2,
        constraints: ["Time"],
        valuesAtStake: "Trust",
        revisitAt: "2026-09-01",
      })
    )
    const spots = detectBlindSpots(decisions, NOW)
    expect(spots.find((s) => s.id === "reactive-time-pattern")).toBeDefined()
  })

  it("flags high-impact decisions with no rollback/exit language", () => {
    const decisions = [
      makeDecision({
        impact: 5,
        rawThinking: "We are committing to this path because A.",
        valuesAtStake: "Trust",
        revisitAt: "2026-09-01",
      }),
    ]
    const spots = detectBlindSpots(decisions, NOW)
    expect(spots.find((s) => s.id === "no-exit-path")).toBeDefined()
  })

  it("does not flag exit path when rollback/fallback language is present", () => {
    const decisions = [
      makeDecision({
        impact: 5,
        rawThinking: "If this fails, the rollback is to fall back to the previous behaviour.",
        valuesAtStake: "Trust",
        revisitAt: "2026-09-01",
      }),
    ]
    const spots = detectBlindSpots(decisions, NOW)
    expect(spots.find((s) => s.id === "no-exit-path")).toBeUndefined()
  })

  it("flags an unclosed loop when in-progress decision is older than 14 days", () => {
    const old = new Date(NOW - 20 * 24 * 60 * 60 * 1000).toISOString()
    const decisions = [
      makeDecision({
        impact: 2,
        status: "in-progress",
        createdAt: old,
        valuesAtStake: "Trust",
        revisitAt: "2026-09-01",
      }),
    ]
    const spots = detectBlindSpots(decisions, NOW)
    expect(spots.find((s) => s.id === "unclosed-loop")).toBeDefined()
  })

  it("sorts critical severity before warn and info", () => {
    const old = new Date(NOW - 20 * 24 * 60 * 60 * 1000).toISOString()
    const decisions = [
      makeDecision({
        impact: 5,
        status: "decided",
        riskLevel: "high",
        regret: true,
        createdAt: old,
        valuesAtStake: "Trust",
        revisitAt: "2026-09-01",
        options: [
          { title: "A", description: "" },
          { title: "B", description: "" },
        ],
        rawThinking: "If this fails, the rollback path is clear.",
      }),
    ]
    const spots = detectBlindSpots(decisions, NOW)
    expect(spots.length).toBeGreaterThan(0)
    expect(spots[0].severity).toBe("critical")
  })
})
