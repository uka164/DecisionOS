import type { Decision, AICritique } from "@/lib/types"

// ─── Models ─────────────────────────────────────────────────────────────────
// Opus is the default — the critique is the moment where reasoning quality
// matters most. Sonnet is the fast/cheaper override for routine checks.

export const CRITIQUE_MODELS = {
  opus: "claude-opus-4-8",
  sonnet: "claude-sonnet-4-6",
} as const

export type CritiqueModelKey = keyof typeof CRITIQUE_MODELS
export const DEFAULT_CRITIQUE_MODEL: CritiqueModelKey = "opus"

export const MODEL_LABELS: Record<CritiqueModelKey, string> = {
  opus: "Opus 4.8",
  sonnet: "Sonnet 4.6",
}

export function resolveModel(key: string | undefined): string {
  if (key && key in CRITIQUE_MODELS) return CRITIQUE_MODELS[key as CritiqueModelKey]
  return CRITIQUE_MODELS[DEFAULT_CRITIQUE_MODEL]
}

// ─── Request payload ──────────────────────────────────────────────────────────
// Only the reasoning-relevant fields are sent to the model. We deliberately omit
// quality scores, timestamps, ids — the model should judge the argument, not the
// metadata around it.

export interface CritiquePayload {
  title: string
  status: string
  impact: number
  riskLevel: string | null
  rawThinking: string
  summary?: string
  options: { title: string; description?: string }[]
  tradeoffs: { axis: string; value: number }[]
  constraints: string[]
  risks: { text: string; severity: number }[]
  preMortem?: string
  valuesAtStake?: string
  humanCost?: string
  guidingPrinciple?: string
}

const cap = (s: string | undefined, n: number) => (s ?? "").slice(0, n)

export function buildCritiquePayload(d: Decision): CritiquePayload {
  return {
    title: cap(d.title, 300),
    status: d.status,
    impact: d.impact,
    riskLevel: d.riskLevel,
    rawThinking: cap(d.rawThinking, 8000),
    summary: d.summary ? cap(d.summary, 1500) : undefined,
    options: d.options.slice(0, 8).map((o) => ({
      title: cap(o.title, 200),
      description: o.description ? cap(o.description, 800) : undefined,
    })),
    tradeoffs: d.tradeoffs.slice(0, 12).map((t) => ({ axis: t.axis, value: t.value })),
    constraints: d.constraints.slice(0, 20).map((c) => cap(c, 120)),
    risks: d.risks.slice(0, 20).map((r) => ({ text: cap(r.text, 300), severity: r.severity })),
    preMortem: d.preMortem ? cap(d.preMortem, 3000) : undefined,
    valuesAtStake: d.valuesAtStake ? cap(d.valuesAtStake, 1500) : undefined,
    humanCost: d.humanCost ? cap(d.humanCost, 1500) : undefined,
    guidingPrinciple: d.guidingPrinciple ? cap(d.guidingPrinciple, 1500) : undefined,
  }
}

/** How much actual reasoning text exists — used to gate the feature and to flag
 *  when a decision has materially changed since its last critique. */
export function critiqueSourceChars(p: CritiquePayload): number {
  return (
    p.rawThinking.length +
    (p.preMortem?.length ?? 0) +
    (p.summary?.length ?? 0) +
    (p.valuesAtStake?.length ?? 0) +
    (p.humanCost?.length ?? 0) +
    (p.guidingPrinciple?.length ?? 0) +
    p.options.reduce((n, o) => n + o.title.length + (o.description?.length ?? 0), 0)
  )
}

/** Minimum reasoning to bother critiquing — below this the model has nothing to
 *  push back on and would only pad. */
export const MIN_CRITIQUE_CHARS = 80

// ─── Prompt ─────────────────────────────────────────────────────────────────
// Stable across requests → cached. Keep the variable decision content in the
// user turn so the system prompt is a clean cache hit.

export const CRITIQUE_SYSTEM_PROMPT = `You are the adversarial reviewer inside DecisionOS — a decision journal for engineers and makers. A user has written up a real decision they are making or have made. Your job is to pressure-test their reasoning the way a sharp, trusted colleague would in private: not to be agreeable, and not to be cruel — to be useful.

What you are reviewing is the *quality of the thinking*, not the outcome. A good decision can have a bad result and vice versa. Judge the argument.

Operating principles:
- Be specific to THIS decision. Quote or paraphrase the user's own words. Generic advice ("consider the risks", "align with stakeholders") is worthless here and erodes trust — never produce it.
- Do not flatter. If the reasoning is thin, say so plainly. If it is strong, say that too, but still find the weakest joint.
- Surface what they are NOT seeing: assumptions they treat as settled fact, second-order effects, the option they dismissed too fast, the constraint they are rationalizing around.
- Steelman the road not taken. Make the best honest case for the alternative they rejected, even if you'd ultimately agree with their choice.
- Calibrate confidence honestly. reasoningConfidence is how well the *reasoning* would survive scrutiny by a skeptical expert — 80+ only when the thinking is genuinely rigorous and the main risks are named and addressed; 30 or below when it's mostly a gut call dressed up as analysis. Most real entries land 45–70.
- The decisiveQuestion must be a single, concrete, answerable question whose answer would actually move the decision — not a rhetorical or open-ended musing.
- Blind spots: most serious first. severity high = could sink the decision; medium = materially weakens it; low = worth a look. Title is a short noun phrase; detail is one or two sentences tied to their specifics.
- Respect the human frame. If they named values, people affected, or a guiding principle, weigh the decision against them. If they didn't and it's high-impact, that absence is itself a blind spot.
- Be concise. Every sentence earns its place. No preamble, no recap of what they wrote, no closing pep talk.

Always respond by calling the submit_critique tool. Never reply in plain prose.`

// ─── Structured-output tool ───────────────────────────────────────────────────
// Forcing tool use guarantees valid, renderable JSON — no fragile parsing.

export const CRITIQUE_TOOL = {
  name: "submit_critique",
  description:
    "Submit the structured critique of the decision's reasoning. Every field must be specific to the decision under review.",
  input_schema: {
    type: "object" as const,
    properties: {
      verdict: {
        type: "string",
        description:
          "One honest sentence: does the reasoning hold up, and where is it most exposed? No hedging.",
      },
      reasoningConfidence: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description:
          "How well the reasoning would survive a skeptical expert's scrutiny. Calibrated, not generous.",
      },
      strongestCounter: {
        type: "string",
        description:
          "The single strongest argument against this decision, stated as forcefully as an opponent would.",
      },
      unstatedAssumptions: {
        type: "array",
        items: { type: "string" },
        description:
          "2–5 things the decider is treating as settled fact without justifying. Each tied to their wording.",
      },
      blindSpots: {
        type: "array",
        description: "Specific gaps in the reasoning, most serious first. 2–5 items.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short noun phrase naming the gap." },
            detail: {
              type: "string",
              description: "One or two sentences explaining the gap, tied to their specifics.",
            },
            severity: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["title", "detail", "severity"],
        },
      },
      steelmanAlternative: {
        type: "string",
        description:
          "The best honest case for the path they did not choose. If no real alternative was given, name the strongest one they should have weighed.",
      },
      decisiveQuestion: {
        type: "string",
        description:
          "One concrete, answerable question whose answer would actually change the decision.",
      },
    },
    required: [
      "verdict",
      "reasoningConfidence",
      "strongestCounter",
      "unstatedAssumptions",
      "blindSpots",
      "steelmanAlternative",
      "decisiveQuestion",
    ],
  },
} as const

/** The variable user turn — the decision itself, rendered as readable markdown. */
export function renderDecisionForCritique(p: CritiquePayload): string {
  const lines: string[] = []
  lines.push(`# Decision: ${p.title}`)
  lines.push(`Status: ${p.status} · Impact: ${p.impact}/5 · Risk level: ${p.riskLevel ?? "unset"}`)
  lines.push("")
  lines.push("## Their raw thinking")
  lines.push(p.rawThinking || "(left blank)")

  if (p.options.length) {
    lines.push("")
    lines.push("## Options they considered")
    p.options.forEach((o, i) => {
      lines.push(`${String.fromCharCode(65 + i)}. ${o.title}${o.description ? ` — ${o.description}` : ""}`)
    })
  }
  if (p.tradeoffs.length) {
    lines.push("")
    lines.push("## How they scored the trade-offs (0–100)")
    p.tradeoffs.forEach((t) => lines.push(`- ${t.axis}: ${t.value}`))
  }
  if (p.constraints.length) {
    lines.push("")
    lines.push(`## Constraints they named`)
    lines.push(p.constraints.map((c) => `- ${c}`).join("\n"))
  }
  if (p.risks.length) {
    lines.push("")
    lines.push("## Risks they logged (severity 0–100)")
    p.risks.forEach((r) => lines.push(`- [${r.severity}] ${r.text}`))
  }
  if (p.preMortem) {
    lines.push("")
    lines.push("## Their pre-mortem (how they imagined it failing)")
    lines.push(p.preMortem)
  }
  if (p.valuesAtStake || p.humanCost || p.guidingPrinciple) {
    lines.push("")
    lines.push("## Human frame")
    if (p.valuesAtStake) lines.push(`- Values at stake: ${p.valuesAtStake}`)
    if (p.humanCost) lines.push(`- Who pays if wrong: ${p.humanCost}`)
    if (p.guidingPrinciple) lines.push(`- Guiding principle: ${p.guidingPrinciple}`)
  }
  if (p.summary) {
    lines.push("")
    lines.push("## Their summary")
    lines.push(p.summary)
  }
  lines.push("")
  lines.push("Review the reasoning above and call submit_critique.")
  return lines.join("\n")
}

/** Shape returned by the tool (server adds model/createdAt/sourceChars). */
export type CritiqueToolResult = Omit<AICritique, "model" | "createdAt" | "sourceChars">
