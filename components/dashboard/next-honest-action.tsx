"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, Target, CheckCircle2 } from "lucide-react"
import { useDecisionsStore } from "@/stores"
import { useNow } from "@/hooks/useNow"
import { getNextHonestAction, type NextActionKind } from "@/lib/next-action"
import { cn } from "@/lib/utils"

type Tone = "critical" | "attention" | "info" | "positive"

const KIND_TONE: Record<NextActionKind, Tone> = {
  "name-regret-lesson": "critical",
  "review-overdue": "attention",
  "set-revisit": "attention",
  "add-human-frame": "attention",
  "close-stale": "info",
  "add-second-option": "info",
  calm: "positive",
}

const TONE: Record<Tone, { chip: string; word: string; cta: string; ring: string }> = {
  critical: {
    chip: "bg-destructive/12 text-destructive",
    word: "Now",
    cta: "border-destructive/30 text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/40",
    ring: "focus-visible:ring-destructive/40",
  },
  attention: {
    chip: "bg-warning/12 text-warning",
    word: "Soon",
    cta: "border-warning/30 text-warning hover:bg-warning/10 focus-visible:ring-warning/40",
    ring: "focus-visible:ring-warning/40",
  },
  info: {
    chip: "bg-white/[0.06] text-white/60",
    word: "When you can",
    cta: "border-white/15 text-white/70 hover:bg-white/[0.04] focus-visible:ring-white/30",
    ring: "focus-visible:ring-white/30",
  },
  positive: {
    chip: "bg-success/12 text-success",
    word: "All clear",
    cta: "border-success/30 text-success hover:bg-success/10 focus-visible:ring-success/40",
    ring: "focus-visible:ring-success/40",
  },
}

export function NextHonestAction() {
  const router = useRouter()
  const decisions = useDecisionsStore((s) => s.decisions)
  const isLoading = useDecisionsStore((s) => s.isLoading)
  const now = useNow()

  if (isLoading || now == null) {
    return (
      <div
        aria-hidden="true"
        className="h-[132px] rounded-2xl border border-white/[0.06] bg-white/[0.02]"
      />
    )
  }

  const action = getNextHonestAction(decisions, now)
  const tone = TONE[KIND_TONE[action.kind]]
  const isCalm = action.kind === "calm"

  return (
    <section
      aria-label="Right now"
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6"
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
            tone.chip
          )}
        >
          {isCalm ? <CheckCircle2 className="h-4 w-4" /> : <Target className="h-4 w-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
              Right now
            </p>
            <span className="text-white/15">·</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
              {tone.word}
            </span>
          </div>

          <h2 className="mt-2 text-lg font-semibold leading-snug text-white text-balance">
            {action.title}
          </h2>

          {action.decisionTitle && (
            <p className="mt-1 truncate text-sm text-white/55" title={action.decisionTitle}>
              {action.decisionTitle}
            </p>
          )}

          <p className="mt-2 text-sm leading-relaxed text-white/50 text-pretty">{action.why}</p>

          <button
            onClick={() => router.push(action.cta.href)}
            className={cn(
              "mt-4 inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
              tone.cta
            )}
          >
            {action.cta.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  )
}
