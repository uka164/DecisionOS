import { NextResponse } from "next/server"
import { readSnapshot, writeSnapshot, storeBackendName } from "@/lib/server-store"
import type { RemoteSnapshot } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET — current durable snapshot. `available` lets the client confirm a real
// server backs this instance; `backend` reports which store is active.
export async function GET() {
  const [snapshot, backend] = await Promise.all([readSnapshot(), storeBackendName()])
  return NextResponse.json({ available: true, snapshot, backend })
}

// PUT — replace the durable snapshot. Light validation only: this is the user's
// own instance, and the client already runs the data through zod.
export async function PUT(req: Request) {
  let body: Partial<RemoteSnapshot>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  if (!Array.isArray(body.decisions) || !Array.isArray(body.experiments)) {
    return NextResponse.json({ error: "Malformed snapshot." }, { status: 400 })
  }

  const snapshot: RemoteSnapshot = {
    decisions: body.decisions,
    experiments: body.experiments,
    hiddenStaticDecisionIds: Array.isArray(body.hiddenStaticDecisionIds)
      ? body.hiddenStaticDecisionIds
      : [],
    updatedAt: new Date().toISOString(),
  }

  try {
    await writeSnapshot(snapshot)
    return NextResponse.json({ ok: true, updatedAt: snapshot.updatedAt })
  } catch {
    return NextResponse.json({ error: "Failed to persist snapshot." }, { status: 500 })
  }
}
