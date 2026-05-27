"use client"

import { useMemo, memo } from "react"
import { Activity, CheckCircle2 } from "lucide-react"
import type { Decision } from "@/lib/types"

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 60
  const height = 24
  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible"
      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

function computeStats(decisions: Decision[]) {
  const now = Date.now()
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  const openDecisions = decisions.filter(
    (d) => d.status === "draft" || d.status === "in-progress"
  ).length

  const decidedThisWeek = decisions.filter(
    (d) =>
      d.status === "decided" &&
      now - new Date(d.createdAt).getTime() < sevenDays
  ).length

  const scores = decisions.map((d) => d.qualityScore)
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0
  const scoreSparkline = scores.slice(-7).map((s) => s / 20)

  return {
    total: decisions.length,
    openDecisions,
    decidedThisWeek,
    avgScore,
    scoreSparkline,
  }
}

const CARD_BASE =
  "bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-5 shadow-xl shadow-black/20 ring-1 ring-white/5 hover:border-white/20 hover:shadow-lg transition-all duration-200 will-change-transform min-h-[130px] flex flex-col justify-between"

export const DashboardStats = memo(function DashboardStats({ decisions }: { decisions: Decision[] }) {
  const { total, openDecisions, decidedThisWeek, avgScore, scoreSparkline } =
    useMemo(() => computeStats(decisions), [decisions])

  return (
    <section className="space-y-4">
      {/* Summary line */}
      <div className="flex items-center gap-1.5 text-sm text-white/50 font-mono">
        <span className="text-white/80 font-medium">{total}</span>
        <span>decisions logged</span>
        <span className="text-white/20">·</span>
        <span className="text-white/80 font-medium">{openDecisions}</span>
        <span>open</span>
        <span className="text-white/20">·</span>
        <span className="text-white/80 font-medium">{decidedThisWeek}</span>
        <span>decided this week</span>
      </div>

      {/* 3-card balanced row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Open Decisions */}
        <div className={CARD_BASE} style={{ contain: "layout" }}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-amber-400" />
            <p className="text-sm text-white/50">Open Decisions</p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold font-mono text-white">
              {openDecisions}
            </span>
            <span className="text-sm font-mono text-white/40">
              / {total}
            </span>
          </div>
          <p className="text-xs font-mono mt-2 text-white/35">
            {openDecisions === 0
              ? "All caught up"
              : `${openDecisions} awaiting resolution`}
          </p>
        </div>

        {/* Decided This Week */}
        <div className={CARD_BASE} style={{ contain: "layout" }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <p className="text-sm text-white/50">Decided This Week</p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold font-mono text-white">
              {decidedThisWeek}
            </span>
          </div>
          <p className="text-xs font-mono mt-2 text-white/35">
            {decidedThisWeek === 0
              ? "No decisions closed recently"
              : `${decidedThisWeek} resolved in 7 days`}
          </p>
        </div>

        {/* Avg Record Completeness */}
        <div className={CARD_BASE} style={{ contain: "layout" }}>
          <p className="text-sm text-white/50 mb-3">Avg Record</p>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-0.5">
              <span className="text-3xl font-bold font-mono text-white">
                {avgScore}
              </span>
              <span className="text-lg font-mono text-white/60">%</span>
            </div>
            {scoreSparkline.length >= 2 && (
              <Sparkline data={scoreSparkline} color="var(--primary)" />
            )}
          </div>
          <p className="text-xs font-mono mt-2 text-white/35">
            How complete your records are
          </p>
        </div>
      </div>
    </section>
  )
})
