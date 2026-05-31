import { describe, it, expect } from "vitest"
import { coerceSnapshot } from "@/lib/server/backends/types"

// coerceSnapshot is the shared normalization gate for all three store backends
// (json-file / sqlite / postgres). Anything they read off disk/DB passes through
// here, so a malformed or partial document can never reach the sync layer.

describe("coerceSnapshot", () => {
  it("rejects non-objects", () => {
    expect(coerceSnapshot(null)).toBeNull()
    expect(coerceSnapshot(undefined)).toBeNull()
    expect(coerceSnapshot("{}")).toBeNull()
    expect(coerceSnapshot(42)).toBeNull()
    expect(coerceSnapshot([])).toBeNull() // an array has no `decisions` array
  })

  it("rejects a document whose decisions is not an array", () => {
    expect(coerceSnapshot({ decisions: "nope" })).toBeNull()
    expect(coerceSnapshot({ experiments: [] })).toBeNull()
  })

  it("accepts a minimal document and defaults the optional fields", () => {
    const result = coerceSnapshot({ decisions: [] })
    expect(result).toEqual({
      decisions: [],
      experiments: [],
      hiddenStaticDecisionIds: [],
      updatedAt: new Date(0).toISOString(),
    })
  })

  it("preserves a well-formed snapshot verbatim", () => {
    const snapshot = {
      decisions: [{ id: "d-1" }],
      experiments: [{ id: "e-1" }],
      hiddenStaticDecisionIds: ["static-d3"],
      updatedAt: "2026-05-31T00:00:00.000Z",
    }
    expect(coerceSnapshot(snapshot)).toEqual(snapshot)
  })

  it("coerces non-array experiments / hiddenStaticDecisionIds back to []", () => {
    const result = coerceSnapshot({
      decisions: [],
      experiments: "oops",
      hiddenStaticDecisionIds: 7,
    })
    expect(result?.experiments).toEqual([])
    expect(result?.hiddenStaticDecisionIds).toEqual([])
  })

  it("falls back to the epoch when updatedAt is missing or not a string", () => {
    const epoch = new Date(0).toISOString()
    expect(coerceSnapshot({ decisions: [] })?.updatedAt).toBe(epoch)
    expect(coerceSnapshot({ decisions: [], updatedAt: 123 })?.updatedAt).toBe(epoch)
  })
})
