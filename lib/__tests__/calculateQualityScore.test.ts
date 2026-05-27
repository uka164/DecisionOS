import { describe, it, expect } from "vitest"
import {
  calculateQualityScore,
  calculateQualityScoreFromDecision,
  getQualityBreakdown,
  getQualityBreakdownFromDecision,
} from "@/lib/utils/calculateQualityScore"
import type { Decision } from "@/lib/types"

describe("calculateQualityScore", () => {
  it("returns 0 for empty input", () => {
    expect(calculateQualityScore({})).toBe(0)
  })

  it("awards 15 pts for title > 5 chars", () => {
    expect(calculateQualityScore({ title: "DB Migration" })).toBe(15)
  })

  it("does NOT award for title <= 5 chars", () => {
    expect(calculateQualityScore({ title: "Fix" })).toBe(0)
    expect(calculateQualityScore({ title: "12345" })).toBe(0)
  })

  it("awards 15 pts for rawThinking > 50 chars", () => {
    expect(calculateQualityScore({ rawThinking: "a".repeat(51) })).toBe(15)
  })

  it("does NOT award for rawThinking <= 50 chars", () => {
    expect(calculateQualityScore({ rawThinking: "a".repeat(50) })).toBe(0)
  })

  it("awards 15 pts for options >= 2", () => {
    expect(
      calculateQualityScore({
        options: [
          { title: "A", description: "" },
          { title: "B", description: "" },
        ],
      })
    ).toBe(15)
  })

  it("does NOT award for fewer than 2 options", () => {
    expect(calculateQualityScore({ options: [{ title: "A", description: "" }] })).toBe(0)
  })

  it("awards 20 pts for preMortem > 10 chars", () => {
    expect(calculateQualityScore({ preMortem: "Cache miss cascading" })).toBe(20)
  })

  it("does NOT award for preMortem <= 10 chars", () => {
    expect(calculateQualityScore({ preMortem: "short" })).toBe(0)
  })

  it("awards 10 pts when riskLevel is set", () => {
    expect(calculateQualityScore({ riskLevel: "low" })).toBe(10)
    expect(calculateQualityScore({ riskLevel: "critical" })).toBe(10)
  })

  it("awards 15 pts for retrospective > 10 chars", () => {
    expect(calculateQualityScore({ retrospective: "Went well, latency down" })).toBe(15)
  })

  it("awards 10 pts when constraints.length > 0", () => {
    expect(calculateQualityScore({ constraints: ["Budget"] })).toBe(10)
  })

  it("caps at 100 for full input", () => {
    expect(
      calculateQualityScore({
        title: "DB Migration Strategy",
        rawThinking: "a".repeat(51),
        options: [
          { title: "A", description: "" },
          { title: "B", description: "" },
        ],
        preMortem: "Cache miss could cascade",
        riskLevel: "high",
        retrospective: "Went fine, latency down 40%",
        constraints: ["Budget"],
      })
    ).toBe(100)
  })

  it("accumulates multiple signals correctly (85 pt case)", () => {
    const score = calculateQualityScore({
      title: "DB Migration",
      options: [
        { title: "A", description: "" },
        { title: "B", description: "" },
      ],
      preMortem: "Cache miss could cascade",
      riskLevel: "high",
      rawThinking: "Lots of context here, enough to pass fifty chars easily yes",
      constraints: ["Budget"],
    })

    expect(score).toBe(85)
  })

  it("explains earned and missing quality signals", () => {
    const breakdown = getQualityBreakdown({
      title: "DB Migration",
      constraints: ["Budget"],
    })

    expect(breakdown.score).toBe(25)
    expect(breakdown.earned.map((signal) => signal.id)).toEqual(["title", "constraints"])
    expect(breakdown.missing.map((signal) => signal.id)).toContain("premortem")
    expect(breakdown.missing[0].guidance.length).toBeGreaterThan(10)
  })
})

describe("calculateQualityScoreFromDecision", () => {
  it("extracts fields from a Decision object", () => {
    const decision: Partial<Decision> = {
      title: "Migrate to PostgreSQL",
      rawThinking: "a".repeat(51),
      options: [
        { title: "Migrate", description: "" },
        { title: "Stay", description: "" },
      ],
      preMortem: "Data loss during migration",
      riskLevel: "high",
      retrospective: "Zero data loss. Query perf 2.3x better.",
      constraints: ["Time", "Budget"],
    }

    expect(calculateQualityScoreFromDecision(decision)).toBe(100)
  })

  it("handles empty partial decision", () => {
    expect(calculateQualityScoreFromDecision({})).toBe(0)
  })

  it("returns an explainable breakdown for a Decision object", () => {
    const breakdown = getQualityBreakdownFromDecision({
      title: "Migrate to PostgreSQL",
      constraints: ["Time"],
    })

    expect(breakdown.score).toBe(25)
    expect(breakdown.earned.map((signal) => signal.label)).toEqual(["Clear title", "Constraints"])
  })
})
