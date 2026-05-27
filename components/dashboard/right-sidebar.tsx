"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, PanelRightOpen, PanelRightClose, CalendarClock, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDecisionsStore } from "@/stores"
import { useWizard } from "@/contexts/WizardContext"
import { useNow } from "@/hooks/useNow"
import type { Decision } from "@/lib/types"

function daysOverdue(isoDate: string, now: number): number {
  return Math.floor((now - new Date(isoDate).getTime()) / (24 * 60 * 60 * 1000))
}

function timeAgo(iso: string, now: number): string {
  const days = Math.floor((now - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  return `${days}d ago`
}

const STATUS_CHIP: Record<Decision["status"], { label: string; cls: string }> = {
  draft:         { label: "Draft",      cls: "bg-white/5 border-white/15 text-white/50" },
  "in-progress": { label: "Active",     cls: "bg-primary/15 border-primary/25 text-primary" },
  decided:       { label: "Decided",    cls: "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" },
  archived:      { label: "Archived",   cls: "bg-white/5 border-white/10 text-white/35" },
  voided:        { label: "Voided",     cls: "bg-rose-500/15 border-rose-500/25 text-rose-400" },
  superseded:    { label: "Superseded", cls: "bg-amber-500/15 border-amber-500/25 text-amber-400" },
}

const OPEN_STATUSES = new Set<Decision["status"]>(["draft", "in-progress"])

export function RightSidebar() {
  const router = useRouter()
  const { open } = useWizard()
  const decisions = useDecisionsStore((s) => s.decisions)
  const isLoading = useDecisionsStore((s) => s.isLoading)
  const now = useNow()

  const [collapsed, setCollapsed] = useState(false)

  // Decisions where revisitAt is in the past — sorted most overdue first
  const revisitQueue = useMemo(
    () =>
      now == null
        ? []
        : decisions
        .filter((d) => d.revisitAt && new Date(d.revisitAt).getTime() < now)
        .sort((a, b) => new Date(a.revisitAt!).getTime() - new Date(b.revisitAt!).getTime()),
    [decisions, now]
  )

  // Open (draft / in-progress) decisions — sorted newest first
  const openDecisions = useMemo(
    () =>
      decisions
        .filter((d) => OPEN_STATUSES.has(d.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [decisions]
  )

  const totalBadge = revisitQueue.length + openDecisions.length

  if (collapsed) {
    return (
      <aside className="fixed right-0 top-0 h-screen w-12 border-l border-white/10 bg-white/[0.02] backdrop-blur-2xl hidden lg:flex flex-col items-center pt-4 z-10">
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
        {totalBadge > 0 && (
          <div className="mt-3 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-[10px] font-mono text-primary font-bold">{totalBadge}</span>
          </div>
        )}
      </aside>
    )
  }

  return (
    <aside className="fixed right-0 top-0 h-screen w-80 border-l border-white/10 bg-white/[0.02] backdrop-blur-2xl p-5 space-y-5 hidden lg:block overflow-y-auto z-10">

      <div className="flex justify-end -mt-1 -mr-1 mb-1">
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/30 hover:text-white/60"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {/* Revisit Queue */}
      <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-4 shadow-xl shadow-black/20">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="w-3.5 h-3.5 text-violet-400" />
          <h3 className="text-sm font-semibold text-white flex-1">Revisit Queue</h3>
          {revisitQueue.length > 0 && (
            <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
              {revisitQueue.length} overdue
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="py-4 text-center text-white/25 text-xs">Loading…</div>
        ) : revisitQueue.length === 0 ? (
          <p className="text-white/30 text-xs py-4 text-center">
            No overdue revisits. Set a revisit date on any decision.
          </p>
        ) : (
          <ul className="space-y-2">
            {revisitQueue.map((d) => {
              const overdue = daysOverdue(d.revisitAt!, now ?? Date.parse(d.revisitAt!))
              return (
                <li key={d.id}>
                  <button
                    onClick={() => router.push(`/decisions/${d.id}`)}
                    className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/75 truncate group-hover:text-white transition-colors leading-tight mb-0.5">
                        {d.title}
                      </p>
                      <span className="text-[10px] font-mono text-violet-400/80">
                        {overdue === 0 ? "Due today" : `${overdue}d overdue`}
                      </span>
                    </div>
                    {d.regret && (
                      <span className="text-[10px] font-mono text-rose-400/80 shrink-0 mt-0.5">Regret</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Open Decisions */}
      <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-4 shadow-xl shadow-black/20">
        <div className="flex items-center gap-2 mb-4">
          <Inbox className="w-3.5 h-3.5 text-white/45" />
          <h3 className="text-sm font-semibold text-white flex-1">Open</h3>
          {openDecisions.length > 0 && (
            <span className="text-[10px] font-mono text-white/35 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              {openDecisions.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="py-4 text-center text-white/25 text-xs">Loading…</div>
        ) : openDecisions.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-white/30 text-xs mb-3">Nothing in progress.</p>
            <button
              onClick={open}
              className="flex items-center gap-1.5 mx-auto text-[10px] text-primary/70 hover:text-primary transition-colors"
            >
              <Plus className="w-3 h-3" />
              Log a decision
            </button>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {openDecisions.map((d) => {
              const chip = STATUS_CHIP[d.status]
              return (
                <li key={d.id}>
                  <button
                    onClick={() => router.push(`/decisions/${d.id}`)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/75 truncate group-hover:text-white transition-colors">
                        {d.title}
                      </p>
                    </div>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded border shrink-0", chip.cls)}>
                      {chip.label}
                    </span>
                    <span className="text-[10px] text-white/35 font-mono shrink-0">
                      {timeAgo(d.createdAt, now ?? Date.parse(d.createdAt))}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
