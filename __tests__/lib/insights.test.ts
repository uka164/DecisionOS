import { describe, it, expect } from "vitest"
import { generateInsights } from "@/lib/insights"
import type { Decision } from "@/lib/types"

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: `d-${Math.random()}`,
    title: "Test decision",
    status: "decided",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    impact: 3,
    qualityScore: 75,
    tags: [],
    rawThinking: "",
    tradeoffs: [],
    riskLevel: null,
    badges: [],
    options: [],
    constraints: [],
    risks: [],
    ...overrides,
  }
}

const BASE_DECISIONS = Array.from({ length: 5 }, () => makeDecision())
const NOW = Date.now()

describe("generateInsights", () => {
  it("returns null when fewer than 5 decisions", () => {
    expect(generateInsights([], NOW)).toBeNull()
    expect(generateInsights([makeDecision()], NOW)).toBeNull()
    expect(generateInsights(Array.from({ length: 4 }, () => makeDecision()), NOW)).toBeNull()
  })

  it("returns an array (possibly empty) for 5+ decisions", () => {
    const result = generateInsights(BASE_DECISIONS, NOW)
    expect(Array.isArray(result)).toBe(true)
  })

  describe("rollback-omission", () => {
    it("fires when >40% of high-impact decisions lack rollback language", () => {
      const decisions = [
        makeDecision({ impact: 5, rawThinking: "no rollback plan here" }),
        makeDecision({ impact: 5, rawThinking: "also missing" }),
        makeDecision({ impact: 5, rawThinking: "still missing" }),
        makeDecision({ impact: 2 }),
        makeDecision({ impact: 2 }),
      ]
      const insights = generateInsights(decisions, NOW)!
      expect(insights.some((i) => i.id === "rollback-omission")).toBe(true)
    })

    it("does not fire when high-impact decisions include rollback language", () => {
      const decisions = [
        makeDecision({ impact: 5, rawThinking: "we will rollback if metrics drop" }),
        makeDecision({ impact: 5, rawThinking: "fallback plan: revert deploy" }),
        makeDecision({ impact: 5, rawThinking: "revert via feature flag" }),
        makeDecision({ impact: 2 }),
        makeDecision({ impact: 2 }),
      ]
      const insights = generateInsights(decisions, NOW)!
      expect(insights.some((i) => i.id === "rollback-omission")).toBe(false)
    })

    it("does not fire when no decisions have rawThinking", () => {
      const decisions = Array.from({ length: 5 }, () =>
        makeDecision({ impact: 5, rawThinking: "" })
      )
      const insights = generateInsights(decisions, NOW)!
      expect(insights.some((i) => i.id === "rollback-omission")).toBe(false)
    })
  })

  describe("risk-quality-blindspot", () => {
    it("fires when 3+ decisions have high-severity risk and low quality score", () => {
      const decisions = [
        makeDecision({ risks: [{ text: "outage", severity: 80 }], qualityScore: 50 }),
        makeDecision({ risks: [{ text: "data loss", severity: 75 }], qualityScore: 45 }),
        makeDecision({ risks: [{ text: "breach", severity: 90 }], qualityScore: 30 }),
        makeDecision(),
        makeDecision(),
      ]
      const insights = generateInsights(decisions, NOW)!
      expect(insights.some((i) => i.id === "risk-quality-blindspot")).toBe(true)
    })

    it("does not fire when fewer than 3 qualify", () => {
      const decisions = [
        makeDecision({ risks: [{ text: "outage", severity: 80 }], qualityScore: 50 }),
        makeDecision({ risks: [{ text: "low risk", severity: 30 }], qualityScore: 50 }),
        makeDecision(),
        makeDecision(),
        makeDecision(),
      ]
      const insights = generateInsights(decisions, NOW)!
      expect(insights.some((i) => i.id === "risk-quality-blindspot")).toBe(false)
    })
  })

  describe("decision-aging", () => {
    const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1000

    it("fires when in-progress decision has not been updated in >7 days", () => {
      const staleDate = new Date(NOW - EIGHT_DAYS_MS).toISOString()
      const decisions = [
        makeDecision({ status: "in-progress", createdAt: staleDate }),
        ...Array.from({ length: 4 }, () => makeDecision()),
      ]
      const insights = generateInsights(decisions, NOW)!
      expect(insights.some((i) => i.id === "decision-aging")).toBe(true)
    })

    it("uses updatedAt over createdAt when updatedAt is present", () => {
      const staleCreated = new Date(NOW - EIGHT_DAYS_MS).toISOString()
      const recentUpdated = new Date(NOW - 1000 * 60 * 60).toISOString()
      const decisions = [
        makeDecision({ status: "in-progress", createdAt: staleCreated, updatedAt: recentUpdated }),
        ...Array.from({ length: 4 }, () => makeDecision()),
      ]
      const insights = generateInsights(decisions, NOW)!
      expect(insights.some((i) => i.id === "decision-aging")).toBe(false)
    })

    it("does not fire for non-in-progress decisions", () => {
      const staleDate = new Date(NOW - EIGHT_DAYS_MS).toISOString()
      const decisions = [
        makeDecision({ status: "decided", createdAt: staleDate }),
        makeDecision({ status: "archived", createdAt: staleDate }),
        ...Array.from({ length: 3 }, () => makeDecision()),
      ]
      const insights = generateInsights(decisions, NOW)!
      expect(insights.some((i) => i.id === "decision-aging")).toBe(false)
    })
  })

  describe("constraint-clustering", () => {
    it("fires when one constraint appears in >40% of all constraint occurrences", () => {
      const decisions = [
        makeDecision({ constraints: ["budget", "budget", "budget"] }),
        makeDecision({ constraints: ["budget", "time"] }),
        makeDecision({ constraints: ["scope"] }),
        makeDecision(),
        makeDecision(),
      ]
      const insights = generateInsights(decisions, NOW)!
      expect(insights.some((i) => i.id === "constraint-clustering")).toBe(true)
    })

    it("does not fire when constraint spread is even", () => {
      const decisions = [
        makeDecision({ constraints: ["a"] }),
        makeDecision({ constraints: ["b"] }),
        makeDecision({ constraints: ["c"] }),
        makeDecision({ constraints: ["d"] }),
        makeDecision({ constraints: ["e"] }),
      ]
      const insights = generateInsights(decisions, NOW)!
      expect(insights.some((i) => i.id === "constraint-clustering")).toBe(false)
    })

    it("does not fire when no decisions have constraints", () => {
      const decisions = Array.from({ length: 5 }, () => makeDecision({ constraints: [] }))
      const insights = generateInsights(decisions, NOW)!
      expect(insights.some((i) => i.id === "constraint-clustering")).toBe(false)
    })
  })
})
