"use client"

import { useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Container, Section, Eyebrow, Heading, Reveal, EASE_OUT } from "../primitives"

/* ── compact, faithful product visuals (one per tab) ───────────────────── */

const SEVERITY = {
  critical: { dot: "bg-destructive", label: "Risk", cls: "text-destructive/90" },
  attention: { dot: "bg-warning", label: "Review", cls: "text-warning/90" },
  info: { dot: "bg-white/35", label: "Pattern", cls: "text-white/45" },
} as const

function Panel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-bg-card/70 shadow-[0_34px_110px_-54px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.04] backdrop-blur-2xl">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white/15" />
          <span className="h-2 w-2 rounded-full bg-white/15" />
          <span className="h-2 w-2 rounded-full bg-white/15" />
        </div>
        <span className="font-mono text-[11px] text-white/35">{label}</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  )
}

function SignalsViz() {
  const rows = [
    { sev: "critical", title: "High risk, no pre-mortem", reason: "A critical-risk call was committed without naming how it could fail." },
    { sev: "attention", title: "Revisit overdue", reason: "You said you'd look back 6 days ago. The longer you wait, the less honest the review." },
    { sev: "info", title: "Dominant constraint pattern", reason: "“Headcount” appears in 43% of constraint tags — a recurring blocker." },
  ] as const
  return (
    <Panel label="app / signals">
      <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.015]">
        {rows.map((r) => {
          const sev = SEVERITY[r.sev]
          return (
            <li key={r.title} className="flex items-start gap-3 px-4 py-3">
              <span className={cn("mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full", sev.dot)} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium text-white/90">{r.title}</span>
                  <span className={cn("font-mono text-[10px] uppercase", sev.cls)}>{sev.label}</span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-white/55 text-pretty">{r.reason}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function HealthViz() {
  const metrics = [
    { value: 1, label: "revisit health", help: "due now", tone: "text-warning" },
    { value: 2, label: "unresolved risk", help: "live decisions", tone: "text-destructive" },
    { value: 0, label: "execution gaps", help: "clear", tone: "text-white/35" },
  ]
  return (
    <Panel label="app / decision health">
      <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.015]">
        <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col gap-0.5 px-4 py-4">
              <span className={cn("font-mono text-2xl tabular-nums", m.tone)}>{m.value}</span>
              <span className="text-xs font-medium text-white/55">{m.label}</span>
              <span className="text-[11px] text-white/30">{m.help}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-white/35">Three numbers. No dashboards to decode.</p>
    </Panel>
  )
}

function ThinkingViz() {
  return (
    <Panel label="decisions / q3-infra-bet">
      <div className="font-mono text-[10px] uppercase text-white/35">Decision brief</div>
      <div className="mt-1.5 text-sm font-semibold leading-snug text-white">
        Adopt event-driven architecture for ingestion
      </div>
      <div className="mt-4 space-y-2">
        {[
          { p: "Path A", t: "Event-driven", chip: "Scalable · reversible", on: true },
          { p: "Path B", t: "Batch pipeline", chip: "Simple · rigid", on: false },
        ].map((o) => (
          <div
            key={o.p}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5",
              o.on ? "border-primary/25 bg-primary/[0.05]" : "border-white/[0.07] bg-white/[0.02]"
            )}
          >
            <span className={cn("font-mono text-[10px]", o.on ? "text-primary" : "text-white/40")}>{o.p}</span>
            <span className="text-sm font-medium text-white">{o.t}</span>
            <span className="ml-auto text-[11px] text-white/45">{o.chip}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/[0.06] px-3 py-2.5">
        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warning" />
        <p className="text-[12px] leading-relaxed text-white/60">
          <span className="font-medium text-warning/90">Pre-mortem:</span> if this fails, it&rsquo;s
          back-pressure under load. Name the rollback before committing.
        </p>
      </div>
    </Panel>
  )
}

const MEM_NODES = [
  { x: 40, y: 150, r: 4, o: 0.4 },
  { x: 120, y: 110, r: 5, o: 0.55 },
  { x: 200, y: 135, r: 5, o: 0.7 },
  { x: 280, y: 90, r: 6, o: 0.85 },
  { x: 360, y: 56, r: 9, o: 1 },
]
const MEM_LAST = MEM_NODES[MEM_NODES.length - 1]

function MemoryViz() {
  return (
    <Panel label="app / memory">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase text-white/35">
        <span>Earlier</span>
        <span className="text-primary/70">Now</span>
      </div>
      <svg viewBox="0 0 400 190" className="h-auto w-full">
        {MEM_NODES.slice(0, -1).map((n, i) => {
          const midX = (n.x + MEM_LAST.x) / 2
          const midY = Math.min(n.y, MEM_LAST.y) - 32
          return (
            <motion.path
              key={i}
              d={`M ${n.x} ${n.y} Q ${midX} ${midY} ${MEM_LAST.x} ${MEM_LAST.y}`}
              fill="none"
              stroke="url(#cs-mem-grad)"
              strokeWidth="1.25"
              initial={false}
              whileInView={{ pathLength: 1, opacity: 0.45 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.3 + i * 0.12 }}
            />
          )
        })}
        <motion.path
          d={`M ${MEM_NODES.map((n) => `${n.x} ${n.y}`).join(" L ")}`}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
          strokeDasharray="2 4"
          initial={false}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: EASE_OUT }}
        />
        {MEM_NODES.map((n, i) => (
          <motion.circle
            key={i}
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={i === MEM_NODES.length - 1 ? "var(--primary)" : "rgba(255,255,255,0.5)"}
            fillOpacity={n.o}
            initial={false}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.2 + i * 0.12 }}
            style={{
              transformOrigin: `${n.x}px ${n.y}px`,
              filter: i === MEM_NODES.length - 1 ? "drop-shadow(0 0 10px var(--primary-glow))" : "none",
            }}
          />
        ))}
        <defs>
          <linearGradient id="cs-mem-grad" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--secondary)" />
            <stop offset="1" stopColor="var(--primary)" />
          </linearGradient>
        </defs>
      </svg>
      <p className="mt-1 text-center text-xs text-white/35">Older decisions inform the newest one — automatically.</p>
    </Panel>
  )
}

const STAGES = [
  { label: "Decision", state: "done" },
  { label: "Owner", state: "done" },
  { label: "Milestone", state: "active" },
  { label: "Dependency", state: "risk" },
  { label: "Status", state: "active" },
  { label: "Learning", state: "todo" },
] as const

function ExecutionViz() {
  return (
    <Panel label="app / execution">
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-sm font-semibold leading-snug text-white">Adopt event-driven architecture</h4>
        <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-warning/25 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          In progress
        </span>
      </div>
      <div className="mt-5 flex items-center gap-1.5">
        {STAGES.map((s, i) => (
          <motion.div
            key={s.label}
            className="flex-1"
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: i * 0.1 }}
          >
            <div
              className={cn(
                "flex h-7 items-center justify-center rounded-md text-[10px] font-medium",
                s.state === "done" && "bg-primary/15 text-primary",
                s.state === "active" && "bg-white/[0.08] text-white",
                s.state === "risk" && "bg-destructive/15 text-destructive",
                s.state === "todo" && "bg-white/[0.03] text-white/35"
              )}
            >
              {s.state === "done" ? <Check className="h-3.5 w-3.5" /> : null}
            </div>
            <div className="mt-1.5 text-center text-[9px] text-white/40">{s.label}</div>
          </motion.div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-white/35">Consensus is the start line — owners and a revisit date carry it home.</p>
    </Panel>
  )
}

/* ── tabs ──────────────────────────────────────────────────────────────── */

const TABS = [
  {
    id: "signals",
    label: "Signals",
    title: "It surfaces only what matters.",
    body: "One calm attention surface ranks what genuinely needs you — a recurring risk, an overdue review — and stays quiet when nothing does.",
    points: ["Severity-ranked and deduped", "Evidence attached to every signal"],
    Viz: SignalsViz,
  },
  {
    id: "health",
    label: "Decision Health",
    title: "The state of your thinking, in three numbers.",
    body: "What's due for review, what risk is unresolved, and where execution hasn't started — readable at a glance, with no vanity metrics.",
    points: ["No dashboards to decode", "Color only when it means something"],
    Viz: HealthViz,
  },
  {
    id: "thinking",
    label: "Guided Thinking",
    title: "A ritual that moves a call from gut to reasoned.",
    body: "Lay out the options, weigh the trade-offs, and name how it could fail — before you commit, not after.",
    points: ["Compare paths side by side", "Pre-mortem the failure first"],
    Viz: ThinkingViz,
  },
  {
    id: "memory",
    label: "Memory",
    title: "Every decision becomes reusable memory.",
    body: "Past decisions stay linked to the ones that follow, so reasoning compounds into memory instead of being rediscovered each time.",
    points: ["Context compounds", "The why travels with the what"],
    Viz: MemoryViz,
  },
  {
    id: "execution",
    label: "Execution Loop",
    title: "Decisions don't end at consensus.",
    body: "Owners, milestones, and a revisit date turn each decision into tracked, audited work — with a learning loop built in.",
    points: ["Owners and status linked", "A revisit closes the loop"],
    Viz: ExecutionViz,
  },
]

export function CoreSystem() {
  const [active, setActive] = useState(0)
  const tab = TABS[active]
  const Viz = tab.Viz

  return (
    <Section id="system" className="border-y border-white/[0.05] bg-white/[0.012]">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow index="04" className="justify-center">
              Core system
            </Eyebrow>
            <Heading className="mt-5 text-3xl leading-[1.12] sm:text-4xl lg:text-[2.85rem]">
              Five surfaces, one calm instrument.
            </Heading>
            <p className="mt-5 text-pretty text-base leading-relaxed text-white/55">
              The whole system in one place — inspect any part without leaving
              the others behind.
            </p>
          </Reveal>
        </div>

        {/* segmented control */}
        <Reveal delay={0.08}>
          <div className="-mx-5 mb-10 mt-12 flex gap-2 overflow-x-auto px-5 pb-1 sm:justify-center [scrollbar-width:none]">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "relative flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active === i ? "text-white" : "text-white/50 hover:text-white/80"
                )}
              >
                {active === i && (
                  <motion.span
                    layoutId="core-pill"
                    className="absolute inset-0 rounded-full border border-white/[0.12] bg-white/[0.06]"
                    transition={{ duration: 0.4, ease: EASE_OUT }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>
        </Reveal>

        {/* active tab */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab.id}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
          >
            <div className="lg:max-w-md">
              <h3 className="text-2xl font-semibold leading-snug text-white sm:text-[1.7rem]">
                {tab.title}
              </h3>
              <p className="mt-4 text-pretty text-base leading-relaxed text-white/55">{tab.body}</p>
              <ul className="mt-6 space-y-2.5">
                {tab.points.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-sm text-white/65">
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <Viz />
          </motion.div>
        </AnimatePresence>

        <p className="mt-10 text-center font-mono text-[11px] uppercase tracking-wide text-white/40">
          Illustrative screens · your data stays in your browser
        </p>
      </Container>
    </Section>
  )
}
