import { describe, it, expect, beforeEach } from "vitest"
import { store } from "@/lib/store"

// Provide both `window` and `globalThis.localStorage` so isClient() returns true
// and store operations can access localStorage.
const mockStorage: Record<string, string> = {}

const localStorageMock = {
  getItem(key: string): string | null { return mockStorage[key] ?? null },
  setItem(key: string, value: string) { mockStorage[key] = value },
  removeItem(key: string) { delete mockStorage[key] },
  clear() { for (const k of Object.keys(mockStorage)) delete mockStorage[k] },
  get length() { return Object.keys(mockStorage).length },
  key(i: number): string | null { return Object.keys(mockStorage)[i] ?? null },
}

Object.defineProperty(globalThis, "window", {
  value: { localStorage: localStorageMock },
  writable: true,
  configurable: true,
})
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, configurable: true })

describe("store persistence", () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k]
  })

  it("get() returns default state when localStorage is empty", () => {
    const state = store.get()
    expect(state.decisions).toEqual([])
    expect(state.experiments).toEqual([])
    expect(state.hiddenStaticDecisionIds).toEqual([])
    expect(state.settings).toBeDefined()
    expect(state.settings.theme).toBe("void")
  })

  it("set() persists state to localStorage", () => {
    const state = store.get()
    state.decisions = [
      {
        id: "test-1",
        title: "Test",
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
      },
    ]
    const saved = store.set(state)
    expect(saved).toBe(true)
    expect(mockStorage["decisionos_store"]).toBeDefined()
  })

  it("roundtrip: set then get preserves data", () => {
    const state = store.get()
    state.decisions = [
      {
        id: "test-1",
        title: "Roundtrip Test",
        status: "decided",
        createdAt: "2024-01-01T00:00:00.000Z",
        impact: 5,
        qualityScore: 88,
        tags: ["ARCH"],
        rawThinking: "thinking...",
        tradeoffs: [{ axis: "Speed", value: 90 }],
        riskLevel: "high",
        badges: [{ label: "ARCH", type: "purple" }],
        options: [{ title: "A", description: "desc" }],
        constraints: ["Budget"],
        risks: [{ text: "Data loss", severity: 80 }],
        executionTrail: [
          {
            id: "step-1",
            text: "Run the pilot",
            done: false,
            createdAt: "2024-01-02T00:00:00.000Z",
          },
        ],
      },
    ]
    store.set(state)
    const retrieved = store.get()
    expect(retrieved.decisions).toHaveLength(1)
    expect(retrieved.decisions[0].title).toBe("Roundtrip Test")
    expect(retrieved.decisions[0].qualityScore).toBe(88)
    expect(retrieved.decisions[0].tradeoffs[0].value).toBe(90)
    expect(retrieved.decisions[0].executionTrail?.[0].text).toBe("Run the pilot")
  })

  it("migrates older decisions without dropping them when riskLevel is absent", () => {
    mockStorage["decisionos_store"] = JSON.stringify({
      schemaVersion: 2,
      decisions: [
        {
          id: "legacy-1",
          title: "Legacy decision",
          status: "draft",
          createdAt: "2024-01-01T00:00:00.000Z",
          impact: 3,
          qualityScore: 40,
          tags: [],
          rawThinking: "",
          tradeoffs: [],
          badges: [],
          options: [],
          constraints: [],
          risks: [],
        },
      ],
      experiments: [],
      settings: { theme: "void", reducedMotion: false, animationIntensity: 70, ambientMotion: false },
      lastSynced: null,
    })

    const state = store.get()

    expect(state.decisions).toHaveLength(1)
    expect(state.decisions[0].riskLevel).toBeNull()
    expect(state.decisions[0].executionTrail).toEqual([])
  })

  it("clear() removes storage key and get() returns defaults", () => {
    const state = store.get()
    state.settings.theme = "midnight"
    store.set(state)

    // Verify it was written
    expect(mockStorage["decisionos_store"]).toBeDefined()

    // Clear
    store.clear()
    expect(mockStorage["decisionos_store"]).toBeUndefined()

    // After clear, get should return defaults
    const fresh = store.get()
    expect(fresh.decisions).toEqual([])
    expect(fresh.settings.theme).toBe("void")
  })

  it("get() strips legacy fake settings while preserving active preferences", () => {
    mockStorage["decisionos_store"] = JSON.stringify({
      decisions: [],
      experiments: [],
      settings: {
        theme: "dark",
        showDecay: false,
        defaultView: "archive",
        toastDuration: 1000,
        sync: true,
        backup: true,
        telemetry: true,
        animations: false,
        reducedMotion: true,
        animationIntensity: 30,
        ambientMotion: false,
      },
      lastSynced: null,
    })

    const state = store.get()

    expect(state.settings).toEqual({
      theme: "void",
      reducedMotion: true,
      animationIntensity: 30,
      ambientMotion: false,
      notifyRevisits: false,
    })
    expect("sync" in state.settings).toBe(false)
    expect("backup" in state.settings).toBe(false)
    expect("telemetry" in state.settings).toBe(false)
  })

  it("exportJSON returns valid JSON string", () => {
    const json = store.exportJSON()
    expect(() => JSON.parse(json)).not.toThrow()
    const parsed = JSON.parse(json)
    expect(parsed).toHaveProperty("decisions")
    expect(parsed).toHaveProperty("settings")
  })

  it("importJSON in overwrite mode replaces all data", () => {
    // Seed existing data
    const state = store.get()
    state.decisions = [
      {
        id: "existing-1",
        title: "Existing",
        status: "draft",
        createdAt: new Date().toISOString(),
        impact: 1,
        qualityScore: 10,
        tags: [],
        rawThinking: "",
        tradeoffs: [],
        riskLevel: null,
        badges: [],
        options: [],
        constraints: [],
        risks: [],
      },
    ]
    store.set(state)

    // Import new data
    const importData = JSON.stringify({
      decisions: [
        {
          id: "imported-1",
          title: "Imported",
          status: "decided",
          createdAt: new Date().toISOString(),
          impact: 5,
          qualityScore: 90,
          tags: [],
          rawThinking: "",
          tradeoffs: [],
          riskLevel: null,
          badges: [],
          options: [],
          constraints: [],
          risks: [],
        },
      ],
      experiments: [],
      settings: { theme: "midnight" },
    })

    const result = store.importJSON(importData, "overwrite")
    expect(result.ok).toBe(true)

    const after = store.get()
    expect(after.decisions.some((d) => d.id === "imported-1")).toBe(true)
  })

  it("importJSON rejects invalid JSON", () => {
    const result = store.importJSON("not valid json{{{", "overwrite")
    expect(result.ok).toBe(false)
  })

  it("importJSON rejects structurally invalid decisions", () => {
    const result = store.importJSON(JSON.stringify({
      decisions: [{ id: "bad", title: "Missing required fields" }],
      experiments: [],
    }), "merge")

    expect(result.ok).toBe(false)
    expect(store.get().decisions).toEqual([])
  })
})
