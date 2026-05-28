"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { useDecisionsStore } from "@/stores"
import { useNow } from "@/hooks/useNow"
import { generateSignals, type Signal, type SignalSeverity } from "@/lib/signals"
import { cn } from "@/lib/utils"

const DEFAULT_VISIBLE = 3

const SEVERITY: Record<SignalSeverity, { dot: string; label: string; labelClass: string }> = {
  critical: { dot: "bg-destructive", label: "Now", labelClass: "text-destructive/90" },
  attention: { dot: "bg-warning", label: "Soon", labelClass: "text-warning/90" },
  info: { dot: "bg-white/35", label: "Pattern", labelClass: "text-white/45" },
}

function SignalRow({ signal }: { signal: Signal }) {
  const sev = SEVERITY[signal.severity]
  return (
    <li className="flex items-start gap-3.5 px-4 py-3.5">
      <span className={cn("mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full", sev.dot)} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-white/90">{signal.title}</span>
          <span className={cn("font-mono text-[10px] uppercase tracking-wider", sev.labelClass)}>
            {sev.label}
          </span>
          {signal.count > 1 && (
            <span className="ml-auto flex-shrink-0 font-mono text-[11px] tabular-nums text-white/30">
              {signal.count}
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-white/55 text-pretty">
          {signal.detail}
        </p>
        {signal.severity === "critical" && signal.suggestion && (
          <p className="mt-1 text-xs leading-relaxed text-white/40 text-pretty">
            {signal.suggestion}
          </p>
        )}
        {signal.action && (
          <Link
            href={signal.action.href}
            className="mt-2 inline-flex items-center gap-1 text-[12px] text-white/45 transition-colors hover:text-white/80"
          >
            {signal.action.label}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </li>
  )
}

export function Signals() {
  const decisions = useDecisionsStore((s) => s.decisions)
  const isLoading = useDecisionsStore((s) => s.isLoading)
  const now = useNow()
  const [expanded, setExpanded] = useState(false)

  const signals = useMemo(
    () => (now == null ? [] : generateSignals(decisions, now)),
    [decisions, now]
  )

  if (isLoading || now == null) return null

  // Calm, reassuring empty state — proof the system is watching, quietly.
  if (signals.length === 0) {
    return (
      <section aria-label="Signals">
        <SectionLabel />
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-success/15">
            <Check className="h-3 w-3 text-success" strokeWidth={3} />
          </span>
          <p className="text-[13px] text-white/50">
            Nothing needs attention. Open decisions have context, exits, and a date to look back.
          </p>
        </div>
      </section>
    )
  }

  const visible = expanded ? signals : signals.slice(0, DEFAULT_VISIBLE)
  const hidden = signals.length - visible.length

  return (
    <section aria-label="Signals">
      <SectionLabel count={signals.length} />
      <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015]">
        {visible.map((s) => (
          <SignalRow key={s.id} signal={s} />
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 px-1 text-xs text-white/40 transition-colors hover:text-white/70"
        >
          Show {hidden} more {hidden === 1 ? "signal" : "signals"}
        </button>
      )}
    </section>
  )
}

function SectionLabel({ count }: { count?: number }) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2">
      <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-white/40">Signals</h2>
      {typeof count === "number" && (
        <span className="font-mono text-xs text-white/25">{count}</span>
      )}
    </div>
  )
}
