"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Play, Pause, ChevronLeft, ChevronRight, ChevronDown, Sparkles, AlertTriangle, CheckCircle, Clock, FlaskConical, ArrowRight, Plus, X } from "lucide-react"
import { useExperimentsStore, useDecisionsStore } from "@/stores"
import type { Experiment } from "@/lib/types"


const STATUS_CONFIG = {
  active: { color: "#06b6d4", icon: Play, label: "Active" },
  paused: { color: "#f59e0b", icon: Pause, label: "Paused" },
  concluded: { color: "#10b981", icon: CheckCircle, label: "Concluded" },
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 120
  const height = 40

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * height
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#grad-${color})`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  )
}

function TugOfWarBar({
  expected,
  actual,
  metricType,
}: {
  expected: number
  actual: number | null
  metricType: "higher" | "lower"
}) {
  if (actual === null) {
    return (
      <div className="h-full w-2 bg-white/10 rounded-full flex items-center justify-center">
        <div className="w-1 h-1 bg-white/30 rounded-full" />
      </div>
    )
  }

  const deviation = ((actual - expected) / expected) * 100
  const isSuccess =
    metricType === "higher" ? actual >= expected : actual <= expected

  return (
    <div className="relative h-full w-3 flex flex-col items-center">
      {/* Track */}
      <div className="absolute inset-0 w-full bg-white/5 rounded-full" />

      {/* Center Line */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />

      {/* Indicator */}
      <motion.div
        initial={{ top: "50%" }}
        animate={{
          top: `${50 - Math.min(40, Math.max(-40, deviation))}%`,
        }}
        className={`absolute w-3 h-3 rounded-full ${
          isSuccess ? "bg-emerald-500" : "bg-rose-500"
        }`}
        style={{
          boxShadow: `0 0 12px ${isSuccess ? "#10b981" : "#f43f5e"}`,
        }}
      />

      {/* Labels */}
      <span className="absolute -top-5 text-[9px] text-emerald-400 font-mono">+</span>
      <span className="absolute -bottom-5 text-[9px] text-rose-400 font-mono">−</span>
    </div>
  )
}

export function ExperimentLab({ experiments: experimentsProp }: { experiments?: Experiment[] }) {
  const experiments = experimentsProp ?? []
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  if (experiments.length === 0) {
    return (
      <div className="relative w-full h-full min-h-[600px] flex flex-col items-center justify-center text-center px-6">
        <div className="w-14 h-14 mb-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <FlaskConical className="w-6 h-6 text-white/20" />
        </div>
        <p className="text-white/50 text-base mb-1">No experiments yet</p>
        <p className="text-white/30 text-sm max-w-sm mb-5">
          Track real-world outcomes for your decisions. Link an experiment to a
          decision to validate whether it worked.
        </p>
        <a
          href="/decisions"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-primary text-sm hover:bg-cyan-500/15 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          View Decisions
        </a>
      </div>
    )
  }

  const safeIndex = Math.min(currentIndex, experiments.length - 1)
  const experiment = experiments[safeIndex]
  const statusConfig = STATUS_CONFIG[experiment.status]

  const deviation = experiment?.result.actual
    ? Math.round(
        ((experiment.result.actual - experiment.hypothesis.expected) /
          experiment.hypothesis.expected) *
          100
      )
    : null

  const isSuccess =
    experiment.result.actual !== null &&
    experiment.result.actual >= experiment.hypothesis.expected

  return (
    <div className="relative w-full h-full min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30"
            aria-label="Previous experiment"
          >
            <ChevronLeft className="w-5 h-5 text-white/60" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-white/40">
                EXP-{String(experiment.number).padStart(2, "0")}
              </span>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: `${statusConfig.color}20`,
                  color: statusConfig.color,
                }}
              >
                <statusConfig.icon className="w-3 h-3" />
                {statusConfig.label}
              </div>
            </div>
            <h2 className="text-lg font-semibold text-white text-balance">{experiment.title}</h2>
          </div>

          <button
            onClick={() => setCurrentIndex((i) => Math.min(experiments.length - 1, i + 1))}
            disabled={currentIndex === experiments.length - 1}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-30"
            aria-label="Next experiment"
          >
            <ChevronRight className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/15 text-primary text-xs rounded-lg hover:bg-cyan-500/25 transition-colors border border-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Experiment</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {showCreateModal && <CreateExperimentModal onClose={() => setShowCreateModal(false)} />}

      {/* Main Content - Split Screen */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Hypothesis */}
        <div className="flex-1 p-4 sm:p-6 lg:border-r border-white/10">
          <div className="h-full bg-[#0a0f14] border border-white/10 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Hypothesis</h3>
            </div>

            {/* Terminal-style Input */}
            <div className="bg-black/40 rounded-lg p-4 font-mono text-sm mb-4 border border-white/5">
              <div className="flex items-center gap-2 text-white/40 mb-2">
                <span className="text-purple-400">$</span>
                <span>expected_outcome</span>
              </div>
              <div className="pl-4 border-l-2 border-purple-500/50">
                <p className="text-cyan-400">
                  {experiment.hypothesis.metric}:{" "}
                  <span className="text-white">
                    {experiment.hypothesis.expected}
                    {experiment.hypothesis.unit}
                  </span>
                </p>
              </div>
            </div>

            {/* Rationale */}
            <div className="flex-1">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Rationale</p>
              <p className="text-sm text-white/70 leading-relaxed">
                {experiment.hypothesis.rationale}
              </p>
            </div>

            {/* Expected Value Display */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-white/40 mb-2">Target</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-mono font-bold text-purple-400">
                  {experiment.hypothesis.expected}
                </span>
                <span className="text-lg text-white/40">{experiment.hypothesis.unit}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tug of War Bar */}
        <div className="hidden lg:flex w-12 items-center justify-center py-12">
          <TugOfWarBar
            expected={experiment.hypothesis.expected}
            actual={experiment.result.actual}
            metricType="higher"
          />
        </div>

        {/* Right: Result */}
        <div className="flex-1 p-4 sm:p-6 lg:border-l border-t lg:border-t-0 border-white/10">
          <div className="h-full bg-[#0a0f14] border border-white/10 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Reality</h3>
              </div>
              <span className="text-xs text-white/40 font-mono">
                {experiment.result.startDate}
                {experiment.result.endDate && ` → ${experiment.result.endDate}`}
              </span>
            </div>

            {/* Live Visualization */}
            <div className="bg-black/40 rounded-lg p-4 mb-4 border border-white/5">
              <MiniSparkline
                data={experiment.result.trend}
                color={isSuccess ? "#10b981" : "#f43f5e"}
              />
            </div>

            {/* Current Value */}
            <div className="flex-1 flex flex-col justify-center">
              {experiment.result.actual !== null ? (
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span
                      className={`text-5xl font-mono font-bold ${
                        isSuccess ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {experiment.result.actual}
                    </span>
                    <span className="text-lg text-white/40">
                      {experiment.hypothesis.unit}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    {isSuccess ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    <span
                      className={`text-sm font-mono ${
                        isSuccess ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {deviation! > 0 ? "+" : ""}
                      {deviation}% from hypothesis
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-sm text-white/40">Collecting data...</p>
                </div>
              )}
            </div>

            {/* Run Simulation Button */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <motion.button
                onClick={() => setIsRunning(!isRunning)}
                className={`w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  isRunning
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause Simulation
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Simulation
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Confidence Interval */}
      <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/40 uppercase tracking-wider">
            Confidence Interval
          </span>
          <div className="flex-1 max-w-md">
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: `linear-gradient(90deg, #f43f5e 0%, #f59e0b 50%, #10b981 100%)`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${experiment.confidenceInterval}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          <span className="text-sm font-mono text-white/60">
            {experiment.confidenceInterval}%
          </span>
        </div>
      </div>

      {/* Observation Log — bottom anchor */}
      <ObservationLog experimentId={experiment.id} />
    </div>
  )
}

// ─── Observation Log (persisted via Zustand) ─────────────────────────────────

function ObservationLog({ experimentId }: { experimentId: string }) {
  const experiment = useExperimentsStore((s) => s.experiments.find((e) => e.id === experimentId))
  const addObservation = useExperimentsStore((s) => s.addObservation)
  const entries = experiment?.observations ?? []
  const [draft, setDraft] = useState("")
  const [expanded, setExpanded] = useState(true)

  const addEntry = () => {
    if (!draft.trim()) return
    addObservation(experimentId, draft.trim())
    setDraft("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      addEntry()
    }
  }

  return (
    <div className="px-6 py-4 border-t border-white/10 bg-white/[0.01] flex-1 flex flex-col min-h-[160px]">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 mb-3 group"
      >
        <Clock className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-white">Observations</h3>
        <span className="text-[10px] text-white/30 font-mono">
          {entries.length > 0 ? `(${entries.length})` : ""}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/30 transition-transform ml-auto ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Log an observation… (Ctrl+Enter to save)"
              rows={2}
              className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 font-mono resize-none focus:outline-none focus:border-primary/40 transition-colors"
            />
            <button
              onClick={addEntry}
              disabled={!draft.trim()}
              className="px-3 py-2 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed self-end"
            >
              Log
            </button>
          </div>

          {entries.length > 0 ? (
            <div className="space-y-2 overflow-y-auto max-h-[200px]">
              {entries.map((entry, i) => (
                <div
                  key={`${entry.timestamp}-${i}`}
                  className="flex items-start gap-2 p-2 bg-white/[0.03] border border-white/[0.06] rounded-lg"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400/50 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 font-mono whitespace-pre-wrap">{entry.text}</p>
                    <p className="text-[10px] text-white/25 font-mono mt-1">
                      {new Date(entry.timestamp).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/20 text-center py-4">
              No observations yet. Log notes as you track this experiment.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Create Experiment Modal ──────────────────────────────────────────────────

function CreateExperimentModal({ onClose }: { onClose: () => void }) {
  const decisions = useDecisionsStore((s) => s.decisions)
  const experiments = useExperimentsStore((s) => s.experiments)
  const addExperiment = useExperimentsStore((s) => s.addExperiment)
  const [title, setTitle] = useState("")
  const [metric, setMetric] = useState("")
  const [expected, setExpected] = useState("")
  const [unit, setUnit] = useState("%")
  const [rationale, setRationale] = useState("")
  const [linkedDecision, setLinkedDecision] = useState("")
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  const canSubmit = title.trim().length > 3 && metric.trim().length > 0 && expected.trim().length > 0
  const hasDraftContent =
    title.trim().length > 0 ||
    metric.trim().length > 0 ||
    expected.trim().length > 0 ||
    rationale.trim().length > 0 ||
    linkedDecision.length > 0

  const requestClose = () => {
    if (hasDraftContent) {
      setShowDiscardConfirm(true)
      return
    }
    onClose()
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    const nextNumber = experiments.reduce((max, e) => Math.max(max, e.number), 0) + 1
    addExperiment({
      number: nextNumber,
      title: title.trim(),
      status: "active",
      hypothesis: {
        metric: metric.trim(),
        expected: parseFloat(expected) || 0,
        unit: unit.trim() || "%",
        rationale: rationale.trim(),
      },
      result: { actual: null, trend: [], startDate: new Date().toISOString().slice(0, 10) },
      confidenceInterval: 50,
      decisionId: linkedDecision || undefined,
      createdAt: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={requestClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="relative w-full max-w-lg bg-[#0a0f18] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-experiment-title"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            <span id="new-experiment-title" className="text-sm font-semibold text-white">New Experiment</span>
          </div>
          <button onClick={requestClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="experiment-title" className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Title</label>
            <input
              id="experiment-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., React Query Migration"
              className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm font-mono placeholder:text-white/15 focus:outline-none focus:border-primary/35 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="experiment-metric" className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Target Metric</label>
              <input
                id="experiment-metric" type="text" value={metric} onChange={(e) => setMetric(e.target.value)}
                placeholder="e.g., API Call Reduction"
                className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm font-mono placeholder:text-white/15 focus:outline-none focus:border-primary/35 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label htmlFor="experiment-expected" className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Expected</label>
                <input
                  id="experiment-expected" type="number" value={expected} onChange={(e) => setExpected(e.target.value)}
                  placeholder="40"
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm font-mono placeholder:text-white/15 focus:outline-none focus:border-primary/35 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="experiment-unit" className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Unit</label>
                <input
                  id="experiment-unit" type="text" value={unit} onChange={(e) => setUnit(e.target.value)}
                  placeholder="%"
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm font-mono placeholder:text-white/15 focus:outline-none focus:border-primary/35 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="experiment-rationale" className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Rationale</label>
            <textarea
              id="experiment-rationale"
              value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2}
              placeholder="Why do you expect this outcome?"
              className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm font-mono placeholder:text-white/15 focus:outline-none focus:border-primary/35 transition-all resize-none"
            />
          </div>

          {decisions.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="experiment-decision" className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Linked Decision (optional)</label>
              <select
                id="experiment-decision"
                value={linkedDecision} onChange={(e) => setLinkedDecision(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm font-mono focus:outline-none focus:border-primary/35 transition-all appearance-none"
              >
                <option value="" className="bg-[#0a0f18]">None</option>
                {decisions.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#0a0f18]">{d.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
          <button onClick={requestClose} className="px-4 py-2 text-white/40 text-sm hover:text-white/60 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit} disabled={!canSubmit}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all ${
              canSubmit
                ? "bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25"
                : "bg-white/[0.04] border border-white/[0.06] text-white/30 cursor-not-allowed"
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            Create Experiment
          </button>
        </div>

        {showDiscardConfirm && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="discard-experiment-title"
          >
            <div className="w-full max-w-sm rounded-2xl border border-amber-500/20 bg-[#0a0f18] p-5 shadow-2xl">
              <h3 id="discard-experiment-title" className="text-base font-semibold text-white">Discard this experiment?</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Closing now will lose the experiment details entered here.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Keep editing
                </button>
                <button
                  onClick={onClose}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
