"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Zap, RotateCcw, X, Eye, EyeOff, Archive, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import type { Decision as StoreDecision } from "@/lib/types"

interface ArchivedDecision {
  id: string
  title: string
  date: string
  month: string
  year: number
  impact: number
  status: "archived" | "voided" | "superseded"
  echoTargets?: string[]
  summary: string
}

const ARCHIVE_STATUSES = new Set(["archived", "voided", "superseded"])

function mapStoreDecision(d: StoreDecision): ArchivedDecision {
  const date = new Date(d.createdAt)
  const month = date.toLocaleDateString("en-US", { month: "short" })
  const year = date.getFullYear()
  return {
    id: d.id,
    title: d.title,
    date: `${month} ${year}`,
    month,
    year,
    impact: d.impact,
    status: d.status as ArchivedDecision["status"],
    echoTargets: d.echoTargets,
    summary: d.summary ?? d.rawThinking.slice(0, 120),
  }
}

interface ArchiveTimelineProps {
  storeDecisions?: StoreDecision[]
  onRestore?: (id: string) => void
}

export function ArchiveTimeline({ storeDecisions, onRestore }: ArchiveTimelineProps) {
  const router = useRouter()
  const yearRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const containerRef = useRef<HTMLDivElement>(null)

  const archivedDecisions = (storeDecisions ?? [])
    .filter((d) => ARCHIVE_STATUSES.has(d.status))
    .map(mapStoreDecision)
  const years = Array.from(new Set(archivedDecisions.map((d) => d.year))).sort()

  const [selectedDecision, setSelectedDecision] = useState<ArchivedDecision | null>(null)
  const [showDecay, setShowDecay] = useState(true)

  const scrollToYear = (year: number) => {
    yearRefs.current[year]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const getDecayLevel = (year: number, month: string) => {
    const now = new Date()
    const decisionDate = new Date(`${month} 1, ${year}`)
    const monthsAgo = (now.getTime() - decisionDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    return Math.min(1, monthsAgo / 24)
  }

  const handleRestore = (decision: ArchivedDecision) => {
    if (!onRestore) return
    onRestore(decision.id)
    setSelectedDecision(null)
    toast.success(`"${decision.title}" restored to draft`)
  }

  return (
    <div className="relative w-full h-full min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-semibold text-white">Decision History</h2>
          <p className="text-sm text-white/40">Closed decisions and their downstream links</p>
        </div>
        <button
          onClick={() => setShowDecay(!showDecay)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/60 hover:bg-white/10 transition-colors"
        >
          {showDecay ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showDecay ? "Hide age fade" : "Show age fade"}
        </button>
      </div>

      {/* Empty state */}
      {archivedDecisions.length === 0 && (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
          <div className="w-14 h-14 mb-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Archive className="w-6 h-6 text-white/20" />
          </div>
          <p className="text-white/50 text-base mb-1">No closed decisions yet</p>
          <p className="text-white/30 text-sm max-w-sm mb-5">
            You haven&apos;t closed any decisions yet. Move a decision to
            &ldquo;Archived&rdquo; from its detail page to see it here.
          </p>
          <button
            onClick={() => router.push("/decisions")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm hover:bg-primary/15 transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            Go to Decisions
          </button>
        </div>
      )}

      {/* Timeline Container */}
      {archivedDecisions.length > 0 && (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-8"
          style={{ perspective: "1000px" }}
        >
          <div className="relative max-w-3xl mx-auto">
            {/* Vertical Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-secondary/30 to-transparent" />

            {/* Year Groups */}
            {years.map((year) => (
              <div
                key={year}
                ref={(el) => { yearRefs.current[year] = el }}
                className="relative mb-12"
              >
                {/* Year Marker */}
                <div className="sticky top-0 z-10 flex items-center gap-4 mb-6 -ml-2">
                  <div className="w-20 h-8 bg-secondary/20 backdrop-blur-xl border border-secondary/30 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-mono text-secondary">{year}</span>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-secondary/30 to-transparent" />
                </div>

                {/* Decisions for this year */}
                <div className="space-y-6 pl-16">
                  {archivedDecisions
                    .filter((d) => d.year === year)
                    .map((decision, index) => {
                      const decayLevel = getDecayLevel(decision.year, decision.month)
                      const opacity = showDecay ? 1 - decayLevel * 0.7 : 1
                      const isVoided = decision.status === "voided"
                      const hasEchoes = decision.echoTargets && decision.echoTargets.length > 0

                      return (
                        <motion.div
                          key={decision.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative"
                          style={{
                            transform: showDecay ? `translateZ(${-decayLevel * 100}px)` : "none",
                          }}
                        >
                          {/* Timeline Node */}
                          <div
                            className="absolute -left-[52px] w-4 h-4 rounded-full border-2 transition-all"
                            style={{
                              backgroundColor: hasEchoes ? "var(--secondary)" : "transparent",
                              borderColor: hasEchoes ? "var(--secondary)" : "rgba(255,255,255,0.2)",
                              boxShadow: hasEchoes ? "0 0 12px var(--secondary-glow)" : "none",
                            }}
                          />

                          {/* Link lines */}
                          {hasEchoes && (
                            <div className="absolute -left-12 top-2 w-48 h-px">
                              <motion.div
                                className="h-full bg-gradient-to-r from-secondary to-primary"
                                animate={{ opacity: [0.3, 0.8, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              />
                            </div>
                          )}

                          {/* Card */}
                          <motion.button
                            type="button"
                            onClick={() => setSelectedDecision(decision)}
                            className={`relative w-full p-4 rounded-xl border cursor-pointer text-left transition-all duration-300 ${
                              isVoided
                                ? "bg-destructive/5 border-destructive/20"
                                : "bg-white/5 border-white/10 hover:border-white/20"
                            }`}
                            style={{
                              opacity,
                              filter: showDecay ? `grayscale(${decayLevel * 0.8})` : "none",
                            }}
                            whileHover={{ scale: 1.02, opacity: 1, filter: "grayscale(0)" }}
                          >
                            {/* VOID Stamp */}
                            {isVoided && (
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none">
                                <span className="text-4xl font-black text-destructive/30 tracking-widest">
                                  VOID
                                </span>
                              </div>
                            )}

                            {/* Content */}
                            <div className="relative z-10">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="text-sm font-medium text-white">{decision.title}</h3>
                                  <p className="text-xs text-white/40 font-mono">{decision.date}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <div
                                      key={i}
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{
                                        backgroundColor:
                                          i < decision.impact
                                            ? isVoided
                                              ? "var(--destructive)"
                                              : "var(--secondary)"
                                            : "rgba(255,255,255,0.1)",
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>

                              <p className="text-xs text-white/50 line-clamp-2">{decision.summary}</p>

                              {/* Linked records */}
                              {hasEchoes && (
                                <div className="mt-3 pt-3 border-t border-white/5">
                                  <div className="flex items-center gap-1.5">
                                    <Zap className="w-3 h-3 text-secondary" />
                                    <span className="text-[10px] text-secondary uppercase tracking-wider">
                                      Linked to:
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {decision.echoTargets?.map((target) => (
                                      <span
                                        key={target}
                                        className="text-[10px] px-1.5 py-0.5 bg-secondary/20 text-secondary rounded"
                                      >
                                        {target}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Status Badge */}
                              <div className="absolute top-3 right-3">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    decision.status === "voided"
                                      ? "bg-destructive/20 text-destructive"
                                      : decision.status === "superseded"
                                      ? "bg-warning/20 text-warning"
                                      : "bg-white/10 text-white/40"
                                  }`}
                                >
                                  {decision.status}
                                </span>
                              </div>
                            </div>
                          </motion.button>
                        </motion.div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Scrubber */}
      {archivedDecisions.length > 0 && (
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
              <Calendar className="w-4 h-4 text-white/40" />
              <div className="flex-1 flex items-center gap-2">
                {years.map((year) => (
                  <button
                    key={year}
                    onClick={() => scrollToYear(year)}
                    className="px-3 py-1 text-xs font-mono text-white/60 hover:text-white hover:bg-white/5 rounded transition-colors"
                  >
                    {year}
                  </button>
                ))}
              </div>
              <span className="text-xs text-white/30 font-mono">
                {archivedDecisions.length} archived
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedDecision && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="archived-decision-title"
            onClick={() => setSelectedDecision(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#0a0f14] border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 id="archived-decision-title" className="text-lg font-semibold text-white">{selectedDecision.title}</h3>
                  <p className="text-sm text-white/40 font-mono">{selectedDecision.date}</p>
                </div>
                <button
                  onClick={() => setSelectedDecision(null)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close archived decision preview"
                >
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <p className="text-sm text-white/70 mb-6">{selectedDecision.summary}</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    router.push(`/decisions/${selectedDecision.id}`)
                    setSelectedDecision(null)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 hover:text-white transition-colors text-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  View Decision
                </button>

                {selectedDecision.status !== "voided" && onRestore && (
                  <button
                    onClick={() => handleRestore(selectedDecision)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-secondary/20 text-secondary rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore Decision
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
