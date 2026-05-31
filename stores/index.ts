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
import { getRemote, putRemote } from "@/lib/sync"
import type { Decision, Experiment, AppSettings, RemoteSnapshot } from "@/lib/types"

// ─── Shared persistence helpers ───────────────────────────────────────────────

function generateId(prefix: "user" | "exp"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** Write the localStorage cache only (no server push). */
function writeLocalCache() {
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

/** The shared content that syncs to the durable server (settings excluded —
 *  theme/identity/motion stay device-local). */
function buildSnapshot(): Omit<RemoteSnapshot, "updatedAt"> {
  const decisionsState = useDecisionsStore.getState()
  return {
    decisions: decisionsState.decisions.filter(isPersistableDecision),
    experiments: useExperimentsStore.getState().experiments,
    hiddenStaticDecisionIds: decisionsState.hiddenStaticDecisionIds,
  }
}

/** Called after every mutation: cache locally, then debounce a server push. */
function persistAll() {
  writeLocalCache()
  markLocalMutation()
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
  addComment: (decisionId: string, text: string, answersDecisiveQuestion?: boolean) => void
  deleteComment: (decisionId: string, commentId: string) => void
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

  // Comments are decision activity, not decision progress — they intentionally
  // do NOT bump updatedAt or recompute qualityScore (so a comment never resets
  // the aging/staleness signals).
  addComment: (decisionId, text, answersDecisiveQuestion) => {
    const body = text.trim()
    if (!body) return
    const author = useSettingsStore.getState().settings.displayName?.trim() || "You"
    const comment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author,
      text: body,
      createdAt: new Date().toISOString(),
      ...(answersDecisiveQuestion ? { answersDecisiveQuestion: true } : {}),
    }
    set((state) => ({
      decisions: state.decisions.map((d) =>
        d.id === decisionId ? { ...d, comments: [...(d.comments ?? []), comment] } : d
      ),
    }))
    persistAll()
  },

  deleteComment: (decisionId, commentId) => {
    set((state) => ({
      decisions: state.decisions.map((d) =>
        d.id === decisionId
          ? { ...d, comments: (d.comments ?? []).filter((c) => c.id !== commentId) }
          : d
      ),
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
    // Settings are device-local — cache them, but don't push to the shared
    // server (so changing your theme doesn't ping everyone's sync).
    writeLocalCache()
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
        markLocalMutation()
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
  // Propagate the reset to the server too, so "reset" means reset (and a poll
  // can't pull the wiped data back in).
  markLocalMutation()
}

// ─── Sync (durable server-backed persistence) ─────────────────────────────────
// localStorage is the instant offline cache; the server file is the source of
// truth once reachable. Settings stay device-local. Conflict model is
// last-write-wins at the snapshot level, guarded so an in-progress local edit is
// never clobbered by a poll. CRDT/OT would be the upgrade for heavy concurrency.

export type SyncMode = "local" | "syncing" | "synced" | "error"

interface SyncState {
  mode: SyncMode
  lastSyncedAt: string | null
  serverAvailable: boolean
}

export const useSyncStore = create<SyncState>(() => ({
  mode: "local",
  lastSyncedAt: null,
  serverAvailable: false,
}))

let lastAppliedRemoteAt: string | null = null
let pendingPush = false
let pushTimer: ReturnType<typeof setTimeout> | null = null
let syncInitialized = false
const PUSH_DEBOUNCE_MS = 800
const POLL_INTERVAL_MS = 20_000

function setSync(patch: Partial<SyncState>) {
  useSyncStore.setState(patch)
}

/** Mark local state dirty and debounce a push (only meaningful once a server
 *  is known reachable; otherwise the change is safe in localStorage and will
 *  push when the server appears). */
function markLocalMutation() {
  pendingPush = true
  if (!useSyncStore.getState().serverAvailable) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => void pushNow(), PUSH_DEBOUNCE_MS)
}

async function pushNow() {
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null }
  if (!useSyncStore.getState().serverAvailable) return
  setSync({ mode: "syncing" })
  const res = await putRemote(buildSnapshot())
  if (res.ok) {
    pendingPush = false
    lastAppliedRemoteAt = res.updatedAt ?? lastAppliedRemoteAt
    setSync({ mode: "synced", lastSyncedAt: res.updatedAt ?? new Date().toISOString() })
  } else {
    setSync({ mode: "error" })
  }
}

function applySnapshot(snapshot: RemoteSnapshot) {
  useDecisionsStore.setState({
    decisions: mergeWithStaticState(snapshot.decisions, snapshot.hiddenStaticDecisionIds),
    hiddenStaticDecisionIds: snapshot.hiddenStaticDecisionIds,
    isLoading: false,
  })
  useExperimentsStore.setState({
    experiments: snapshot.experiments.length > 0 ? snapshot.experiments : STATIC_EXPERIMENTS,
  })
  writeLocalCache()
  lastAppliedRemoteAt = snapshot.updatedAt
}

async function syncFromServer() {
  const { available, snapshot } = await getRemote()
  if (!available) {
    setSync({ mode: "local", serverAvailable: false })
    return
  }
  if (!useSyncStore.getState().serverAvailable) setSync({ serverAvailable: true })

  // Unpushed local changes win — push them and don't overwrite ourselves.
  if (pendingPush) { await pushNow(); return }

  if (snapshot && snapshot.decisions.length > 0) {
    if (snapshot.updatedAt !== lastAppliedRemoteAt) applySnapshot(snapshot)
    setSync({ mode: "synced", lastSyncedAt: snapshot.updatedAt })
  } else {
    // Server empty → seed it from local state on first run.
    const local = buildSnapshot()
    if (local.decisions.length > 0 || local.experiments.length > 0) {
      await pushNow()
    } else {
      setSync({ mode: "synced" })
    }
  }
}

/** Manual "sync now" for the UI. */
export function syncNow(): void {
  void syncFromServer()
}

function initSync(): void {
  if (syncInitialized || typeof window === "undefined") return
  syncInitialized = true
  void syncFromServer()
  if (typeof window.addEventListener === "function") {
    window.addEventListener("focus", () => void syncFromServer())
  }
  if (typeof setInterval === "function") {
    setInterval(() => void syncFromServer(), POLL_INTERVAL_MS)
  }
}

// ─── Hydration hook (call once in layout) ─────────────────────────────────────

export function hydrateAllStores(): void {
  useDecisionsStore.getState().hydrate()
  useExperimentsStore.getState().hydrate()
  useSettingsStore.getState().hydrate()
  initSync()
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
