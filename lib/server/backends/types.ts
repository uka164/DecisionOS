import type { RemoteSnapshot } from "@/lib/types"

/**
 * A durable store backend. The whole app talks to the store through this
 * interface, so swapping JSON-file ↔ SQLite ↔ Postgres is a one-line change in
 * the selector (lib/server-store.ts) — nothing else in the codebase moves.
 *
 * The snapshot is stored as a single document (one row / one file). That's the
 * honest fit for the snapshot-based sync model; normalizing decisions into
 * columns would be a larger change with no benefit until queries need it.
 */
export interface StoreBackend {
  /** Short id for diagnostics / the sync UI: "json-file" | "sqlite" | "postgres". */
  name: string
  readSnapshot(): Promise<RemoteSnapshot | null>
  writeSnapshot(snapshot: RemoteSnapshot): Promise<void>
}

/** Normalize whatever was read back into a well-formed snapshot (or null). */
export function coerceSnapshot(parsed: unknown): RemoteSnapshot | null {
  if (!parsed || typeof parsed !== "object") return null
  const p = parsed as Partial<RemoteSnapshot>
  if (!Array.isArray(p.decisions)) return null
  return {
    decisions: p.decisions,
    experiments: Array.isArray(p.experiments) ? p.experiments : [],
    hiddenStaticDecisionIds: Array.isArray(p.hiddenStaticDecisionIds)
      ? p.hiddenStaticDecisionIds
      : [],
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : new Date(0).toISOString(),
  }
}
