"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FilePlus, CheckCircle2, Clock, Archive, Ban, GitBranch, ArrowRight,
} from "lucide-react"
import { useDecisionsStore } from "@/stores"
import type { DecisionStatus } from "@/lib/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60)  return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)  return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)    return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const STATUS_ICON: Record<DecisionStatus, React.ElementType> = {
  draft:         FilePlus,
  "in-progress": Clock,
  decided:       CheckCircle2,
  archived:      Archive,
  voided:        Ban,
  superseded:    GitBranch,
}

const STATUS_COLOR: Record<DecisionStatus, string> = {
  draft:         "text-white/40",
  "in-progress": "text-primary",
  decided:       "text-emerald-400",
  archived:      "text-white/30",
  voided:        "text-rose-400",
  superseded:    "text-amber-400",
}

const STATUS_ACTION: Record<DecisionStatus, string> = {
  draft:         "Logged",
  "in-progress": "Analysing",
  decided:       "Decided",
  archived:      "Archived",
  voided:        "Voided",
  superseded:    "Superseded",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveFeed() {
  const router = useRouter()
  const decisions = useDecisionsStore((s) => s.decisions)
  const isLoading = useDecisionsStore((s) => s.isLoading)

  const feedItems = useMemo(
    () =>
      [...decisions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 7),
    [decisions]
  )

  return (
    <section>
      <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-xl shadow-black/20 ring-1 ring-white/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Live Feed</h2>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-white/40">
                {decisions.length} decision{decisions.length !== 1 ? "s" : ""}
              </span>
            </span>
          </div>
          <Link
            href="/decisions"
            className="flex items-center gap-1 text-[10px] text-white/35 hover:text-primary transition-colors"
          >
            View All
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Feed */}
        <div className="max-h-[240px] overflow-y-auto p-3">
          {isLoading ? (
            <div className="py-6 text-center text-white/25 text-xs">Loading…</div>
          ) : feedItems.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-white/35 text-xs mb-3">No decisions yet.</p>
              <button
                onClick={() => router.push("/app")}
                className="text-[10px] text-primary hover:text-cyan-300 transition-colors underline underline-offset-2"
              >
                Create your first one
              </button>
            </div>
          ) : (
            <ul className="space-y-0">
              {feedItems.map((item) => {
                const Icon  = STATUS_ICON[item.status]
                const color = STATUS_COLOR[item.status]
                const verb  = STATUS_ACTION[item.status]
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => router.push(`/decisions/${item.id}`)}
                      className="w-full flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors rounded-lg px-1 text-left"
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                      <p className="flex-1 text-xs text-white/60 min-w-0 truncate">
                        {verb}{" "}
                        <span className="text-white/85 font-medium">"{item.title}"</span>
                      </p>
                      <span className="text-[10px] text-white/35 font-mono shrink-0 ml-auto">
                        {timeAgo(item.createdAt)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
