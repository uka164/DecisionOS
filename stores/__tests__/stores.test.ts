import { describe, it, expect, beforeEach, vi } from "vitest"
import type { Decision, AppSettings } from "@/lib/types"

// ── Mock window + localStorage for Node environment ─────────────────────────

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
  value: { localStorage: localStorageMock, addEventListener: vi.fn() },
  writable: true,
  configurable: true,
})
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, configurable: true })

// Import stores AFTER mocking window
import {
  useDecisionsStore,
  useExperimentsStore,
  useSettingsStore,
  hydrateAllStores,
  clearAllStores,
  exportStoreJSON,
} from "@/stores"

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearMockStorage() {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k]
}

// Minimal decision data for addDecision (omitting id, createdAt, qualityScore)
const DECISION_DATA = {
  title: "Test Migration Strategy",
  status: "draft" as const,
  impact: 4,
  tags: ["ARCH"],
  rawThinking: "Should we migrate to the new framework?",
  tradeoffs: [{ axis: "Speed", value: 80 }, { axis: "Cost", value: 30 }],
  riskLevel: "medium" as const,
  badges: [{ label: "ARCH", type: "purple" as const }],
  options: [{ title: "Option A", description: "Keep current" }, { title: "Option B", description: "Migrate" }],
  constraints: ["Budget", "Time"],
  risks: [{ text: "Data loss", severity: 60 }],
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "void",
  reducedMotion: false,
  animationIntensity: 70,
  ambientMotion: false,
  notifyRevisits: false,
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("useDecisionsStore", () => {
  beforeEach(() => {
    clearMockStorage()
    // Reset store state directly
    useDecisionsStore.setState({ decisions: [], isLoading: true, error: null })
    useExperimentsStore.setState({ experiments: [] })
    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      lastSynced: null,
    })
  })

  it("hydrate() loads decisions from localStorage", () => {
    // Seed storage with a decision
    const seeded = {
      decisions: [{ ...DECISION_DATA, id: "user-123", createdAt: "2024-01-01T00:00:00Z", qualityScore: 72 }],
      experiments: [],
      settings: { theme: "void" },
      lastSynced: null,
    }
    mockStorage["decisionos_store"] = JSON.stringify(seeded)

    useDecisionsStore.getState().hydrate()

    const { decisions, isLoading } = useDecisionsStore.getState()
    expect(isLoading).toBe(false)
    // mergeWithStatic adds static decisions — at minimum our seeded one should be present
    expect(decisions.some((d) => d.id === "user-123")).toBe(true)
  })

  it("addDecision() generates a user-prefixed ID", () => {
    // Must hydrate first so store is ready
    useDecisionsStore.getState().hydrate()

    const newDec = useDecisionsStore.getState().addDecision(DECISION_DATA)
    expect(newDec.id).toMatch(/^user-/)
    expect(newDec.title).toBe("Test Migration Strategy")
  })

  it("addDecision() auto-calculates quality score", () => {
    useDecisionsStore.getState().hydrate()

    const newDec = useDecisionsStore.getState().addDecision(DECISION_DATA)
    expect(typeof newDec.qualityScore).toBe("number")
    expect(newDec.qualityScore).toBeGreaterThan(0)
  })

  it("addDecision() persists to localStorage", () => {
    useDecisionsStore.getState().hydrate()

    useDecisionsStore.getState().addDecision(DECISION_DATA)

    // Verify persistence
    const raw = mockStorage["decisionos_store"]
    expect(raw).toBeDefined()
    const parsed = JSON.parse(raw!)
    expect(parsed.decisions.some((d: Decision) => d.title === "Test Migration Strategy")).toBe(true)
  })

  it("updateDecision() modifies and recalculates quality score", () => {
    useDecisionsStore.getState().hydrate()
    const added = useDecisionsStore.getState().addDecision(DECISION_DATA)
    const originalScore = added.qualityScore

    useDecisionsStore.getState().updateDecision(added.id, {
      title: "Updated Title",
      preMortem: "Risk assessment: multiple failure modes identified and documented thoroughly",
    })

    const updated = useDecisionsStore.getState().decisions.find((d) => d.id === added.id)
    expect(updated).toBeDefined()
    expect(updated!.title).toBe("Updated Title")
    expect(updated!.preMortem).toBeDefined()
    // Quality score should change since we added preMortem
    expect(updated!.qualityScore).not.toBe(originalScore)
  })

  it("deleteDecision() removes from store and persists", () => {
    useDecisionsStore.getState().hydrate()
    const added = useDecisionsStore.getState().addDecision(DECISION_DATA)

    useDecisionsStore.getState().deleteDecision(added.id)

    const remaining = useDecisionsStore.getState().decisions
    expect(remaining.find((d) => d.id === added.id)).toBeUndefined()

    // Check localStorage too
    const raw = mockStorage["decisionos_store"]
    const parsed = JSON.parse(raw!)
    expect(parsed.decisions.find((d: Decision) => d.id === added.id)).toBeUndefined()
  })

  it("deleteDecision() keeps deleted example decisions hidden after hydrate", () => {
    useDecisionsStore.getState().hydrate()
    expect(useDecisionsStore.getState().decisions.some((d) => d.id === "static-d1")).toBe(true)

    useDecisionsStore.getState().deleteDecision("static-d1")
    useDecisionsStore.getState().hydrate()

    expect(useDecisionsStore.getState().decisions.some((d) => d.id === "static-d1")).toBe(false)
    const parsed = JSON.parse(mockStorage["decisionos_store"]!)
    expect(parsed.hiddenStaticDecisionIds).toContain("static-d1")
  })
})

describe("useExperimentsStore", () => {
  beforeEach(() => {
    clearMockStorage()
    useDecisionsStore.setState({ decisions: [], isLoading: true, error: null })
    useExperimentsStore.setState({ experiments: [] })
    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      lastSynced: null,
    })
  })

  it("addExperiment() creates with exp-prefixed ID", () => {
    useExperimentsStore.getState().hydrate()

    const newExp = useExperimentsStore.getState().addExperiment({
      number: 1,
      title: "Test Experiment",
      status: "active",
      hypothesis: { metric: "API latency", expected: 200, unit: "ms", rationale: "Caching should halve response time" },
      result: { actual: null, trend: [], startDate: "2024-01-01" },
      confidenceInterval: 50,
    })

    expect(newExp.id).toMatch(/^exp-/)
    expect(newExp.title).toBe("Test Experiment")
  })

  it("addObservation() persists entries to the experiment", () => {
    useExperimentsStore.getState().hydrate()

    const exp = useExperimentsStore.getState().addExperiment({
      number: 1,
      title: "Observation Test",
      status: "active",
      hypothesis: { metric: "Throughput", expected: 1000, unit: "rps", rationale: "Test" },
      result: { actual: null, trend: [], startDate: "2024-01-01" },
      confidenceInterval: 50,
    })

    useExperimentsStore.getState().addObservation(exp.id, "First observation")
    useExperimentsStore.getState().addObservation(exp.id, "Second observation")

    const updated = useExperimentsStore.getState().experiments.find((e) => e.id === exp.id)
    expect(updated?.observations).toHaveLength(2)
    expect(updated?.observations?.[0].text).toBe("Second observation") // newest first
    expect(updated?.observations?.[1].text).toBe("First observation")
  })

  it("updateExperiment() modifies experiment fields", () => {
    useExperimentsStore.getState().hydrate()

    const exp = useExperimentsStore.getState().addExperiment({
      number: 1,
      title: "Update Test",
      status: "active",
      hypothesis: { metric: "Speed", expected: 100, unit: "ms", rationale: "Test" },
      result: { actual: null, trend: [], startDate: "2024-01-01" },
      confidenceInterval: 50,
    })

    useExperimentsStore.getState().updateExperiment(exp.id, { status: "concluded" })

    const updated = useExperimentsStore.getState().experiments.find((e) => e.id === exp.id)
    expect(updated?.status).toBe("concluded")
  })

  it("deleteExperiment() removes from store", () => {
    useExperimentsStore.getState().hydrate()

    const exp = useExperimentsStore.getState().addExperiment({
      number: 1,
      title: "Delete Test",
      status: "active",
      hypothesis: { metric: "Speed", expected: 100, unit: "ms", rationale: "Test" },
      result: { actual: null, trend: [], startDate: "2024-01-01" },
      confidenceInterval: 50,
    })

    useExperimentsStore.getState().deleteExperiment(exp.id)

    expect(useExperimentsStore.getState().experiments.find((e) => e.id === exp.id)).toBeUndefined()
  })
})

describe("useSettingsStore", () => {
  beforeEach(() => {
    clearMockStorage()
    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      lastSynced: null,
    })
  })

  it("updateSettings() patches specific fields", () => {
    useSettingsStore.getState().hydrate()

    useSettingsStore.getState().updateSettings({ theme: "midnight" })

    expect(useSettingsStore.getState().settings.theme).toBe("midnight")
    // Other settings should remain unchanged
    expect(useSettingsStore.getState().settings.reducedMotion).toBe(false)
  })

  it("settings persist through hydrateAllStores()", () => {
    useSettingsStore.getState().hydrate()
    useDecisionsStore.getState().hydrate()
    useExperimentsStore.getState().hydrate()

    // Change a setting
    useSettingsStore.getState().updateSettings({ theme: "twilight", animationIntensity: 30 })

    // Reset store state (simulate page reload)
    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      lastSynced: null,
    })

    // Re-hydrate from localStorage
    hydrateAllStores()

    expect(useSettingsStore.getState().settings.theme).toBe("twilight")
    expect(useSettingsStore.getState().settings.animationIntensity).toBe(30)
  })
})

describe("cross-store operations", () => {
  beforeEach(() => {
    clearMockStorage()
    useDecisionsStore.setState({ decisions: [], isLoading: true, error: null })
    useExperimentsStore.setState({ experiments: [] })
    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      lastSynced: null,
    })
  })

  it("clearAllStores() resets everything", () => {
    hydrateAllStores()

    // Add data
    useDecisionsStore.getState().addDecision(DECISION_DATA)
    useSettingsStore.getState().updateSettings({ theme: "midnight" })

    clearAllStores()

    // Settings should be back to defaults
    expect(useSettingsStore.getState().settings.theme).toBe("void")
    // localStorage should be cleared
    expect(mockStorage["decisionos_store"]).toBeUndefined()
  })

  it("exportStoreJSON() returns valid JSON with all stores", () => {
    hydrateAllStores()

    const json = exportStoreJSON()
    expect(() => JSON.parse(json)).not.toThrow()

    const parsed = JSON.parse(json)
    expect(parsed).toHaveProperty("decisions")
    expect(parsed).toHaveProperty("experiments")
    expect(parsed).toHaveProperty("settings")
    expect(parsed).toHaveProperty("lastSynced")
    expect(parsed).toHaveProperty("hiddenStaticDecisionIds")
  })
})
