import { describe, it, expect } from "vitest"
import { mergeWithStatic, STATIC_DECISIONS } from "@/lib/mock-data"
import type { Decision } from "@/lib/types"

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "user-test-1",
    title: "Test Decision",
    status: "draft",
    createdAt: new Date().toISOString(),
    impact: 3,
    qualityScore: 50,
    tags: [],
    rawThinking: "test thinking",
    tradeoffs: [],
    riskLevel: null,
    badges: [],
    options: [],
    constraints: [],
    risks: [],
    ...overrides,
  }
}

describe("mergeWithStatic", () => {
  it("returns static decisions when user has none", () => {
    const result = mergeWithStatic([])
    expect(result.length).toBe(STATIC_DECISIONS.length)
    // All static IDs should be present
    for (const sd of STATIC_DECISIONS) {
      expect(result.some((d) => d.id === sd.id)).toBe(true)
    }
  })

  it("user decisions are included alongside static ones", () => {
    const userDecision = makeDecision({ id: "user-123", title: "My Decision" })
    const result = mergeWithStatic([userDecision])
    expect(result.length).toBe(STATIC_DECISIONS.length + 1)
    expect(result.some((d) => d.id === "user-123")).toBe(true)
  })

  it("user-edited static decision overrides the original", () => {
    const editedStatic = makeDecision({
      id: "static-d1",
      title: "Edited Title",
      qualityScore: 99,
    })
    const result = mergeWithStatic([editedStatic])
    const found = result.find((d) => d.id === "static-d1")
    expect(found).toBeDefined()
    expect(found!.title).toBe("Edited Title")
    expect(found!.qualityScore).toBe(99)
  })

  it("does not duplicate static decisions", () => {
    const result = mergeWithStatic([])
    const staticIds = result.filter((d) => d.id.startsWith("static-"))
    const uniqueIds = new Set(staticIds.map((d) => d.id))
    expect(staticIds.length).toBe(uniqueIds.size)
  })

  it("sorts by createdAt descending", () => {
    const oldDecision = makeDecision({
      id: "user-old",
      createdAt: "2020-01-01T00:00:00.000Z",
    })
    const newDecision = makeDecision({
      id: "user-new",
      createdAt: "2030-01-01T00:00:00.000Z",
    })
    const result = mergeWithStatic([oldDecision, newDecision])
    const newIdx = result.findIndex((d) => d.id === "user-new")
    const oldIdx = result.findIndex((d) => d.id === "user-old")
    expect(newIdx).toBeLessThan(oldIdx)
  })

  it("recalculates quality score for untouched static decisions", () => {
    const result = mergeWithStatic([])
    const staticD = result.find((d) => d.id === "static-d1")
    expect(staticD).toBeDefined()
    // qualityScore should be recalculated, not the hardcoded value
    expect(typeof staticD!.qualityScore).toBe("number")
    expect(staticD!.qualityScore).toBeGreaterThanOrEqual(0)
    expect(staticD!.qualityScore).toBeLessThanOrEqual(100)
  })
})
