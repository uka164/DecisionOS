import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import {
  CRITIQUE_SYSTEM_PROMPT,
  CRITIQUE_TOOL,
  MIN_CRITIQUE_CHARS,
  critiqueSourceChars,
  renderDecisionForCritique,
  resolveModel,
  type CritiquePayload,
  type CritiqueToolResult,
} from "@/lib/ai/critique"
import type { AICritique, AICritiqueSeverity } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// GET — lets the UI know whether a key is configured without attempting a call.
export function GET() {
  return NextResponse.json({ configured: Boolean(process.env.ANTHROPIC_API_KEY) })
}

const SEVERITIES: AICritiqueSeverity[] = ["low", "medium", "high"]

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback
  return Math.min(max, Math.max(min, v))
}

function asStringArray(v: unknown, cap: number): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, cap)
}

function normalizeBlindSpots(v: unknown): AICritique["blindSpots"] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object")
    .slice(0, 6)
    .map((x) => ({
      title: typeof x.title === "string" ? x.title : "Gap",
      detail: typeof x.detail === "string" ? x.detail : "",
      severity: SEVERITIES.includes(x.severity as AICritiqueSeverity)
        ? (x.severity as AICritiqueSeverity)
        : "medium",
    }))
    .filter((b) => b.detail.trim().length > 0)
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI critique isn't configured. Add an ANTHROPIC_API_KEY to your environment to enable it.",
        code: "no_key",
      },
      { status: 503 }
    )
  }

  let body: { payload?: CritiquePayload; model?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body.", code: "bad_request" }, { status: 400 })
  }

  const payload = body.payload
  if (!payload || typeof payload.rawThinking !== "string") {
    return NextResponse.json({ error: "Missing decision payload.", code: "bad_request" }, { status: 400 })
  }

  const sourceChars = critiqueSourceChars(payload)
  if (sourceChars < MIN_CRITIQUE_CHARS) {
    return NextResponse.json(
      {
        error: "There isn't enough reasoning to critique yet. Add your thinking, then try again.",
        code: "too_thin",
      },
      { status: 400 }
    )
  }

  const model = resolveModel(body.model)
  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 2048,
      // Stable instructions in a cached block; variable decision in the user turn.
      system: [
        {
          type: "text",
          text: CRITIQUE_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [CRITIQUE_TOOL as unknown as Anthropic.Tool],
      tool_choice: { type: "tool", name: "submit_critique" },
      messages: [{ role: "user", content: renderDecisionForCritique(payload) }],
    })

    const toolBlock = message.content.find((b) => b.type === "tool_use")
    if (!toolBlock || toolBlock.type !== "tool_use") {
      return NextResponse.json(
        { error: "The model did not return a structured critique. Try again.", code: "no_output" },
        { status: 502 }
      )
    }

    const raw = toolBlock.input as Partial<CritiqueToolResult>
    const critique: AICritique = {
      model,
      createdAt: new Date().toISOString(),
      sourceChars,
      verdict: typeof raw.verdict === "string" ? raw.verdict : "No verdict returned.",
      reasoningConfidence: clampInt(raw.reasoningConfidence, 0, 100, 50),
      strongestCounter: typeof raw.strongestCounter === "string" ? raw.strongestCounter : "",
      unstatedAssumptions: asStringArray(raw.unstatedAssumptions, 6),
      blindSpots: normalizeBlindSpots(raw.blindSpots),
      steelmanAlternative: typeof raw.steelmanAlternative === "string" ? raw.steelmanAlternative : "",
      decisiveQuestion: typeof raw.decisiveQuestion === "string" ? raw.decisiveQuestion : "",
    }

    return NextResponse.json({ critique })
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      const status = err.status ?? 500
      const message =
        status === 401
          ? "The ANTHROPIC_API_KEY was rejected. Check that it's valid."
          : status === 429
          ? "Rate limited by the API. Wait a moment and try again."
          : status === 529
          ? "The model is overloaded right now. Try again shortly."
          : "The AI request failed. Try again."
      return NextResponse.json({ error: message, code: "api_error" }, { status })
    }
    return NextResponse.json(
      { error: "Unexpected error generating the critique.", code: "unknown" },
      { status: 500 }
    )
  }
}
