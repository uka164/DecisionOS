import { describe, it, expect } from "vitest"
import { needsMigration, migrateV1toV2 } from "@/lib/migrations/v1-to-v2"

describe("needsMigration", () => {
  it("returns true when schemaVersion is absent", () => {
    expect(needsMigration({ decisions: [] })).toBe(true)
  })

  it("returns true when schemaVersion is 1", () => {
    expect(needsMigration({ schemaVersion: 1, decisions: [] })).toBe(true)
  })

  it("returns true when schemaVersion is 2", () => {
    expect(needsMigration({ schemaVersion: 2, decisions: [] })).toBe(true)
  })

  it("returns false when schemaVersion is 3", () => {
    expect(needsMigration({ schemaVersion: 3, decisions: [] })).toBe(false)
  })
})

describe("migrateV1toV2", () => {
  it("stamps schemaVersion: 3", () => {
    const result = migrateV1toV2({ decisions: [] })
    expect(result.schemaVersion).toBe(3)
  })

  it("preserves existing decisions that have all required fields", () => {
    const decision = {
      id: "d-1",
      title: "Adopt GraphQL",
      status: "decided",
      createdAt: "2024-01-01T00:00:00.000Z",
      impact: 4,
      qualityScore: 80,
      tags: ["architecture"],
      rawThinking: "detailed notes",
      tradeoffs: [],
      riskLevel: "low",
      badges: [],
      options: [],
      constraints: ["time"],
      risks: [],
    }
    const result = migrateV1toV2({ decisions: [decision] })
    const migrated = (result.decisions as typeof decision[])[0]
    expect(migrated.title).toBe("Adopt GraphQL")
    expect(migrated.tags).toEqual(["architecture"])
    expect(migrated.constraints).toEqual(["time"])
  })

  it("normalises missing array fields to empty arrays", () => {
    const v1Decision = {
      id: "d-old",
      title: "Old decision",
      status: "draft",
      createdAt: "2023-01-01T00:00:00.000Z",
      impact: 2,
      qualityScore: 0,
      rawThinking: "",
    }
    const result = migrateV1toV2({ decisions: [v1Decision] })
    const migrated = (result.decisions as Record<string, unknown>[])[0]
    expect(migrated.tags).toEqual([])
    expect(migrated.constraints).toEqual([])
    expect(migrated.risks).toEqual([])
    expect(migrated.badges).toEqual([])
    expect(migrated.options).toEqual([])
    expect(migrated.tradeoffs).toEqual([])
    expect(migrated.executionTrail).toEqual([])
    expect(migrated.riskLevel).toBeNull()
  })

  it("does not overwrite existing array values", () => {
    const decision = {
      id: "d-2",
      title: "Decision with tags",
      status: "decided",
      createdAt: "2024-01-01T00:00:00.000Z",
      impact: 3,
      qualityScore: 70,
      rawThinking: "",
      tags: ["frontend", "api"],
      constraints: ["budget"],
      risks: [{ text: "risk", severity: 50 }],
      badges: [],
      options: [],
      tradeoffs: [],
    }
    const result = migrateV1toV2({ decisions: [decision] })
    const migrated = (result.decisions as typeof decision[])[0]
    expect(migrated.tags).toEqual(["frontend", "api"])
    expect(migrated.constraints).toEqual(["budget"])
    expect(migrated.risks).toEqual([{ text: "risk", severity: 50 }])
  })

  it("defaults missing string fields", () => {
    const decision = { impact: 3, qualityScore: 0 }
    const result = migrateV1toV2({ decisions: [decision] })
    const migrated = (result.decisions as Record<string, unknown>[])[0]
    expect(typeof migrated.title).toBe("string")
    expect(typeof migrated.rawThinking).toBe("string")
    expect(typeof migrated.status).toBe("string")
  })

  it("defaults missing impact/qualityScore to safe numbers", () => {
    const decision = { title: "No numbers" }
    const result = migrateV1toV2({ decisions: [decision] })
    const migrated = (result.decisions as Record<string, unknown>[])[0]
    expect(typeof migrated.impact).toBe("number")
    expect(typeof migrated.qualityScore).toBe("number")
  })

  it("handles missing decisions field gracefully", () => {
    const result = migrateV1toV2({ schemaVersion: 1 })
    expect(result.decisions).toEqual([])
    expect(result.schemaVersion).toBe(3)
  })

  it("preserves experiments array", () => {
    const exp = { id: "exp-1", title: "A/B test" }
    const result = migrateV1toV2({ decisions: [], experiments: [exp] })
    expect(result.experiments).toEqual([exp])
  })

  it("defaults experiments to empty array when absent", () => {
    const result = migrateV1toV2({ decisions: [] })
    expect(result.experiments).toEqual([])
  })
})
