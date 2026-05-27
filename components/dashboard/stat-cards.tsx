"use client"

import { TrendingDown } from "lucide-react"

// Sparkline SVG component with glow
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
    <svg width={width} height={height} className="overflow-visible" style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}>
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

// Progress bar component
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-3">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

const stats = [
  {
    label: "Decision Velocity",
    value: "12",
    subtext: "+3 this week",
    subtextColor: "text-emerald-400",
    hasProgress: true,
    progressValue: 65,
    progressColor: "bg-cyan-500",
    progressLabel: "Sprint Target",
  },
  {
    label: "Avg Confidence",
    value: "4.6",
    suffix: "/5",
    subtext: "Based on 12 logs",
    subtextColor: "text-white/50",
    sparklineData: [3.8, 4.0, 4.2, 4.1, 4.4, 4.5, 4.6],
    sparklineColor: "#06b6d4",
  },
  {
    label: "Tech Debt Delta",
    value: "-14.2",
    suffix: "h",
    subtext: "Recovered vs. incurred",
    subtextColor: "text-white/50",
    showTrendArrow: true,
    trendPositive: true,
  },
]

export function StatCards() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-4">Decision Stats</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-5 shadow-xl shadow-black/20 ring-1 ring-white/5 hover:scale-[1.01] hover:border-white/20 hover:shadow-lg transition-all duration-200 will-change-transform"
            style={{ contain: "layout" }}
          >
            <p className="text-sm text-white/50 mb-2">{stat.label}</p>
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-0.5">
                <span className="text-4xl font-bold font-mono text-white">{stat.value}</span>
                {stat.suffix && <span className="text-xl font-mono text-white/60">{stat.suffix}</span>}
              </div>
              {stat.sparklineData && (
                <Sparkline data={stat.sparklineData} color={stat.sparklineColor!} />
              )}
              {stat.showTrendArrow && (
                <div className="flex items-center gap-1">
                  <TrendingDown className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-mono text-emerald-400">debt</span>
                </div>
              )}
            </div>
            <p className={`text-sm font-mono mt-2 ${stat.subtextColor}`}>
              {stat.subtext}
            </p>
            {stat.hasProgress && (
              <>
                <ProgressBar value={stat.progressValue!} color={stat.progressColor!} />
                <p className="text-xs text-white/40 mt-1">{stat.progressLabel}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
