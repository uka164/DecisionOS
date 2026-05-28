import { useEffect, useMemo, useState } from "react"
import { create } from "zustand"
import { store as persistence } from "@/lib/store"
import {
  isPersistableDecision,
  isStaticDecisionId,
  mergeWithStaticState,
  STATIC_EXPERIMENTS,
} from "@/lib/mock-data"
import { calculateQualityScoreFromDecision } from "@/lib/utils/calculateQualityScore"
import { generateInsights } from "@/lib/insights"
import type { Decision, Experiment, AppSettings } from "@/lib/types"

// ─── Shared persistence helpers ───────────────────────────────────────────────

function generateId(prefix: "user" | "exp"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function persistAll() {
  const decisionsState = useDecisionsStore.getState()
  const experiments = useExperimentsStore.getState().experiments
  const settings = useSettingsStore.getState().settings
  persistence.set({
    decisions: decisionsState.decisions.filter(isPersistableDecision),
    experiments,
    settings,
    lastSynced: new Date().toISOString(),
    hiddenStaticDecisionIds: decisionsState.hiddenStaticDecisionIds,
  })
}

// ─── Decisions Store ──────────────────────────────────────────────────────────

interface DecisionsState {
  decisions: Decision[]
  hiddenStaticDecisionIds: string[]
  isLoading: boolean
  error: string | null
  hydrate: () => void
  addDecision: (decision: Omit<Decision, "id" | "createdAt" | "qualityScore">) => Decision
  updateDecision: (id: string, patch: Partial<Decision>) => void
  deleteDecision: (id: string) => void
  setError: (error: string | null) => void
}

export const useDecisionsStore = create<DecisionsState>((set) => ({
  decisions: [],
  hiddenStaticDecisionIds: [],
  isLoading: true,
  error: null,

  hydrate: () => {
    const persisted = persistence.get()
    set({
      decisions: mergeWithStaticState(persisted.decisions, persisted.hiddenStaticDecisionIds),
      hiddenStaticDecisionIds: persisted.hiddenStaticDecisionIds,
      isLoading: false,
    })
  },

  addDecision: (data) => {
    const newDecision: Decision = {
      ...data,
      id: generateId("user"),
      createdAt: new Date().toISOString(),
      qualityScore: calculateQualityScoreFromDecision(data),
    }
    set((state) => ({
      decisions: [newDecision, ...state.decisions],
    }))
    persistAll()
    return newDecision
  },

  updateDecision: (id, patch) => {
    set((state) => ({
      decisions: state.decisions.map((d) => {
        if (d.id !== id) return d
        const updated = { ...d, ...patch, updatedAt: new Date().toISOString() }
        return { ...updated, qualityScore: calculateQualityScoreFromDecision(updated) }
      }),
    }))
    persistAll()
  },

  deleteDecision: (id) => {
    set((state) => ({
      decisions: state.decisions.filter((d) => d.id !== id),
      hiddenStaticDecisionIds: isStaticDecisionId(id)
        ? Array.from(new Set([...state.hiddenStaticDecisionIds, id]))
        : state.hiddenStaticDecisionIds,
    }))
    persistAll()
  },

  setError: (error) => set({ error }),
}))

// ─── Experiments Store ────────────────────────────────────────────────────────

interface ExperimentsState {
  experiments: Experiment[]
  hydrate: () => void
  addExperiment: (experiment: Omit<Experiment, "id">) => Experiment
  updateExperiment: (id: string, patch: Partial<Experiment>) => void
  deleteExperiment: (id: string) => void
  addObservation: (experimentId: string, text: string) => void
}

export const useExperimentsStore = create<ExperimentsState>((set) => ({
  experiments: [],

  hydrate: () => {
    const persisted = persistence.get()
    set({
      experiments: persisted.experiments.length > 0
        ? persisted.experiments
        : STATIC_EXPERIMENTS,
    })
  },

  addExperiment: (data) => {
    const newExperiment: Experiment = {
      ...data,
      id: generateId("exp"),
    }
    set((state) => ({
      experiments: [newExperiment, ...state.experiments],
    }))
    persistAll()
    return newExperiment
  },

  updateExperiment: (id, patch) => {
    set((state) => ({
      experiments: state.experiments.map((e) =>
        e.id === id ? { ...e, ...patch } : e
      ),
    }))
    persistAll()
  },

  deleteExperiment: (id) => {
    set((state) => ({
      experiments: state.experiments.filter((e) => e.id !== id),
    }))
    persistAll()
  },

  addObservation: (experimentId, text) => {
    set((state) => ({
      experiments: state.experiments.map((e) => {
        if (e.id !== experimentId) return e
        const entry = { text, timestamp: Date.now() }
        return {
          ...e,
          observations: [entry, ...(e.observations ?? [])],
          updatedAt: new Date().toISOString(),
        }
      }),
    }))
    persistAll()
  },
}))

// ─── Settings Store ───────────────────────────────────────────────────────────

interface SettingsState {
  settings: AppSettings
  lastSynced: string | null
  hydrate: () => void
  updateSettings: (patch: Partial<AppSettings>) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {
    theme: "void",
    reducedMotion: false,
    animationIntensity: 70,
    ambientMotion: false,
    notifyRevisits: false,
  },
  lastSynced: null,

  hydrate: () => {
    const persisted = persistence.get()
    set({
      settings: persisted.settings,
      lastSynced: persisted.lastSynced,
    })
  },

  updateSettings: (patch) => {
    set((state) => ({
      settings: { ...state.settings, ...patch },
    }))
    persistAll()
  },
}))

// ─── Store Actions (non-hook, callable from anywhere) ─────────────────────────

export function exportStoreJSON(): string {
  return persistence.exportJSON()
}

export function importStoreData(
  file: File,
  mode: "overwrite" | "merge"
): Promise<{ ok: boolean; added: number; updated: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = persistence.importJSON(reader.result as string, mode)
      if (result.ok) {
        // Re-sync all stores from persisted state
        useDecisionsStore.getState().hydrate()
        useExperimentsStore.getState().hydrate()
        useSettingsStore.getState().hydrate()
      }
      resolve(result)
    }
    reader.onerror = () => resolve({ ok: false, added: 0, updated: 0 })
    reader.readAsText(file)
  })
}

export function clearAllStores(): void {
  persistence.clear()
  useDecisionsStore.getState().hydrate()
  useExperimentsStore.getState().hydrate()
  useSettingsStore.getState().hydrate()
}

// ─── Hydration hook (call once in layout) ─────────────────────────────────────

export function hydrateAllStores(): void {
  useDecisionsStore.getState().hydrate()
  useExperimentsStore.getState().hydrate()
  useSettingsStore.getState().hydrate()
}

// ─── Cross-tab sync ───────────────────────────────────────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "decisionos_store") {
      useDecisionsStore.getState().hydrate()
      useExperimentsStore.getState().hydrate()
      useSettingsStore.getState().hydrate()
    }
  })
}

// ─── Insights selector ───────────────────────────────────────────────────────

export const useDecisionInsights = () => {
  const decisions = useDecisionsStore((state) => state.decisions)
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()

    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  return useMemo(() => (now == null ? null : generateInsights(decisions, now)), [decisions, now])
}
