"use client"

import { useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { CalendarClock, ChevronRight, AlarmClock } from "lucide-react"
import { toast } from "sonner"
import { useDecisionsStore } from "@/stores"
import { useNow } from "@/hooks/useNow"
import { staggerContainer, riseItemLight } from "@/lib/motion"
import type { Decision } from "@/lib/types"
import { cn } from "@/lib/utils"

const WEEK = 7 * 24 * 60 * 60 * 1000

function dueTime(d: Decision): number | null {
  if (!d.revisitAt) return null
  if (d.review?.completedAt) return null
  return new Date(d.revisitAt).getTime()
}

/**
 * The "why open this on a Tuesday" surface — a mechanism, honestly, not a
 * guarantee of retention. Groups decisions you committed to revisit into
 * Overdue / Due this week, with one-tap Review or Snooze. Renders nothing when
 * nothing is due, so it never nags without reason.
 */
export function RevisitDigest() {
  const decisions = useDecisionsStore((s) => s.decisions)
  const updateDecision = useDecisionsStore((s) => s.updateDecision)
  const now = useNow()

  const { overdue, soon } = useMemo(() => {
    if (now == null) return { overdue: [] as Decision[], soon: [] as Decision[] }
    const overdue: Decision[] = []
    const soon: Decision[] = []
    for (const d of decisions) {
      const t = dueTime(d)
      if (t == null) continue
      if (t <= now) overdue.push(d)
      else if (t <= now + WEEK) soon.push(d)
    }
    const byDate = (a: Decision, b: Decision) =>
      new Date(a.revisitAt!).getTime() - new Date(b.revisitAt!).getTime()
    return { overdue: overdue.sort(byDate), soon: soon.sort(byDate) }
  }, [decisions, now])

  if (now == null || (overdue.length === 0 && soon.length === 0)) return null

  const snooze = (d: Decision) => {
    const base = Math.max(now, new Date(d.revisitAt!).getTime())
    const next = new Date(base + WEEK).toISOString().slice(0, 10)
    updateDecision(d.id, { revisitAt: next })
    toast("Snoozed a week", {
      description: new Date(next).toLocaleDateString("en-US", { month: "long", day: "numeric" }),
    })
  }

  const total = overdue.length + soon.length

  return (
    <section
      aria-label="Revisits due"
      className="rounded-2xl border border-secondary/25 bg-secondary/[0.05] p-5"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <div className="rounded-lg border border-secondary/30 bg-secondary/15 p-1.5 text-secondary">
          <CalendarClock className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Come back to these</h2>
          <p className="text-xs text-white/55">
            {overdue.length > 0 && `${overdue.length} overdue`}
            {overdue.length > 0 && soon.length > 0 && " · "}
            {soon.length > 0 && `${soon.length} due this week`}
          </p>
        </div>
        <span className="text-readout ml-auto text-sm text-white/55">{total}</span>
      </div>

      <motion.ul variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
        {[...overdue, ...soon].map((d) => {
          const t = new Date(d.revisitAt!).getTime()
          const isOverdue = t <= now
          const days = Math.round(Math.abs(now - t) / (24 * 60 * 60 * 1000))
          return (
            <motion.li
              key={d.id}
              variants={riseItemLight}
              className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-1 p-3"
            >
              <span
                className={cn(
                  "label-eyebrow rounded border px-1.5 py-px",
                  isOverdue
                    ? "border-warning/30 bg-warning/10 text-warning"
                    : "border-hairline-strong bg-surface-3 text-white/65"
                )}
              >
                {isOverdue ? (days === 0 ? "today" : `${days}d over`) : `in ${days || 1}d`}
              </span>
              <Link
                href={`/decisions/${d.id}?focus=review`}
                className="min-w-0 flex-1 truncate text-sm font-medium text-white hover:text-secondary transition-colors"
              >
                {d.title}
              </Link>
              <button
                onClick={() => snooze(d)}
                className="flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/55 transition-colors hover:bg-white/5 hover:text-white/75"
                title="Snooze one week"
              >
                <AlarmClock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Snooze</span>
              </button>
              <Link
                href={`/decisions/${d.id}?focus=review`}
                className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-secondary/30 bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary transition-colors hover:bg-secondary/20"
              >
                Review
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </motion.li>
          )
        })}
      </motion.ul>
    </section>
  )
}
