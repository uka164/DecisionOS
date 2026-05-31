import type { RemoteSnapshot } from "./types"
import type { StoreBackend } from "./server/backends/types"

// Durable store selector. Source of truth lives server-side (not in the
// browser), so clearing the cache / switching browsers / incognito no longer
// loses anything. Backend is chosen by environment, memoized for the process:
//
//   DATABASE_URL set          → Postgres   (cloud / serverless / multi-device)
//   DECISIONOS_STORE=json     → JSON file  (escape hatch / no native sqlite)
//   otherwise                 → SQLite     (real local DB; default)
//   sqlite load fails         → JSON file  (last-resort fallback)
//
// Backends share one interface, so swapping is a change *only* here.

let backendPromise: Promise<StoreBackend> | null = null

async function resolveBackend(): Promise<StoreBackend> {
  if (process.env.DATABASE_URL) {
    const { createPostgresBackend } = await import("./server/backends/postgres")
    return createPostgresBackend(process.env.DATABASE_URL)
  }

  if (process.env.DECISIONOS_STORE !== "json") {
    try {
      const { createSqliteBackend } = await import("./server/backends/sqlite")
      return createSqliteBackend()
    } catch {
      // node:sqlite unavailable (older Node, or disabled) → fall through.
    }
  }

  const { createJsonFileBackend } = await import("./server/backends/json-file")
  return createJsonFileBackend()
}

function getBackend(): Promise<StoreBackend> {
  if (!backendPromise) backendPromise = resolveBackend()
  return backendPromise
}

export async function readSnapshot(): Promise<RemoteSnapshot | null> {
  return (await getBackend()).readSnapshot()
}

export async function writeSnapshot(snapshot: RemoteSnapshot): Promise<void> {
  return (await getBackend()).writeSnapshot(snapshot)
}

export async function storeBackendName(): Promise<string> {
  return (await getBackend()).name
}
