"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, X, Zap, ChevronRight, Sparkles, Loader2, Crosshair, HelpCircle, ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import { useDecisionsStore } from "@/stores"
import { useWizard } from "@/contexts/WizardContext"
import { buildCritiquePayload, MIN_CRITIQUE_CHARS } from "@/lib/ai/critique"
import type { AICritique } from "@/lib/types"
import { cn } from "@/lib/utils"

type Phase = "form" | "critiquing" | "result"

function confidenceTone(v: number): { bar: string; text: string; label: string } {
  if (v >= 70) return { bar: "bg-success", text: "text-success", label: "Holds up well" }
  if (v >= 45) return { bar: "bg-warning", text: "text-warning", label: "Partly holds up" }
  return { bar: "bg-destructive", text: "text-destructive", label: "Thin / exposed" }
}

export function QuickCapture() {
  const router = useRouter()
  const addDecision = useDecisionsStore((s) => s.addDecision)
  const updateDecision = useDecisionsStore((s) => s.updateDecision)
  const { open: openWizard, openCapture, closeCapture, captureOpen: open } = useWizard()

  const [title, setTitle] = useState("")
  const [why, setWhy] = useState("")
  const [phase, setPhase] = useState<Phase>("form")
  const [critique, setCritique] = useState<AICritique | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  // Cancels an in-flight critique if the user closes the sheet mid-run.
  const runningRef = useRef(false)

  // The server gates on source chars; with only a "why" field, that's just its
  // trimmed length. Mirror the gate so we don't show a loading state we can't pay off.
  const enoughForCritique = why.trim().length >= MIN_CRITIQUE_CHARS

  // Is a key configured? Lets us show the right hint and skip the loading state
  // when the critique can't run anyway.
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

  const reset = useCallback(() => {
    runningRef.current = false
    setTitle("")
    setWhy("")
    setPhase("form")
    setCritique(null)
    setCreatedId(null)
  }, [])

  const close = useCallback(() => {
    runningRef.current = false
    closeCapture()
  }, [closeCapture])

  // Fresh form every time the sheet opens; clear leftover result after it closes.
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50)
    } else {
      const t = setTimeout(reset, 250)
      return () => clearTimeout(t)
    }
  }, [open, reset])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) close()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, close])

  const finishPlain = (id: string, description: string) => {
    toast.success("Decision captured", {
      description,
      action: { label: "Open", onClick: () => router.push(`/decisions/${id}`) },
    })
    close()
  }

  const handleCapture = async () => {
    const trimmed = title.trim()
    if (!trimmed || phase === "critiquing") return

    const created = addDecision({
      title: trimmed,
      status: "draft",
      impact: 3,
      tags: [],
      rawThinking: why.trim(),
      tradeoffs: [],
      riskLevel: null,
      badges: [],
      options: [],
      constraints: [],
      risks: [],
    })
    setCreatedId(created.id)

    // No payoff possible → behave like the old fast capture.
    if (!configured) {
      finishPlain(created.id, "Saved as draft — open it to add more detail.")
      return
    }
    if (!enoughForCritique) {
      finishPlain(created.id, "Saved as draft. Add a line of reasoning to get an instant critique.")
      return
    }

    setPhase("critiquing")
    runningRef.current = true
    try {
      const res = await fetch("/api/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: buildCritiquePayload(created), model: "opus" }),
      })
      const data = await res.json()
      if (!runningRef.current) return // user closed mid-run
      if (!res.ok) {
        if (data.code === "no_key") setConfigured(false)
        finishPlain(created.id, "Saved as draft. The critique didn't run — open it to try again.")
        return
      }
      const result = data.critique as AICritique
      updateDecision(created.id, { aiCritique: result })
      setCritique(result)
      setPhase("result")
    } catch {
      if (!runningRef.current) return
      finishPlain(created.id, "Saved as draft. Couldn't reach the critique service — open it to retry.")
    } finally {
      runningRef.current = false
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCapture()
  }

  const tone = critique ? confidenceTone(critique.reasoningConfidence) : null

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={openCapture}
            aria-label="Quick capture decision"
            className="fixed bottom-6 right-6 z-40 hidden h-12 w-12 items-center justify-center rounded-full border border-primary/45 bg-primary text-primary-foreground shadow-[0_10px_30px_-18px_var(--primary-glow)] transition-transform duration-150 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:flex"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Capture sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) close() }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-lg border border-hairline bg-bg-card p-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-capture-title"
              onKeyDown={handleKeyDown}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <h2 id="quick-capture-title" className="text-sm font-semibold text-white">
                    {phase === "result" ? "The pushback" : "Capture a decision"}
                  </h2>
                </div>
                <button
                  onClick={close}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-white/55 transition-colors hover:bg-white/10 hover:text-white/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* ── Form ─────────────────────────────────────────────── */}
              {phase === "form" && (
                <>
                  <div className="space-y-3">
                    <input
                      ref={titleRef}
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What are you deciding?"
                      className="w-full rounded-lg border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white placeholder:text-white/45 transition-colors focus:border-primary/40 focus:outline-none"
                    />
                    <textarea
                      value={why}
                      onChange={(e) => setWhy(e.target.value)}
                      placeholder="And why — the reasoning, the trade-off, what's pulling you. The more you write, the harder the AI can push back."
                      rows={5}
                      className="w-full resize-none rounded-lg border border-white/10 bg-surface-2 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-white/45 transition-colors focus:border-primary/40 focus:outline-none"
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={() => { close(); openWizard() }}
                      className="flex items-center gap-1 text-[11px] text-white/55 transition-colors hover:text-white/75"
                    >
                      Full wizard
                      <ChevronRight className="h-3 w-3" />
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={close}
                        className="rounded-lg px-4 py-2 text-sm text-white/50 transition-colors hover:text-white/70"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCapture}
                        disabled={!title.trim()}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                          title.trim()
                            ? "border-primary/30 bg-primary/15 text-primary hover:bg-primary/20"
                            : "cursor-not-allowed border-white/10 bg-surface-1 text-white/55"
                        )}
                      >
                        {configured && enoughForCritique ? (
                          <><Sparkles className="h-3.5 w-3.5" />Capture &amp; critique</>
                        ) : (
                          <><Zap className="h-3.5 w-3.5" />Capture</>
                        )}
                      </button>
                    </div>
                  </div>
                  {configured === false && (
                    <p className="mt-3 text-[11px] leading-relaxed text-white/45">
                      Add an <code className="rounded bg-white/10 px-1 py-0.5">ANTHROPIC_API_KEY</code> to get an instant
                      reasoning critique on capture.
                    </p>
                  )}
                </>
              )}

              {/* ── Critiquing ───────────────────────────────────────── */}
              {phase === "critiquing" && (
                <div className="py-6">
                  <div className="flex items-center gap-2.5 text-secondary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Pressure-testing your reasoning…</span>
                  </div>
                  <div className="mt-5 space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-3 animate-pulse rounded bg-surface-3"
                        style={{ width: `${90 - i * 18}%` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Result ───────────────────────────────────────────── */}
              {phase === "result" && critique && tone && (
                <div className="space-y-5">
                  <p className="text-[15px] leading-relaxed text-white/90">{critique.verdict}</p>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-white/55">Reasoning confidence</span>
                      <span className={cn("text-readout font-semibold", tone.text)}>
                        {critique.reasoningConfidence} · {tone.label}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <motion.div
                        className={cn("h-full rounded-full", tone.bar)}
                        initial={{ width: 0 }}
                        animate={{ width: `${critique.reasoningConfidence}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {critique.strongestCounter && (
                    <div>
                      <div className="mb-1.5 flex items-center gap-2 text-white/55">
                        <Crosshair className="h-3.5 w-3.5" aria-hidden />
                        <span className="label-eyebrow">Strongest argument against</span>
                      </div>
                      <p className="text-sm leading-relaxed text-white/75">{critique.strongestCounter}</p>
                    </div>
                  )}

                  {critique.decisiveQuestion && (
                    <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
                      <div className="flex items-center gap-2 text-primary/80">
                        <HelpCircle className="h-4 w-4" />
                        <span className="label-eyebrow text-primary/80">Answer this</span>
                      </div>
                      <p className="mt-2.5 text-balance text-lg font-semibold leading-snug tracking-tight text-white">
                        {critique.decisiveQuestion}
                      </p>
                    </div>
                  )}

                  {critique.blindSpots.length > 0 && (
                    <p className="text-xs text-white/50">
                      + {critique.blindSpots.length} blind spot{critique.blindSpots.length !== 1 ? "s" : ""} and the
                      steelman of the road not taken — open the decision to see them.
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={reset}
                      className="text-[11px] text-white/55 transition-colors hover:text-white/75"
                    >
                      Capture another
                    </button>
                    <button
                      onClick={() => { if (createdId) router.push(`/decisions/${createdId}`); close() }}
                      className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      Open decision
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
