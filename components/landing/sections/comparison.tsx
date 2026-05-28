"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Minus, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Container, Section, Eyebrow, Heading, Reveal, EASE_OUT } from "../primitives"
import { CTAButton } from "../cta-button"
import { Logo } from "../logo"

type Cell = "yes" | "partial" | "no"

const TOOLS = ["AI Chat", "Docs / Wikis", "Project Tools", "BI Dashboards"]

const ROWS: { capability: string; values: Cell[]; decisionos: Cell }[] = [
  { capability: "Persistent context", values: ["no", "partial", "partial", "no"], decisionos: "yes" },
  { capability: "Reasoning structure", values: ["partial", "no", "no", "no"], decisionos: "yes" },
  { capability: "Prioritization", values: ["no", "no", "partial", "partial"], decisionos: "yes" },
  { capability: "Execution loop", values: ["no", "no", "partial", "no"], decisionos: "yes" },
  { capability: "Decision memory", values: ["no", "partial", "no", "no"], decisionos: "yes" },
]

function CellMark({ value, accent = false }: { value: Cell; accent?: boolean }) {
  if (value === "yes")
    return (
      <Check
        className={cn("h-4 w-4", accent ? "text-primary" : "text-white/70")}
        strokeWidth={2.5}
      />
    )
  if (value === "partial")
    return <span className="h-1.5 w-3 rounded-full bg-white/30" />
  return <Minus className="h-3.5 w-3.5 text-white/15" />
}

export function Comparison() {
  const [open, setOpen] = useState(0)

  return (
    <Section id="compare">
      <Container>
        <div className="max-w-2xl">
          <Reveal>
            <Eyebrow index="10">Comparison</Eyebrow>
            <Heading className="mt-5 text-3xl leading-[1.12] sm:text-4xl lg:text-[2.85rem]">
              Not another place to write things down.
            </Heading>
            <p className="mt-5 text-pretty text-base leading-relaxed text-white/55">
              Chat, docs, project tools, and dashboards each hold a fragment.
              DecisionOS is the system that keeps the whole decision coherent.
            </p>
          </Reveal>
        </div>

        {/* desktop table */}
        <Reveal delay={0.1} className="mt-14 hidden lg:block">
          <div className="overflow-hidden rounded-lg border border-white/[0.08]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="w-[26%] px-5 py-4 text-left font-mono text-[10px] uppercase text-white/35">
                    Capability
                  </th>
                  {TOOLS.map((t) => (
                    <th
                      key={t}
                      className="px-3 py-4 text-center text-sm font-medium text-white/45"
                    >
                      {t}
                    </th>
                  ))}
                  <th className="relative px-3 py-4 text-center">
                    <div className="absolute inset-x-1 inset-y-0 -top-px rounded-t-lg border-x border-t border-primary/25 bg-primary/[0.06]" />
                    <span className="relative inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                      <Logo className="h-4 w-4" />
                      DecisionOS
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr
                    key={row.capability}
                    className={cn(
                      "group border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.02]",
                    )}
                  >
                    <td className="px-5 py-4 text-sm font-medium text-white/75">
                      {row.capability}
                    </td>
                    {row.values.map((v, j) => (
                      <td key={j} className="px-3 py-4">
                        <div className="flex justify-center">
                          <CellMark value={v} />
                        </div>
                      </td>
                    ))}
                    <td className="relative px-3 py-4">
                      <div
                        className={cn(
                          "absolute inset-x-1 inset-y-0 border-x border-primary/25 bg-primary/[0.06]",
                          i === ROWS.length - 1 && "rounded-b-xl border-b"
                        )}
                      />
                      <div className="relative flex justify-center">
                        <CellMark value={row.decisionos} accent />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* mobile expandable rows */}
        <Reveal delay={0.1} className="mt-10 space-y-2.5 lg:hidden">
          {ROWS.map((row, i) => {
            const isOpen = open === i
            return (
              <div
                key={row.capability}
                className="overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.015]"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium text-white">{row.capability}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-white/40 transition-transform duration-300",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={false}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE_OUT }}
                    >
                      <div className="space-y-1.5 px-4 pb-4">
                        {TOOLS.map((t, j) => (
                          <Row key={t} label={t} value={row.values[j]} />
                        ))}
                        <div className="mt-1 rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2">
                          <Row label="DecisionOS" value={row.decisionos} accent />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </Reveal>

        <Reveal delay={0.1} className="mt-10">
          <CTAButton href="#request" variant="ghost" icon="arrow">
            Compare workflows
          </CTAButton>
        </Reveal>
      </Container>
    </Section>
  )
}

function Row({ label, value, accent }: { label: string; value: Cell; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn("text-sm", accent ? "font-medium text-white" : "text-white/55")}>
        {label}
      </span>
      <CellMark value={value} accent={accent} />
    </div>
  )
}
