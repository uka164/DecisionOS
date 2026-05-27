/**
 * v1 → v2 migration
 *
 * v1: raw JSON blob with no schemaVersion field.
 *     decisions may be missing array fields introduced after initial release.
 * v2: adds schemaVersion: 2 and normalises all required Decision array fields
 *     so the rest of the app can assume they are always present.
 *
 * Rollback: The migration writes schemaVersion: 2 back to localStorage.
 *   To revert to v1, clear localStorage — no data is deleted, only defaults added.
 */

// Required Decision fields that may be absent in v1 payloads
const DECISION_ARRAY_DEFAULTS: Record<string, unknown[]> = {
  tags: [],
  constraints: [],
  risks: [],
  badges: [],
  options: [],
  tradeoffs: [],
}

const DECISION_STRING_DEFAULTS: Record<string, string> = {
  rawThinking: "",
  title: "",
  id: "",
  status: "draft",
  createdAt: new Date(0).toISOString(),
}

export function needsMigration(raw: Record<string, unknown>): boolean {
  const version = raw.schemaVersion
  return typeof version !== "number" || version < 2
}

export function migrateV1toV2(raw: Record<string, unknown>): Record<string, unknown> {
  const decisions = Array.isArray(raw.decisions)
    ? (raw.decisions as Record<string, unknown>[]).map((d) => {
        const normalised: Record<string, unknown> = { ...d }

        for (const [field, def] of Object.entries(DECISION_ARRAY_DEFAULTS)) {
          if (!Array.isArray(normalised[field])) normalised[field] = def
        }

        for (const [field, def] of Object.entries(DECISION_STRING_DEFAULTS)) {
          if (typeof normalised[field] !== "string") normalised[field] = def
        }

        if (typeof normalised.impact !== "number") normalised.impact = 3
        if (typeof normalised.qualityScore !== "number") normalised.qualityScore = 0

        return normalised
      })
    : []

  return {
    ...raw,
    schemaVersion: 2,
    decisions,
    experiments: Array.isArray(raw.experiments) ? raw.experiments : [],
    lastSynced: typeof raw.lastSynced === "string" ? raw.lastSynced : null,
  }
}
