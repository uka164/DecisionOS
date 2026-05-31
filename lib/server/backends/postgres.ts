import { Pool } from "pg"
import type { RemoteSnapshot } from "@/lib/types"
import { coerceSnapshot, type StoreBackend } from "./types"

// Cloud / serverless-friendly backend. This is what makes "new laptop / true
// multi-device" real: the data lives in a managed Postgres, not on an ephemeral
// container filesystem. Selected automatically when DATABASE_URL is set.
//
// One JSONB document in one row — same model as the other backends, so the sync
// layer is unchanged. Normalize into tables later if query needs arise.

let pool: Pool | null = null
let ready: Promise<void> | null = null

function getPool(connectionString: string): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      // Most managed Postgres (Neon, Supabase, RDS) require TLS.
      ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
      max: 3,
    })
  }
  return pool
}

async function ensureSchema(p: Pool): Promise<void> {
  if (!ready) {
    ready = p
      .query(
        "CREATE TABLE IF NOT EXISTS decisionos_store (id INT PRIMARY KEY DEFAULT 1, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
      )
      .then(() => undefined)
  }
  return ready
}

export function createPostgresBackend(connectionString: string): StoreBackend {
  const p = getPool(connectionString)

  return {
    name: "postgres",
    async readSnapshot() {
      await ensureSchema(p)
      const res = await p.query<{ data: unknown }>("SELECT data FROM decisionos_store WHERE id = 1")
      if (res.rows.length === 0) return null
      return coerceSnapshot(res.rows[0].data)
    },
    async writeSnapshot(snapshot: RemoteSnapshot) {
      await ensureSchema(p)
      await p.query(
        `INSERT INTO decisionos_store (id, data, updated_at)
         VALUES (1, $1, now())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [JSON.stringify(snapshot)]
      )
    },
  }
}
