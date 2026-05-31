import type { RemoteSnapshot } from "./types"

// Thin client over /api/store. All calls fail soft: if the server isn't there
// (static export, serverless with no FS, network down), the app keeps working
// on its localStorage cache and reports "offline".

export interface RemoteResult {
  available: boolean
  snapshot: RemoteSnapshot | null
}

export async function getRemote(signal?: AbortSignal): Promise<RemoteResult> {
  try {
    const res = await fetch("/api/store", { signal, cache: "no-store" })
    if (!res.ok) return { available: false, snapshot: null }
    const data = (await res.json()) as RemoteResult
    return { available: Boolean(data.available), snapshot: data.snapshot ?? null }
  } catch {
    return { available: false, snapshot: null }
  }
}

export async function putRemote(
  snapshot: Omit<RemoteSnapshot, "updatedAt">
): Promise<{ ok: boolean; updatedAt?: string }> {
  try {
    const res = await fetch("/api/store", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
      cache: "no-store",
    })
    if (!res.ok) return { ok: false }
    const data = (await res.json()) as { ok: boolean; updatedAt?: string }
    return data
  } catch {
    return { ok: false }
  }
}
