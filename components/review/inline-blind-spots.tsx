"use client"

import { useMemo } from "react"
import { AlertOctagon, AlertTriangle, Info } from "lucide-react"
import { useDecisionsStore } from "@/stores"
import { useNow } from "@/hooks/useNow"
import { detectBlindSpots, type BlindSpotSeverity } from "@/lib/blindspots"
import { cn } from "@/lib/utils"

const SEVERITY_STYLES: Record<
  BlindSpotSeverity,
  { icon: React.ElementType; ring: string; chip: string; label: string; iconClass: string }
> = {
  critical: {
    icon: AlertOctagon,
    iconClass: "text-destructive",
    ring: "border-destructive/30 bg-destructive/[0.06]",
    chip: "bg-destructive/15 border-destructive/30 text-destructive",
    label: "Critical",
  },
  warn: {
    icon: AlertTriangle,
    iconClass: "text-warning",
    ring: "border-warning/30 bg-warning/[0.05]",
    chip: "bg-warning/15 border-warning/30 text-warning",
    label: "Watch",
  },
  info: {
    icon: Info,
    iconClass: "text-white/55",
    ring: "border-hairline bg-surface-1",
    chip: "bg-surface-3 border-white/15 text-white/65",
    label: "Note",
  },
}

interface InlineBlindSpotsProps {
  decisionId: string
}

/**
 * Decision-scoped blind spots. Runs the same rule engine the dashboard uses,
 * then filters down to rules whose affectedIds contain this decision.
 * Sits at the top of the detail page so it can't be scrolled past.
 */
export function InlineBlindSpots({ decisionId }: InlineBlindSpotsProps) {
  const decisions = useDecisionsStore((s) => s.decisions)
  const now = useNow()

  const spots = useMemo(() => {
    if (now == null) return []
    return detectBlindSpots(decisions, now).filter((s) => s.affectedIds.includes(decisionId))
  }, [decisions, now, decisionId])

  if (spots.length === 0) return null

  return (
    <section
      aria-label="Blind spots for this decision"
      className="space-y-2"
    >
      {spots.map((spot) => {
        const styles = SEVERITY_STYLES[spot.severity]
        const Icon = styles.icon
        return (
          <div
            key={spot.id}
            className={cn("rounded-xl border p-3.5", styles.ring)}
          >
            <div className="flex items-start gap-3">
              <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", styles.iconClass)} aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{spot.title}</span>
                  <span
                    className={cn(
                      "text-[11px] font-mono uppercase tracking-wider px-1.5 py-px rounded border",
                      styles.chip
                    )}
                  >
                    {styles.label}
                  </span>
                </div>
                <p className="text-xs text-white/55 mt-1.5 leading-relaxed">
                  <span className="text-white/75">{spot.why}</span>
                </p>
                <p className="text-xs text-white/65 mt-1.5 leading-relaxed">
                  <span className="text-white/55 mr-1.5">Try:</span>
                  {spot.suggestion}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}
