"use client"

import Link from "next/link"
import { AlertTriangle, Info, Zap, TrendingUp, ScanLine, ArrowRight, Lock } from "lucide-react"
import { useDecisionInsights } from "@/stores"
import { useDecisionsStore } from "@/stores"
import type { InsightType } from "@/lib/insights"

const MIN_FOR_INSIGHTS = 5

const CONFIG: Record<
  InsightType,
  {
    icon: React.ElementType
    iconClass: string
    labelClass: string
    label: string
  }
> = {
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-400",
    labelClass: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    label: "Blind spot",
  },
  info: {
    icon: Info,
    iconClass: "text-primary",
    labelClass: "bg-primary/10 text-primary border-primary/20",
    label: "Context",
  },
  action: {
    icon: Zap,
    iconClass: "text-secondary",
    labelClass: "bg-secondary/10 text-secondary border-secondary/20",
    label: "Next step",
  },
  pattern: {
    icon: TrendingUp,
    iconClass: "text-emerald-400",
    labelClass: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    label: "Pattern",
  },
}

export function DecisionInsights() {
  const insights = useDecisionInsights()
  const decisionCount = useDecisionsStore((s) => s.decisions.length)

  // Not enough decisions yet — show a progress nudge
  if (insights === null) {
    const remaining = Math.max(0, MIN_FOR_INSIGHTS - decisionCount)
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.025] border border-white/[0.05]">
        <Lock className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
        <p className="text-xs text-white/30">
          {remaining > 0
            ? `Log ${remaining} more decision${remaining !== 1 ? "s" : ""} to surface recurring blind spots.`
            : "Building reflection prompts from your decisions..."}
        </p>
      </div>
    )
  }

  if (insights.length === 0) return null

  return (
    <section aria-label="Local reflection prompts">
      <div className="flex items-center gap-2 mb-3">
        <ScanLine className="w-3.5 h-3.5 text-white/25" aria-hidden />
        <h2 className="text-xs font-mono text-white/35 uppercase tracking-wider">
          Reflection prompts
        </h2>
        <span className="text-xs font-mono text-white/20">
          · {insights.length} pattern{insights.length !== 1 ? "s" : ""}
        </span>
      </div>

      <ul className="space-y-2" role="list">
        {insights.map((insight) => {
          const { icon: Icon, iconClass, labelClass, label } = CONFIG[insight.type]
          return (
            <li
              key={insight.id}
              className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.09] transition-colors duration-150"
            >
              <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${iconClass}`} aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-white/80 font-medium leading-none">
                    {insight.title}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-px rounded border leading-none ${labelClass}`}>
                    {label}
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-1.5 leading-relaxed">
                  {insight.description}
                </p>
                {insight.action && (
                  <Link
                    href={insight.action.href}
                    className="inline-flex items-center gap-1 mt-2 text-[11px] text-primary/70 hover:text-primary transition-colors"
                  >
                    {insight.action.label}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <span className="text-[11px] font-mono text-white/25 flex-shrink-0 mt-0.5 tabular-nums">
                {insight.metric}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
