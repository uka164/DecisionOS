"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Loader2,
  RotateCw,
  KeyRound,
  AlertTriangle,
  Crosshair,
  HelpCircle,
  Scale,
} from "lucide-react"
import { toast } from "sonner"
import { useDecisionsStore } from "@/stores"
import {
  buildCritiquePayload,
  critiqueSourceChars,
  MIN_CRITIQUE_CHARS,
  MODEL_LABELS,
  type CritiqueModelKey,
} from "@/lib/ai/critique"
import type { AICritique, AICritiqueSeverity, Decision } from "@/lib/types"
import { rise, EASE_SIGNATURE } from "@/lib/motion"
import { cn } from "@/lib/utils"

const SEVERITY_CHIP: Record<AICritiqueSeverity, string> = {
  high: "bg-destructive/15 border-destructive/30 text-destructive",
  medium: "bg-warning/15 border-warning/30 text-warning",
  low: "bg-surface-3 border-hairline-strong text-white/65",
}

function confidenceTone(v: number): { bar: string; text: string; label: string } {
  if (v >= 70) return { bar: "bg-success", text: "text-success", label: "Holds up well" }
  if (v >= 45) return { bar: "bg-warning", text: "text-warning", label: "Partly holds up" }
  return { bar: "bg-destructive", text: "text-destructive", label: "Thin / exposed" }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function AICritique({ decision }: { decision: Decision }) {
  const updateDecision = useDecisionsStore((s) => s.updateDecision)
  const critique = decision.aiCritique ?? null

  const [configured, setConfigured] = useState<boolean | null>(null)
  const [model, setModel] = useState<CritiqueModelKey>("opus")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch("/api/critique")
      .then((r) => r.json())
      .then((d) => alive && setConfigured(Boolean(d.configured)))
      .catch(() => alive && setConfigured(false))
    return () => {
      alive = false
    }
  }, [])

  const payload = useMemo(() => buildCritiquePayload(decision), [decision])
  const currentChars = useMemo(() => critiqueSourceChars(payload), [payload])
  const tooThin = currentChars < MIN_CRITIQUE_CHARS

  // Flag when the reasoning changed materially since the critique was generated.
  const stale = useMemo(() => {
    if (!critique) return false
    const delta = Math.abs(currentChars - critique.sourceChars)
    return delta > 200 || delta / Math.max(critique.sourceChars, 1) > 0.25
  }, [critique, currentChars])

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, model }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === "no_key") setConfigured(false)
        setError(data.error ?? "Something went wrong.")
        return
      }
      const result = data.critique as AICritique
      updateDecision(decision.id, { aiCritique: result })
      toast.success("Critique ready", {
        description: `${MODEL_LABELS[model]} read your reasoning and pushed back.`,
      })
    } catch {
      setError("Couldn't reach the critique service.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id="ai-critique-section"
      aria-label="AI reasoning critique"
      className="rounded-2xl border border-secondary/25 bg-secondary/[0.05] p-5 sm:p-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-secondary/30 bg-secondary/15 p-2 text-secondary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="label-eyebrow text-secondary/80">AI review</p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-white">
              Pressure-test the reasoning
            </h2>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-white/60">
              A model reads this decision and pushes back — the counter-argument, the
              assumptions you&apos;re treating as fact, and the one question that should change
              your mind.
            </p>
          </div>
        </div>

        {configured !== false && (
          <div className="flex items-center gap-2">
            {!critique && !loading && (
              <ModelToggle model={model} onChange={setModel} disabled={loading} />
            )}
            <button
              onClick={run}
              disabled={loading || tooThin}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
                "border-secondary/35 bg-secondary/15 text-secondary hover:bg-secondary/20",
                "disabled:cursor-not-allowed disabled:opacity-40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
              )}
              title={tooThin ? "Add more reasoning first" : undefined}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : critique ? (
                <RotateCw className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? "Reading…" : critique ? "Re-run" : "Get critique"}
            </button>
          </div>
        )}
      </div>

      {/* No-key setup state */}
      {configured === false && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-hairline-strong bg-surface-1 p-4">
          <KeyRound className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/55" />
          <div className="text-sm leading-relaxed text-white/70">
            <p className="font-medium text-white">Connect a model to enable this</p>
            <p className="mt-1 text-white/60">
              Add{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/80">
                ANTHROPIC_API_KEY
              </code>{" "}
              to a{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/80">
                .env.local
              </code>{" "}
              file and restart the dev server. The critique runs server-side — your key never
              reaches the browser.
            </p>
          </div>
        </div>
      )}

      {/* Too-thin hint (only when no critique yet and key present) */}
      {configured !== false && tooThin && !critique && !loading && (
        <p className="mt-4 text-sm text-white/55">
          Add your raw thinking above first — there&apos;s not enough here to push back on yet.
        </p>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading shimmer */}
      {loading && !critique && (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-3 animate-pulse rounded bg-surface-3"
              style={{ width: `${90 - i * 18}%` }}
            />
          ))}
        </div>
      )}

      {/* Result */}
      <AnimatePresence mode="wait">
        {critique && (
          <motion.div
            key={critique.createdAt}
            variants={rise}
            initial="hidden"
            animate="show"
            className="mt-6 space-y-6"
          >
            {stale && (
              <div className="flex items-center gap-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                You&apos;ve edited the reasoning since this critique. Re-run to refresh it.
              </div>
            )}

            {/* Verdict + confidence */}
            <div className="space-y-3">
              <p className="text-base leading-relaxed text-white/90">{critique.verdict}</p>
              <ConfidenceBar value={critique.reasoningConfidence} />
            </div>

            {/* Strongest counter */}
            {critique.strongestCounter && (
              <Block icon={Crosshair} label="Strongest argument against">
                <p className="text-sm leading-relaxed text-white/75">{critique.strongestCounter}</p>
              </Block>
            )}

            {/* Unstated assumptions */}
            {critique.unstatedAssumptions.length > 0 && (
              <Block icon={Scale} label="You're treating these as fact">
                <ul className="space-y-1.5">
                  {critique.unstatedAssumptions.map((a, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-white/75">
                      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-secondary" />
                      {a}
                    </li>
                  ))}
                </ul>
              </Block>
            )}

            {/* Blind spots */}
            {critique.blindSpots.length > 0 && (
              <Block icon={AlertTriangle} label="Blind spots">
                <div className="space-y-2">
                  {critique.blindSpots.map((b, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-hairline bg-surface-1 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-white/85">{b.title}</span>
                        <span
                          className={cn(
                            "label-eyebrow rounded border px-1.5 py-px",
                            SEVERITY_CHIP[b.severity]
                          )}
                        >
                          {b.severity}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/65">{b.detail}</p>
                    </div>
                  ))}
                </div>
              </Block>
            )}

            {/* Steelman of the alternative */}
            {critique.steelmanAlternative && (
              <Block icon={Scale} label="The case for the road not taken">
                <p className="rounded-xl border border-secondary/25 bg-secondary/[0.07] p-3.5 text-sm leading-relaxed text-white/75">
                  {critique.steelmanAlternative}
                </p>
              </Block>
            )}

            {/* Decisive question — the one loud, recurring moment. */}
            {critique.decisiveQuestion && (
              <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-5">
                <div className="flex items-center gap-2 text-primary/80">
                  <HelpCircle className="h-4 w-4" />
                  <span className="label-eyebrow text-primary/80">Answer this</span>
                </div>
                <p className="mt-3 text-balance text-xl font-semibold leading-snug tracking-tight text-white sm:text-2xl">
                  {critique.decisiveQuestion}
                </p>
              </div>
            )}

            {/* Footer meta */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
              <span className="text-readout">{critique.model}</span>
              <span aria-hidden>·</span>
              <span>generated {relativeTime(critique.createdAt)}</span>
              <span aria-hidden>·</span>
              <span>This is a prompt, not a verdict — you still decide.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function ModelToggle({
  model,
  onChange,
  disabled,
}: {
  model: CritiqueModelKey
  onChange: (m: CritiqueModelKey) => void
  disabled?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Critique model"
      className="inline-flex rounded-xl border border-hairline bg-surface-1 p-0.5"
    >
      {(["opus", "sonnet"] as const).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={model === m}
          disabled={disabled}
          onClick={() => onChange(m)}
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
            model === m
              ? "bg-secondary/20 text-secondary"
              : "text-white/55 hover:text-white/75"
          )}
        >
          {MODEL_LABELS[m]}
        </button>
      ))}
    </div>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const tone = confidenceTone(value)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-white/55">Reasoning confidence</span>
        <span className={cn("text-readout font-semibold", tone.text)}>
          {value} · {tone.label}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className={cn("h-full rounded-full", tone.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: EASE_SIGNATURE }}
        />
      </div>
    </div>
  )
}

function Block({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-white/55">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span className="label-eyebrow">{label}</span>
      </div>
      {children}
    </div>
  )
}
