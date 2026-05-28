/**
 * Legacy localStorage migration.
 *
 * v1: raw JSON blob with no schemaVersion field.
 * v2: first versioned localStorage blob.
 * v3: preserves execution metadata and normalises riskLevel.
 */

// Required Decision fields that may be absent in v1 payloads
const CURRENT_SCHEMA_VERSION = 3
const VALID_RISK_LEVELS = new Set(["low", "medium", "high", "critical"])

const DECISION_ARRAY_DEFAULTS: Record<string, unknown[]> = {
  tags: [],
  constraints: [],
  risks: [],
  badges: [],
  options: [],
  tradeoffs: [],
  executionTrail: [],
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
  return typeof version !== "number" || version < CURRENT_SCHEMA_VERSION
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
        if (normalised.riskLevel !== null && !VALID_RISK_LEVELS.has(String(normalised.riskLevel))) {
          normalised.riskLevel = null
        }

        return normalised
      })
    : []

  return {
    ...raw,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    decisions,
    experiments: Array.isArray(raw.experiments) ? raw.experiments : [],
    lastSynced: typeof raw.lastSynced === "string" ? raw.lastSynced : null,
  }
}
