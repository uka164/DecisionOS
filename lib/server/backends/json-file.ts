import { promises as fs } from "node:fs"
import path from "node:path"
import type { RemoteSnapshot } from "@/lib/types"
import { coerceSnapshot, type StoreBackend } from "./types"

// Dependency-free fallback: a single JSON file with atomic writes. Used when
// neither Postgres (DATABASE_URL) nor node:sqlite is available, or when forced
// with DECISIONOS_STORE=json.

const DATA_DIR = path.join(process.cwd(), ".data")
const STORE_FILE = path.join(DATA_DIR, "decisionos.json")

export function createJsonFileBackend(): StoreBackend {
  return {
    name: "json-file",
    async readSnapshot() {
      try {
        const raw = await fs.readFile(STORE_FILE, "utf8")
        return coerceSnapshot(JSON.parse(raw))
      } catch {
        return null
      }
    },
    async writeSnapshot(snapshot: RemoteSnapshot) {
      await fs.mkdir(DATA_DIR, { recursive: true })
      // Atomic: write temp then rename, so a crash mid-write can't corrupt it.
      const tmp = path.join(DATA_DIR, `.decisionos.${process.pid}.${Date.now()}.tmp`)
      await fs.writeFile(tmp, JSON.stringify(snapshot), "utf8")
      await fs.rename(tmp, STORE_FILE)
    },
  }
}
