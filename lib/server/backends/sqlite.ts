import { createRequire } from "node:module"
import path from "node:path"
import { mkdirSync } from "node:fs"
import type { RemoteSnapshot } from "@/lib/types"
import { coerceSnapshot, type StoreBackend } from "./types"

// Real local database via Node's built-in node:sqlite (Node 22.5+). Zero
// dependencies, transactional, durable — the honest default for local/self-host.
// The snapshot lives as one JSON document in a single row.
//
// Loading node:sqlite: prefer process.getBuiltinModule (Node 22.3+), which
// returns the real builtin and bypasses the bundler — Turbopack otherwise
// rewrites require()/import and the load fails. createRequire is the fallback.
// A minimal local type keeps the build off the (experimental) @types decls.

interface SqliteStatement {
  get(...params: unknown[]): unknown
  run(...params: unknown[]): unknown
}
interface SqliteDatabase {
  exec(sql: string): void
  prepare(sql: string): SqliteStatement
}
type DatabaseSyncCtor = new (filename: string) => SqliteDatabase
type SqliteModule = { DatabaseSync: DatabaseSyncCtor }

function loadSqlite(): SqliteModule {
  const proc = process as NodeJS.Process & { getBuiltinModule?: (id: string) => unknown }
  if (typeof proc.getBuiltinModule === "function") {
    return proc.getBuiltinModule("node:sqlite") as SqliteModule
  }
  return createRequire(import.meta.url)("node:sqlite") as SqliteModule
}

const DATA_DIR = path.join(process.cwd(), ".data")
const DB_FILE = path.join(DATA_DIR, "decisionos.sqlite")

export function createSqliteBackend(): StoreBackend {
  mkdirSync(DATA_DIR, { recursive: true })

  const { DatabaseSync } = loadSqlite()
  const db = new DatabaseSync(DB_FILE)
  db.exec("PRAGMA journal_mode = WAL;")
  db.exec(
    "CREATE TABLE IF NOT EXISTS store (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)"
  )

  const selectStmt = db.prepare("SELECT data FROM store WHERE id = 1")
  const upsertStmt = db.prepare(
    "INSERT INTO store (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data"
  )

  return {
    name: "sqlite",
    async readSnapshot() {
      const row = selectStmt.get() as { data?: string } | undefined
      if (!row?.data) return null
      try {
        return coerceSnapshot(JSON.parse(row.data))
      } catch {
        return null
      }
    },
    async writeSnapshot(snapshot: RemoteSnapshot) {
      upsertStmt.run(JSON.stringify(snapshot))
    },
  }
}
