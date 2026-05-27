import type { StoreState, AppSettings } from "./types"
import { needsMigration, migrateV1toV2 } from "./migrations/v1-to-v2"
import { z } from "zod"

const STORAGE_KEY = "decisionos_store"

const VALID_THEMES: AppSettings["theme"][] = ["void", "midnight", "twilight", "dawn"]

const DEFAULT_SETTINGS: AppSettings = {
  theme: "void",
  reducedMotion: false,
  animationIntensity: 70,
  ambientMotion: true,
}

type QuotaErrorHandler = (message: string) => void

let _onQuotaError: QuotaErrorHandler | null = null

export function setQuotaErrorHandler(handler: QuotaErrorHandler): void {
  _onQuotaError = handler
}

function isClient(): boolean {
  return typeof window !== "undefined"
}

/** Deep-copy defaults so consumers can never mutate the module-level constants. */
function freshDefaults(): StoreState {
  return {
    decisions: [],
    experiments: [],
    settings: { ...DEFAULT_SETTINGS },
    lastSynced: null,
    hiddenStaticDecisionIds: [],
  }
}

const tradeoffSchema = z.object({
  axis: z.string(),
  value: z.number(),
})

const decisionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  status: z.enum(["draft", "in-progress", "decided", "archived", "voided", "superseded"]),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  impact: z.number(),
  qualityScore: z.number(),
  tags: z.array(z.string()),
  rawThinking: z.string(),
  tradeoffs: z.array(tradeoffSchema),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).nullable(),
  badges: z.array(z.object({
    label: z.string(),
    type: z.enum(["default", "purple", "amber", "emerald", "rose"]),
  })),
  metric: z.string().optional(),
  metricLabel: z.string().optional(),
  metricColor: z.string().optional(),
  rfcData: z.object({
    title: z.string(),
    context: z.string(),
    proposal: z.string(),
    tradeoffs: z.string(),
    decision: z.string(),
  }).optional(),
  options: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })),
  preMortem: z.string().optional(),
  retrospective: z.string().optional(),
  constraints: z.array(z.string()),
  risks: z.array(z.object({
    text: z.string(),
    severity: z.number(),
  })),
  echoTargets: z.array(z.string()).optional(),
  summary: z.string().optional(),
  experiments: z.array(z.string()).optional(),
  regret: z.boolean().optional(),
  revisitAt: z.string().optional(),
  gotWrong: z.string().optional(),
})

const experimentSchema = z.object({
  id: z.string().min(1),
  number: z.number(),
  title: z.string(),
  status: z.enum(["active", "paused", "concluded"]),
  hypothesis: z.object({
    metric: z.string(),
    expected: z.number(),
    unit: z.string(),
    rationale: z.string(),
  }),
  result: z.object({
    actual: z.number().nullable(),
    trend: z.array(z.number()),
    startDate: z.string(),
    endDate: z.string().optional(),
  }),
  confidenceInterval: z.number(),
  decisionId: z.string().optional(),
  observations: z.array(z.object({
    text: z.string(),
    timestamp: z.number(),
  })).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

const importSchema = z.object({
  decisions: z.array(decisionSchema),
  experiments: z.array(experimentSchema).optional(),
  hiddenStaticDecisionIds: z.array(z.string()).optional(),
})

function parseDecisions(value: unknown): StoreState["decisions"] {
  const result = z.array(decisionSchema).safeParse(value)
  return result.success ? result.data : []
}

function parseExperiments(value: unknown): StoreState["experiments"] {
  const result = z.array(experimentSchema).safeParse(value)
  return result.success ? result.data : []
}

function parseHiddenStaticDecisionIds(value: unknown): string[] {
  const result = z.array(z.string()).safeParse(value)
  return result.success ? result.data : []
}

function normalizeSettings(settings?: Partial<AppSettings>): AppSettings {
  const theme = settings?.theme

  return {
    theme: theme && VALID_THEMES.includes(theme) ? theme : DEFAULT_SETTINGS.theme,
    reducedMotion: settings?.reducedMotion ?? DEFAULT_SETTINGS.reducedMotion,
    animationIntensity: settings?.animationIntensity ?? DEFAULT_SETTINGS.animationIntensity,
    ambientMotion: settings?.ambientMotion ?? DEFAULT_SETTINGS.ambientMotion,
  }
}

export const store = {
  get(): StoreState {
    if (!isClient()) return freshDefaults()
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return freshDefaults()

      let parsed = JSON.parse(raw) as Record<string, unknown>

      if (needsMigration(parsed)) {
        parsed = migrateV1toV2(parsed)
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
        } catch {
          // Non-fatal — migrated state still used in memory this session.
        }
      }

      return {
        decisions: parseDecisions(parsed.decisions),
        experiments: parseExperiments(parsed.experiments),
        settings: normalizeSettings(parsed.settings as Partial<AppSettings>),
        lastSynced: (parsed.lastSynced as string | null) ?? null,
        hiddenStaticDecisionIds: parseHiddenStaticDecisionIds(parsed.hiddenStaticDecisionIds),
      }
    } catch {
      return freshDefaults()
    }
  },

  set(state: StoreState): boolean {
    if (!isClient()) return false
    try {
      const payload = JSON.stringify({ schemaVersion: 3, ...state, lastSynced: new Date().toISOString() })
      window.localStorage.setItem(STORAGE_KEY, payload)
      return true
    } catch (err) {
      if (err instanceof DOMException && err.name === "QuotaExceededError") {
        _onQuotaError?.("Storage quota exceeded. Some data may not be saved.")
      }
      return false
    }
  },

  clear(): void {
    if (!isClient()) return
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  },

  exportJSON(): string {
    const state = store.get()
    return JSON.stringify(state, null, 2)
  },

  patch(updater: (prev: StoreState) => StoreState): boolean {
    const current = store.get()
    const next = updater(current)
    return store.set(next)
  },

  /**
   * Import a JSON string (in StoreState format) into the store.
   * mode "overwrite": imported version wins for matching IDs, new items are added.
   * mode "merge":     existing version wins for matching IDs, only truly new items are added.
   * Settings are never overwritten — the user's current preferences are preserved.
   */
  importJSON(json: string, mode: "overwrite" | "merge"): { ok: boolean; added: number; updated: number } {
    if (!isClient()) return { ok: false, added: 0, updated: 0 }
    try {
      const parsed = importSchema.parse(JSON.parse(json))

      const current = store.get()

      const existingDecisionMap = new Map(current.decisions.map((d) => [d.id, d]))
      const importedDecisions = parsed.decisions
      let added = 0
      let updated = 0

      const nextDecisions = [...current.decisions]

      for (const imported of importedDecisions) {
        if (existingDecisionMap.has(imported.id)) {
          if (mode === "overwrite") {
            const idx = nextDecisions.findIndex((d) => d.id === imported.id)
            if (idx !== -1) { nextDecisions[idx] = imported; updated++ }
          }
          // merge mode: existing wins — skip
        } else {
          nextDecisions.push(imported)
          added++
        }
      }

      // Same logic for experiments
      const existingExpMap = new Map(current.experiments.map((e) => [e.id, e]))
      const importedExps = parsed.experiments ?? []
      const nextExperiments = [...current.experiments]

      for (const imported of importedExps) {
        if (existingExpMap.has(imported.id)) {
          if (mode === "overwrite") {
            const idx = nextExperiments.findIndex((e) => e.id === imported.id)
            if (idx !== -1) nextExperiments[idx] = imported
          }
        } else {
          nextExperiments.push(imported)
        }
      }

      const hiddenStaticDecisionIds = Array.from(new Set([
        ...current.hiddenStaticDecisionIds,
        ...(parsed.hiddenStaticDecisionIds ?? []),
      ]))
      const saved = store.set({ ...current, decisions: nextDecisions, experiments: nextExperiments, hiddenStaticDecisionIds })
      return saved ? { ok: true, added, updated } : { ok: false, added: 0, updated: 0 }
    } catch {
      return { ok: false, added: 0, updated: 0 }
    }
  },
}
