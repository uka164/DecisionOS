"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Brain, Network, Gauge, GitBranch } from "lucide-react"
import { cn } from "@/lib/utils"
import { EASE_OUT } from "./primitives"

const LAYERS = [
  { icon: Brain, label: "Reasoning", color: "var(--primary)" },
  { icon: Network, label: "Context", color: "var(--secondary)" },
  { icon: Gauge, label: "Priority", color: "var(--primary)" },
  { icon: GitBranch, label: "Execution", color: "var(--secondary)" },
]

const OWNERS = [
  { name: "Platform", status: "On track", tone: "text-emerald-400", dot: "bg-emerald-400" },
  { name: "Data", status: "At risk", tone: "text-amber-400", dot: "bg-amber-400" },
  { name: "Security", status: "Review", tone: "text-sky-300", dot: "bg-sky-300" },
]

/**
 * The signature product visual — an abstract, calm rendering of the Decision
 * Workspace. Columns settle into alignment on entry; the active layer cycles
 * gently to suggest a living system. No fake micro-copy, no spectacle.
 */
export function WorkspaceMock({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setActive((a) => (a + 1) % LAYERS.length), 3200)
    return () => clearInterval(id)
  }, [reduce])

  const col = (i: number) => ({
    initial: false,
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true } as const,
    transition: { duration: 0.75, ease: EASE_OUT, delay: 0.1 * i },
  })

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-white/[0.08] bg-bg-card/78 backdrop-blur-2xl",
        "shadow-[0_34px_110px_-54px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.04]",
        className
      )}
    >
      {/* window bar */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </div>
        <div className="font-mono text-[11px] text-white/35">
          decisions / q3-infra-bet
        </div>
        <div className="ml-auto hidden items-center gap-1.5 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/80" />
          <span className="font-mono text-[11px] text-white/35">live</span>
        </div>
      </div>

      {/* body */}
      <div className="grid grid-cols-12 gap-3 p-3 sm:gap-4 sm:p-5">
        {/* layer rail */}
        <motion.div
          {...col(0)}
          className="col-span-12 space-y-1.5 sm:col-span-3"
        >
          {LAYERS.map((layer, i) => {
            const Icon = layer.icon
            const isActive = active === i
            return (
              <div
                key={layer.label}
                className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors duration-500",
                  isActive
                    ? "border-white/[0.12] bg-white/[0.05]"
                    : "border-transparent bg-transparent"
                )}
              >
                <span
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
                  style={{
                    background: isActive
                      ? "color-mix(in srgb, var(--primary) 18%, transparent)"
                      : "rgba(255,255,255,0.04)",
                  }}
                >
                  <Icon
                    className="h-3.5 w-3.5"
                    style={{ color: isActive ? layer.color : "rgba(255,255,255,0.4)" }}
                  />
                </span>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors duration-500",
                    isActive ? "text-white" : "text-white/45"
                  )}
                >
                  {layer.label}
                </span>
              </div>
            )
          })}
        </motion.div>

        {/* decision brief */}
        <motion.div
          {...col(1)}
          className="col-span-12 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 sm:col-span-6"
        >
          <div className="font-mono text-[10px] uppercase text-white/35">
            Decision brief
          </div>
          <div className="mt-2 text-sm font-semibold leading-snug text-white">
            Adopt an event-driven architecture for ingestion
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-white/[0.06]" />
            <div className="h-1.5 w-[88%] rounded-full bg-white/[0.06]" />
            <div className="h-1.5 w-[64%] rounded-full bg-white/[0.06]" />
          </div>

          {/* tradeoff matrix */}
          <div className="mt-4 grid grid-cols-2 gap-1.5">
            {[
              { l: "Scalability", v: "High", on: true },
              { l: "Complexity", v: "High", on: false },
              { l: "Reversible", v: "Partial", on: true },
              { l: "Cost", v: "Medium", on: false },
            ].map((t) => (
              <div
                key={t.l}
                className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.015] px-2.5 py-2"
              >
                <span className="text-[11px] text-white/45">{t.l}</span>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    t.on ? "text-primary" : "text-white/55"
                  )}
                >
                  {t.v}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* priority + execution */}
        <motion.div
          {...col(2)}
          className="col-span-12 space-y-3 sm:col-span-3"
        >
          <div className="flex flex-col items-center rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-4">
            <ScoreRing value={78} />
            <div className="mt-2 font-mono text-[10px] uppercase text-white/40">
              Priority
            </div>
          </div>
          <div className="space-y-1.5 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
            {OWNERS.map((o) => (
              <div key={o.name} className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 flex-shrink-0 rounded-full", o.dot)} />
                <span className="text-[11px] text-white/55">{o.name}</span>
                <span className={cn("ml-auto text-[10px] font-medium", o.tone)}>
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ambient sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 opacity-[0.24]"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--primary-glow), transparent 70%)",
        }}
      />
    </div>
  )
}

function ScoreRing({ value }: { value: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c

  return (
    <div className="relative h-[68px] w-[68px]">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.4 }}
          style={{ filter: "drop-shadow(0 0 6px var(--primary-glow))" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-lg font-semibold text-white">{value}</span>
      </div>
    </div>
  )
}
