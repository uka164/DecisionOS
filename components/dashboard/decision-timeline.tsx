"use client"

import { useMemo, memo } from "react"
import { Clock, ArrowRight, Plus, CheckCircle2, Archive, GitBranch } from "lucide-react"
import type { Decision } from "@/lib/types"

interface TimelineEvent {
  id: string
  icon: typeof Clock
  iconColor: string
  label: string
  title: string
  time: string
  relativeTime: string
}

function getRelativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

function deriveEvents(decisions: Decision[]): TimelineEvent[] {
  const events: TimelineEvent[] = []

  // Sort by createdAt descending
  const sorted = [...decisions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  for (const d of sorted) {
    // "Decided" status → green check
    if (d.status === "decided") {
      events.push({
        id: `${d.id}-decided`,
        icon: CheckCircle2,
        iconColor: "text-success",
        label: "Decided",
        title: d.title,
        time: d.createdAt,
        relativeTime: getRelativeTime(d.createdAt),
      })
    }
    // "Archived" / "voided" → archive icon
    else if (d.status === "archived" || d.status === "voided") {
      events.push({
        id: `${d.id}-archived`,
        icon: Archive,
        iconColor: "text-white/40",
        label: d.status === "voided" ? "Voided" : "Archived",
        title: d.title,
        time: d.createdAt,
        relativeTime: getRelativeTime(d.createdAt),
      })
    }
    // "In-progress" → active
    else if (d.status === "in-progress") {
      events.push({
        id: `${d.id}-progress`,
        icon: ArrowRight,
        iconColor: "text-primary",
        label: "In progress",
        title: d.title,
        time: d.createdAt,
        relativeTime: getRelativeTime(d.createdAt),
      })
    }
    // Draft → created
    else {
      events.push({
        id: `${d.id}-created`,
        icon: Plus,
        iconColor: "text-white/50",
        label: "Created",
        title: d.title,
        time: d.createdAt,
        relativeTime: getRelativeTime(d.createdAt),
      })
    }

    // Experiment links
    if (d.experiments && d.experiments.length > 0) {
      events.push({
        id: `${d.id}-experiment`,
        icon: GitBranch,
        iconColor: "text-white/45",
        label: "Experiment linked",
        title: d.title,
        time: d.createdAt,
        relativeTime: getRelativeTime(d.createdAt),
      })
    }
  }

  // Sort all events by time descending, take first 7
  return events
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 7)
}

export const DecisionTimeline = memo(function DecisionTimeline({ decisions }: { decisions: Decision[] }) {
  const events = useMemo(() => deriveEvents(decisions), [decisions])

  if (events.length === 0) return null

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-white">Learning Loop</h2>
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-white/10 to-transparent" />

          <div className="space-y-4">
            {events.map((event) => {
              const Icon = event.icon
              return (
                <div key={event.id} className="flex items-start gap-3 relative">
                  {/* Dot */}
                  <div className="w-[23px] h-[23px] rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0 z-10">
                    <Icon className={`w-3 h-3 ${event.iconColor}`} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs uppercase text-white/40">{event.label}</span>
                      <span className="text-[10px] text-white/25 font-mono">{event.relativeTime}</span>
                    </div>
                    <p className="text-sm text-white/60 truncate">{event.title}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
})
