"use client"

import { useState, memo } from "react"
import Link from "next/link"
import { ChevronDown, AlertCircle } from "lucide-react"
import { QualityRing } from "@/components/ui/quality-ring"
import { TradeoffRadar } from "@/components/ui/tradeoff-radar"
import { cn } from "@/lib/utils"
import type { Decision, DecisionStatus } from "@/lib/types"

const STALE_MS = 7 * 24 * 60 * 60 * 1000

const STATUS_BADGE: Record<DecisionStatus, { label: string; cls: string }> = {
  draft:         { label: "Draft",      cls: "bg-white/5 border-white/10 text-white/40" },
  "in-progress": { label: "Active",    cls: "bg-cyan-500/10 border-cyan-500/20 text-primary" },
  decided:       { label: "Decided",    cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  archived:      { label: "Archived",   cls: "bg-white/5 border-white/10 text-white/30" },
  voided:        { label: "Voided",     cls: "bg-rose-500/10 border-rose-500/20 text-rose-400" },
  superseded:    { label: "Superseded", cls: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
}

function daysAgo(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (24 * 60 * 60 * 1000))
}

const ThinkingCard = memo(function ThinkingCard({ card }: { card: Decision }) {
  const [showRadar, setShowRadar] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const statusBadge = STATUS_BADGE[card.status]
  const topTradeoffs = card.tradeoffs.slice(0, 3)

  const lastActivityDate = card.updatedAt ?? card.createdAt
  const isStale = card.status === "in-progress" &&
    Date.now() - new Date(lastActivityDate).getTime() > STALE_MS
  const staleDays = isStale ? daysAgo(lastActivityDate) : 0

  const isOverdueRevisit = card.revisitAt &&
    new Date(card.revisitAt).getTime() < Date.now()

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "bg-white/[0.06] backdrop-blur-2xl border rounded-2xl p-5 shadow-xl shadow-black/20 ring-1 ring-white/5 transition-[transform,border-color,box-shadow] duration-200 will-change-transform flex flex-col min-h-[260px]",
        isHovered ? "scale-[1.02] border-white/20 shadow-lg" : "border-white/[0.1]"
      )}
      style={{ contain: "layout" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 pr-3 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={cn("text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border", statusBadge.cls)}>
              {statusBadge.label}
            </span>

            {/* Regret marker */}
            {card.regret && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border bg-rose-500/10 border-rose-500/25 text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" />
                Regret
              </span>
            )}

            {/* Stale indicator */}
            {isStale && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border bg-amber-500/10 border-amber-500/20 text-amber-400">
                {staleDays}d no update
              </span>
            )}

            {/* Overdue revisit */}
            {isOverdueRevisit && !isStale && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border bg-violet-500/10 border-violet-500/20 text-violet-400">
                Revisit due
              </span>
            )}

            {card.id.startsWith("static-") && (
              <span className="text-[8px] font-mono uppercase tracking-[0.18em] text-white/25 bg-white/[0.04] border border-white/[0.07] px-1.5 py-0.5 rounded">
                Example
              </span>
            )}
          </div>
          <Link
            href={`/decisions/${card.id}`}
            className="text-base font-medium text-white line-clamp-2 hover:text-cyan-400 transition-colors"
          >
            {card.title}
          </Link>
        </div>
        <QualityRing score={card.qualityScore} size={48} strokeWidth={3} label="Record" />
      </div>

      {card.rawThinking ? (
        <div className="border-l-2 border-primary/40 pl-3 mb-3 flex-1" title={card.rawThinking}>
          <pre className="text-white/70 text-sm font-mono whitespace-pre-wrap line-clamp-3 leading-relaxed">
            {card.rawThinking}
          </pre>
        </div>
      ) : (
        <div className="flex-1 mb-3 flex items-center">
          <p className="text-white/25 text-sm italic">No notes yet.</p>
        </div>
      )}

      {/* What I got wrong preview — only show if regret + gotWrong */}
      {card.regret && card.gotWrong && (
        <div className="mb-3 p-2.5 rounded-xl bg-rose-500/[0.06] border border-rose-500/15">
          <p className="text-[10px] font-mono text-rose-400/70 uppercase tracking-wider mb-1">What I got wrong</p>
          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{card.gotWrong}</p>
        </div>
      )}

      {topTradeoffs.length > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] text-white/35 uppercase tracking-wider">Trade-offs</span>
          {topTradeoffs.map((t) => (
            <div key={t.axis} className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/40">{t.axis}</span>
              <div className="w-8 h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-primary/60" style={{ width: `${t.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {card.tradeoffs.length > 0 && (
        <button
          onClick={() => setShowRadar(!showRadar)}
          className="w-full flex items-center justify-center gap-1.5 py-2 mb-3 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", showRadar && "rotate-180")} />
          <span>{showRadar ? "Hide trade-offs" : "Inspect trade-offs"}</span>
        </button>
      )}

      <div className={cn(
        "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-in-out",
        showRadar ? "max-h-[200px] opacity-100 mb-4" : "max-h-0 opacity-0"
      )}>
        <div className="flex justify-center py-2">
          <TradeoffRadar data={card.tradeoffs} size={140} />
        </div>
      </div>

      {card.metric && (
        <div className="mt-auto pt-3 border-t border-white/5">
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold font-mono ${card.metricColor ?? "text-white"}`}>
              {card.metric}
            </span>
            <span className="text-xs text-white/40">{card.metricLabel}</span>
          </div>
        </div>
      )}
    </div>
  )
})

export const ThinkingCards = memo(function ThinkingCards({
  decisions,
  limit,
  title = "Decision Records",
}: {
  decisions: Decision[]
  limit?: number
  title?: string
}) {
  const cards = limit != null ? decisions.slice(0, limit) : decisions

  if (cards.length === 0) return null

  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map((card) => (
          <ThinkingCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  )
})
