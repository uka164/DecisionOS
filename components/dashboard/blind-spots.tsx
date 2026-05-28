"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ScanEye, ChevronDown, ChevronRight, AlertTriangle, Info, AlertOctagon } from "lucide-react"
import { useDecisionsStore } from "@/stores"
import { useNow } from "@/hooks/useNow"
import { detectBlindSpots, type BlindSpot, type BlindSpotSeverity } from "@/lib/blindspots"
import { cn } from "@/lib/utils"

const SEVERITY_STYLES: Record<
  BlindSpotSeverity,
  { icon: React.ElementType; iconClass: string; ring: string; chip: string; label: string }
> = {
  critical: {
    icon: AlertOctagon,
    iconClass: "text-rose-300",
    ring: "border-rose-500/25 bg-rose-500/[0.04]",
    chip: "bg-rose-500/15 border-rose-500/30 text-rose-200",
    label: "Critical",
  },
  warn: {
    icon: AlertTriangle,
    iconClass: "text-amber-300",
    ring: "border-amber-500/25 bg-amber-500/[0.035]",
    chip: "bg-amber-500/15 border-amber-500/30 text-amber-200",
    label: "Watch",
  },
  info: {
    icon: Info,
    iconClass: "text-white/55",
    ring: "border-white/[0.08] bg-white/[0.025]",
    chip: "bg-white/[0.06] border-white/15 text-white/65",
    label: "Pattern",
  },
}

interface BlindSpotItemProps {
  spot: BlindSpot
}

function BlindSpotItem({ spot }: BlindSpotItemProps) {
  const [open, setOpen] = useState(spot.severity === "critical")
  const styles = SEVERITY_STYLES[spot.severity]
  const Icon = styles.icon
  const firstAffected = spot.affectedIds[0]

  return (
    <li className={cn("rounded-xl border", styles.ring)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 p-3.5 text-left"
      >
        <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", styles.iconClass)} aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">{spot.title}</span>
            <span
              className={cn(
                "text-[10px] font-mono uppercase tracking-wider px-1.5 py-px rounded border",
                styles.chip
              )}
            >
              {styles.label}
            </span>
            <span className="text-[10px] font-mono text-white/35 tabular-nums">
              {spot.affectedIds.length}
            </span>
          </div>
          <p className="text-xs text-white/55 mt-1.5 leading-relaxed">{spot.description}</p>
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-white/40 mt-1 transition-transform flex-shrink-0",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 -mt-1 ml-7 space-y-2 text-xs">
          <p className="text-white/55 leading-relaxed">
            <span className="text-white/35 uppercase tracking-wider text-[10px] font-mono mr-1.5">
              Why
            </span>
            {spot.why}
          </p>
          <p className="text-white/55 leading-relaxed">
            <span className="text-white/35 uppercase tracking-wider text-[10px] font-mono mr-1.5">
              Try
            </span>
            {spot.suggestion}
          </p>
          {firstAffected && (
            <Link
              href={`/decisions/${firstAffected}`}
              className="inline-flex items-center gap-1 text-[11px] text-violet-300/80 hover:text-violet-200 transition-colors pt-1"
            >
              Open first affected decision
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}
    </li>
  )
}

export function BlindSpots() {
  const decisions = useDecisionsStore((s) => s.decisions)
  const isLoading = useDecisionsStore((s) => s.isLoading)
  const now = useNow()

  const spots = useMemo(
    () => (now == null ? [] : detectBlindSpots(decisions, now)),
    [decisions, now]
  )

  if (isLoading || now == null) return null
  if (spots.length === 0) return null

  return (
    <section aria-label="Blind spots in your decisions">
      <div className="flex items-center gap-2 mb-3">
        <ScanEye className="w-3.5 h-3.5 text-white/35" aria-hidden />
        <h2 className="text-xs font-mono text-white/40 uppercase tracking-wider">
          Blind spots
        </h2>
        <span className="text-xs font-mono text-white/25">
          · {spots.length} pattern{spots.length !== 1 ? "s" : ""}
        </span>
      </div>

      <ul className="space-y-2" role="list">
        {spots.map((spot) => (
          <BlindSpotItem key={spot.id} spot={spot} />
        ))}
      </ul>
    </section>
  )
}
