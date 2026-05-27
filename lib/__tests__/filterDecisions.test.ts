import { describe, it, expect } from "vitest"
import { filterDecisions, DEFAULT_FILTERS } from "@/lib/utils/filterDecisions"
import type { Decision } from "@/lib/types"
import type { FilterState } from "@/lib/utils/filterDecisions"

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "d-1",
    title: "Test Decision",
    status: "draft",
    createdAt: new Date().toISOString(),
    impact: 3,
    qualityScore: 50,
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

function filters(overrides: Partial<FilterState> = {}): FilterState {
  return { ...DEFAULT_FILTERS, ...overrides }
}

describe("filterDecisions", () => {
  const decisions: Decision[] = [
    makeDecision({ id: "d-1", title: "Alpha Decision", status: "draft", tags: ["ARCH"], qualityScore: 80, impact: 5 }),
    makeDecision({ id: "d-2", title: "Beta Decision", status: "decided", tags: ["DX"], qualityScore: 60, impact: 3 }),
    makeDecision({ id: "d-3", title: "Gamma Decision", status: "in-progress", tags: ["ARCH", "INFRA"], qualityScore: 90, impact: 4 }),
    makeDecision({ id: "d-4", title: "Delta Decision", status: "archived", tags: ["DX"], qualityScore: 40, impact: 2 }),
  ]

  it("returns all decisions with default filters", () => {
    const result = filterDecisions(decisions, filters())
    expect(result.length).toBe(4)
  })

  it("filters by statuses", () => {
    const result = filterDecisions(decisions, filters({ statuses: ["draft"] }))
    expect(result.every((d) => d.status === "draft")).toBe(true)
    expect(result.length).toBe(1)
  })

  it("filters by multiple statuses", () => {
    const result = filterDecisions(decisions, filters({ statuses: ["draft", "decided"] }))
    expect(result.length).toBe(2)
  })

  it("filters by search query (title match, case-insensitive)", () => {
    const result = filterDecisions(decisions, filters({ search: "alpha" }))
    expect(result.length).toBe(1)
    expect(result[0].id).toBe("d-1")
  })

  it("searches across title, rawThinking, and tags", () => {
    const result = filterDecisions(decisions, filters({ search: "INFRA" }))
    expect(result.length).toBe(1)
    expect(result[0].id).toBe("d-3")
  })

  it("filters by tags", () => {
    const result = filterDecisions(decisions, filters({ tags: ["ARCH"] }))
    expect(result.every((d) => d.tags.includes("ARCH"))).toBe(true)
    expect(result.length).toBe(2)
  })

  it("returns empty array for non-matching filters", () => {
    const result = filterDecisions(decisions, filters({ search: "zzzzz_no_match" }))
    expect(result).toEqual([])
  })

  it("combines multiple filters (AND logic)", () => {
    const result = filterDecisions(decisions, filters({
      statuses: ["draft", "in-progress"],
      tags: ["ARCH"],
    }))
    expect(result.length).toBe(2) // d-1 (draft, ARCH) and d-3 (in-progress, ARCH)
  })
})
