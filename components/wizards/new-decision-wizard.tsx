"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, AlertTriangle, Zap, Target, Shield,
  Plus, Trash2, CheckCircle2, ChevronRight, Check,
} from "lucide-react"
import { useDecisionsStore } from "@/stores"
import { getQualityBreakdown } from "@/lib/utils/calculateQualityScore"
import { DECISION_TEMPLATES } from "@/lib/templates"
import { cn } from "@/lib/utils"
import type { RiskLevel, TradeoffAxis } from "@/lib/types"

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardProps {
  isOpen: boolean
  onClose: () => void
  onSubmit?: (data: DecisionData) => void
}

interface DecisionData {
  name: string
  context: string
  valuesAtStake: string
  humanCost: string
  guidingPrinciple: string
  pathA: { title: string; description: string }
  pathB: { title: string; description: string }
  constraints: string[]
  impact: number
  tradeoffs: TradeoffAxis[]
  risks: { text: string; severity: number }[]
  skipRisks: boolean
  acceptRisk: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, code: "01", label: "BRIEF",   sublabel: "Context",             icon: Target        },
  { id: 2, code: "02", label: "OPTIONS", sublabel: "Compare paths",       icon: Zap           },
  { id: 3, code: "03", label: "RISKS",   sublabel: "Pre-mortem",          icon: AlertTriangle },
  { id: 4, code: "04", label: "REVIEW",  sublabel: "Record decision",     icon: Shield        },
] as const

const CONSTRAINTS    = ["Budget", "Time", "Team", "Tech Debt", "Security", "Scale"]
const TRADEOFF_AXES  = ["Speed", "Stability", "Cost", "Scalability", "DevEx"]
const IMPACT_LABELS  = ["", "Minimal", "Low", "Medium", "High", "Critical"] as const

const EMPTY_DATA: DecisionData = {
  name: "",
  context: "",
  valuesAtStake: "",
  humanCost: "",
  guidingPrinciple: "",
  pathA: { title: "", description: "" },
  pathB: { title: "", description: "" },
  constraints: [],
  impact: 3,
  tradeoffs: [],
  risks: [],
  skipRisks: false,
  acceptRisk: false,
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LiveQualityRing({ score }: { score: number }) {
  const r = 28, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  // Indigo→Cyan palette — semantically distinct from red/amber/green risk colors
  const color = score >= 80 ? "#06b6d4" : score >= 50 ? "#818cf8" : "#6366f1"
  const label = score >= 80 ? "CLEAR" : score >= 50 ? "FORMING" : "THIN"
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[64px] h-[64px]">
        <svg className="absolute inset-0 -rotate-90 w-full h-full" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
          <motion.circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circ} animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.45, ease: "easeOut" }} style={{ filter: `drop-shadow(0 0 5px ${color}60)` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span key={score} className="font-mono font-bold text-[15px] leading-none" style={{ color }}
            animate={{ opacity: [0.5, 1] }} transition={{ duration: 0.12 }}>{score}</motion.span>
        </div>
      </div>
      <div className="text-center leading-tight">
        <div className="text-[11px] font-mono text-white/40 tracking-wide">Reflection</div>
        <div className="text-[11px] font-mono tracking-wide" style={{ color }}>{label}</div>
      </div>
    </div>
  )
}

function SeverityBar({ value }: { value: number }) {
  const color = value >= 80 ? "#f43f5e" : value >= 60 ? "#fb923c" : value >= 35 ? "#f59e0b" : "#10b981"
  return (
    <div className="relative h-1 bg-white/5 rounded-full overflow-hidden flex-1">
      <motion.div className="absolute inset-y-0 left-0 rounded-full" animate={{ width: `${value}%` }}
        transition={{ duration: 0.1 }} style={{ background: `linear-gradient(90deg, ${color}40 0%, ${color} 100%)` }} />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NewDecisionWizard({ isOpen, onClose, onSubmit }: WizardProps) {
  const router = useRouter()
  const addDecision = useDecisionsStore((s) => s.addDecision)
  const [step, setStep] = useState(1)
  const [focusedPath, setFocusedPath] = useState<"A" | "B" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [data, setData] = useState<DecisionData>(EMPTY_DATA)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(true)

  // ── Derived ────────────────────────────────────────────────────────────────
  const derivedRiskLevel = (): RiskLevel | null => {
    if (data.risks.length === 0) return null
    const max = Math.max(...data.risks.map((r) => r.severity))
    if (max >= 80) return "critical"
    if (max >= 60) return "high"
    if (max >= 35) return "medium"
    return "low"
  }

  const getAxisValue = (axis: string) =>
    data.tradeoffs.find((t) => t.axis === axis)?.value ?? 50

  const setAxisValue = (axis: string, value: number) => {
    const others = data.tradeoffs.filter((t) => t.axis !== axis)
    setData((p) => ({ ...p, tradeoffs: [...others, { axis, value }] }))
  }

  const reflectionText = [
    data.context,
    data.valuesAtStake,
    data.humanCost,
    data.guidingPrinciple,
  ].filter((text) => text.trim().length > 0).join("\n")

  const qualityBreakdown = getQualityBreakdown({
    options:     [data.pathA, data.pathB].filter((o) => o.title.length > 0),
    preMortem:   data.risks.map((r) => r.text).join("\n"),
    riskLevel:   derivedRiskLevel(),
    title:       data.name,
    rawThinking: reflectionText,
    constraints: data.constraints,
  })
  const quality = qualityBreakdown.score
  const nextQualitySignal = qualityBreakdown.missing[0]
  const hasDraftContent =
    data.name.trim().length > 0 ||
    data.context.trim().length > 0 ||
    data.valuesAtStake.trim().length > 0 ||
    data.humanCost.trim().length > 0 ||
    data.guidingPrinciple.trim().length > 0 ||
    data.pathA.title.trim().length > 0 ||
    data.pathB.title.trim().length > 0 ||
    data.risks.some((r) => r.text.trim().length > 0) ||
    data.constraints.length > 0
  const hasHumanFrame =
    data.valuesAtStake.trim().length > 0 ||
    data.humanCost.trim().length > 0 ||
    data.guidingPrinciple.trim().length > 0

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => { setStep(1); setData(EMPTY_DATA); setShowTemplatePicker(true) }, 400)
      setShowDiscardConfirm(false)
      return () => clearTimeout(t)
    }
    setShowTemplatePicker(true)
  }, [isOpen])

  // ── Mutation helpers ───────────────────────────────────────────────────────
  const addRisk = () =>
    setData((p) => ({ ...p, risks: [...p.risks, { text: "", severity: 50 }], skipRisks: false }))

  const removeRisk = (i: number) =>
    setData((p) => ({ ...p, risks: p.risks.filter((_, idx) => idx !== i) }))

  const updateRisk = (i: number, field: "text" | "severity", value: string | number) =>
    setData((p) => ({ ...p, risks: p.risks.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)) }))

  const toggleConstraint = (c: string) =>
    setData((p) => ({
      ...p,
      constraints: p.constraints.includes(c) ? p.constraints.filter((x) => x !== c) : [...p.constraints, c],
    }))

  // ── Navigation ─────────────────────────────────────────────────────────────
  const canProceed = () => {
    if (step === 1) return data.name.trim().length > 5
    if (step === 2) return data.pathA.title.length > 0 && data.pathB.title.length > 0
    if (step === 3) return data.skipRisks || (data.risks.length > 0 && data.risks.every((r) => r.text.length > 0))
    if (step === 4) return data.acceptRisk || data.skipRisks
    return true
  }

  const requestClose = () => {
    if (hasDraftContent && !isSubmitting) {
      setShowDiscardConfirm(true)
      return
    }
    onClose()
  }

  const discardAndClose = () => {
    setShowDiscardConfirm(false)
    onClose()
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!data.name.trim()) return
    setIsSubmitting(true)
    try {
      const riskLevel = derivedRiskLevel()
      const options   = [data.pathA, data.pathB].filter((o) => o.title.length > 0)
      const preMortem = data.risks.map((r) => `${r.text} (severity: ${r.severity}%)`).join("\n")

      // Fill any untouched tradeoff axes with 50 (neutral)
      const tradeoffs: TradeoffAxis[] = TRADEOFF_AXES.map((axis) => ({
        axis,
        value: data.tradeoffs.find((t) => t.axis === axis)?.value ?? 50,
      }))

      const newDecision = addDecision({
        title:       data.name.trim(),
        status:      "draft",
        impact:      data.impact,
        tags:        data.constraints,
        rawThinking: data.context,
        valuesAtStake: data.valuesAtStake.trim() || undefined,
        humanCost: data.humanCost.trim() || undefined,
        guidingPrinciple: data.guidingPrinciple.trim() || undefined,
        tradeoffs,
        riskLevel,
        badges:      [{ label: "DRAFT", type: "default" }],
        options,
        preMortem:   preMortem || undefined,
        constraints: data.constraints,
        risks:       data.risks,
      })

      onSubmit?.(data)
      onClose()
      toast.success("Decision logged", {
        description: `"${newDecision.title}" saved as draft — open it to add more detail.`,
      })
      // Redirect to the new decision's detail page, not the list
      router.push(`/decisions/${newDecision.id}`)
    } catch {
      toast.error("Failed to save", {
        description: "Storage may be full. Export and clear old decisions.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const proceedLabels = ["Continue", "Review risks", "Review decision"]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog" aria-modal="true" aria-label="New Decision Wizard"
        >
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={requestClose} />

          {/* Modal shell */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[900px]" style={{ maxHeight: "90vh" }}
          >
            <div className="relative flex flex-col rounded-2xl overflow-hidden bg-bg-surface border border-white/10 shadow-2xl" style={{ maxHeight: "90vh" }}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white truncate">New Decision</h2>
                  <p className="text-xs text-white/40 mt-0.5">Step {step} of 4</p>
                </div>
                <button onClick={requestClose} aria-label="Close wizard"
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-1 min-h-0">

                {/* Left nav panel */}
                <div className="hidden sm:flex flex-col w-[180px] flex-shrink-0 border-r border-white/[0.06] p-4 gap-5">
                  <nav className="flex flex-col gap-0.5" aria-label="Wizard steps">
                    {STEPS.map((s) => {
                      const done = step > s.id, active = step === s.id, Icon = s.icon
                      return (
                        <div key={s.id} className={cn(
                          "relative flex items-start gap-2.5 px-2 py-2 rounded-lg transition-colors",
                          active && "bg-white/[0.04]"
                        )}>
                          <div className={cn(
                            "w-[22px] h-[22px] rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5",
                            done && "border-emerald-500/35 bg-emerald-500/10",
                            active && "border-primary/50 bg-primary/10",
                            !done && !active && "border-white/10 bg-white/[0.02]"
                          )}>
                            <Icon className={cn(
                              "w-2.5 h-2.5",
                              done && "text-emerald-400",
                              active && "text-primary",
                              !done && !active && "text-white/40"
                            )} />
                          </div>
                          <div className="min-w-0 pt-0.5">
                            <div className={cn(
                              "text-xs font-medium leading-none",
                              done && "text-emerald-300/65",
                              active && "text-white",
                              !done && !active && "text-white/55"
                            )}>{s.sublabel}</div>
                          </div>
                        </div>
                      )
                    })}
                  </nav>
                  {step === 4 && (
                    <div className="flex flex-col items-center gap-2 pt-2 border-t border-white/[0.05]">
                      <div className="text-xs text-white/45">Reflection depth</div>
                      <LiveQualityRing score={quality} />
                      {nextQualitySignal && (
                        <p className="max-w-[140px] text-center text-[11px] leading-snug text-white/35">
                          Next: {nextQualitySignal.label}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Main content */}
                <div className="flex-1 overflow-y-auto relative">

                  {/* Template picker overlay */}
                  <AnimatePresence>
                    {showTemplatePicker && (
                      <motion.div
                        key="template-picker"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 z-10 bg-bg-surface flex flex-col p-5 sm:p-7 gap-4"
                      >
                        <div>
                          <h2 className="text-xl font-semibold text-white">Start from where you are</h2>
                          <p className="text-white/45 text-sm mt-1">Pick a template or start blank.</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {DECISION_TEMPLATES.map((tpl) => (
                            <button
                              key={tpl.id}
                              onClick={() => {
                                if (tpl.id !== "blank") {
                                  const a = tpl.options[0] ?? { title: "", description: "" }
                                  const b = tpl.options[1] ?? { title: "", description: "" }
                                  setData({
                                    ...EMPTY_DATA,
                                    context: tpl.rawThinking,
                                    constraints: tpl.constraints,
                                    pathA: { title: a.title, description: a.description },
                                    pathB: { title: b.title, description: b.description },
                                  })
                                }
                                setShowTemplatePicker(false)
                              }}
                              className="flex flex-col items-start gap-1 p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05] hover:border-primary/25 transition-colors text-left group"
                            >
                              <span className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                                {tpl.name}
                              </span>
                              <span className="text-xs text-white/45 leading-snug">
                                {tpl.tagline}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Mobile pills */}
                  <div className="sm:hidden flex gap-1.5 px-4 pt-4 pb-1 overflow-x-auto scrollbar-none">
                    {STEPS.map((s) => {
                      const Icon = s.icon, done = step > s.id, active = step === s.id
                      return (
                        <div key={s.id} className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium flex-shrink-0",
                          active && "bg-primary/10 border-primary/25 text-primary",
                          done && !active && "bg-emerald-500/[0.08] border-emerald-500/15 text-emerald-400/60",
                          !active && !done && "bg-white/[0.02] border-white/[0.05] text-white/45"
                        )}>
                          <Icon className="w-3 h-3" />{s.sublabel}
                        </div>
                      )
                    })}
                  </div>

                  <div className="p-5 pb-24 sm:p-7 sm:pb-24">
                    <AnimatePresence mode="wait">

                      {/* ── Step 1: The Brief ───────────────────────────────── */}
                      {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="space-y-6">
                          <div>
                            <h2 className="text-xl font-semibold text-white">Define the decision</h2>
                            <p className="text-white/45 text-sm mt-1">Name what's being decided and what triggered it.</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="decision-name" className="block text-sm font-medium text-white/70">
                              Decision title
                            </label>
                            <input id="decision-name" name="decision-title" type="text" value={data.name}
                              onChange={(e) => setData({ ...data, name: e.target.value })}
                              placeholder="e.g., Rewrite auth, or patch it again?"
                              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-base placeholder:text-white/25 focus:outline-none focus:border-primary/40 focus:bg-white/[0.055] transition-colors" />
                            {data.name.length > 0 && data.name.length <= 5 && (
                              <p className="text-xs text-amber-400/70">A few more characters — make the decision name specific.</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="decision-context" className="block text-sm font-medium text-white/70">
                              Context &amp; notes
                            </label>
                            <textarea id="decision-context" name="decision-context" value={data.context} rows={6}
                              onChange={(e) => setData({ ...data, context: e.target.value })}
                              placeholder="Describe the situation, constraints, and what triggered this. Plain language."
                              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-primary/40 resize-none leading-relaxed transition-colors" />
                          </div>
                          <div className="space-y-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                            <div>
                              <h3 className="text-sm font-semibold text-white">Human frame</h3>
                              <p className="mt-1 text-xs text-white/45 leading-relaxed">
                                The part spreadsheets hide: values, people affected, and the rule you don't want to betray.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <label htmlFor="values-at-stake" className="block text-xs font-medium text-white/55">
                                  Values at stake
                                </label>
                                <textarea
                                  id="values-at-stake"
                                  value={data.valuesAtStake}
                                  rows={3}
                                  onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center" })}
                                  onChange={(e) => setData({ ...data, valuesAtStake: e.target.value })}
                                  placeholder="What value could be compromised?"
                                  className="w-full px-3 py-2 bg-white/[0.035] border border-white/[0.07] rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-primary/30 resize-none leading-relaxed"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label htmlFor="human-cost" className="block text-xs font-medium text-white/55">
                                  Human cost
                                </label>
                                <textarea
                                  id="human-cost"
                                  value={data.humanCost}
                                  rows={3}
                                  onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center" })}
                                  onChange={(e) => setData({ ...data, humanCost: e.target.value })}
                                  placeholder="Who pays if this is wrong?"
                                  className="w-full px-3 py-2 bg-white/[0.035] border border-white/[0.07] rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-primary/30 resize-none leading-relaxed"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label htmlFor="guiding-principle" className="block text-xs font-medium text-white/55">
                                  Guiding principle
                                </label>
                                <textarea
                                  id="guiding-principle"
                                  value={data.guidingPrinciple}
                                  rows={3}
                                  onFocus={(e) => e.currentTarget.scrollIntoView({ block: "center" })}
                                  onChange={(e) => setData({ ...data, guidingPrinciple: e.target.value })}
                                  placeholder="What rule should still hold?"
                                  className="w-full px-3 py-2 bg-white/[0.035] border border-white/[0.07] rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-primary/30 resize-none leading-relaxed"
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* ── Step 2: Options ─────────────────────────────────── */}
                      {step === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="space-y-5">
                          <div>
                            <h2 className="text-xl font-semibold text-white">Compare viable paths</h2>
                            <p className="text-white/45 text-sm mt-1">Make the trade-off explicit. Even "do nothing" counts when it's honest.</p>
                          </div>

                          {/* Option cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Option A */}
                            <div className={cn(
                              "rounded-xl p-4 border bg-white/[0.025] transition-colors",
                              focusedPath === "A" && "border-primary/30 bg-primary/[0.04]",
                              focusedPath !== "A" && "border-white/[0.07]"
                            )}>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-semibold text-primary">Option A</span>
                              </div>
                              <input type="text" value={data.pathA.title} onFocus={() => setFocusedPath("A")} onBlur={() => setFocusedPath(null)}
                                onChange={(e) => setData({ ...data, pathA: { ...data.pathA, title: e.target.value } })}
                                placeholder="Option name" aria-label="Option A title"
                                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-primary/40 transition-colors mb-2.5" />
                              <textarea value={data.pathA.description} rows={3} onFocus={() => setFocusedPath("A")} onBlur={() => setFocusedPath(null)}
                                onChange={(e) => setData({ ...data, pathA: { ...data.pathA, description: e.target.value } })}
                                placeholder="Describe this approach..." aria-label="Option A description"
                                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-primary/40 transition-colors resize-none" />
                            </div>
                            {/* Option B */}
                            <div className={cn(
                              "rounded-xl p-4 border bg-white/[0.025] transition-colors",
                              focusedPath === "B" && "border-purple-500/30 bg-purple-500/[0.04]",
                              focusedPath !== "B" && "border-white/[0.07]"
                            )}>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-semibold text-purple-400">Option B</span>
                              </div>
                              <input type="text" value={data.pathB.title} onFocus={() => setFocusedPath("B")} onBlur={() => setFocusedPath(null)}
                                onChange={(e) => setData({ ...data, pathB: { ...data.pathB, title: e.target.value } })}
                                placeholder="Option name" aria-label="Option B title"
                                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-purple-500/40 transition-colors mb-2.5" />
                              <textarea value={data.pathB.description} rows={3} onFocus={() => setFocusedPath("B")} onBlur={() => setFocusedPath(null)}
                                onChange={(e) => setData({ ...data, pathB: { ...data.pathB, description: e.target.value } })}
                                placeholder="Describe this approach..." aria-label="Option B description"
                                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-purple-500/40 transition-colors resize-none" />
                            </div>
                          </div>

                          {/* Constraints */}
                          <div className="space-y-2.5">
                            <h3 className="text-sm font-medium text-white/70">Active constraints</h3>
                            <div className="flex flex-wrap gap-2">
                              {CONSTRAINTS.map((c) => (
                                <button key={c} onClick={() => toggleConstraint(c)} aria-pressed={data.constraints.includes(c)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs transition-colors border min-h-[34px]",
                                    data.constraints.includes(c)
                                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                      : "bg-white/[0.025] border-white/[0.07] text-white/50 hover:bg-white/[0.05] hover:text-white/70"
                                  )}>
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Impact selector */}
                          <div className="space-y-2.5">
                            <h3 className="text-sm font-medium text-white/70">Expected impact</h3>
                            <div className="flex gap-2">
                              {([1, 2, 3, 4, 5] as const).map((val) => (
                                <button key={val} onClick={() => setData({ ...data, impact: val })}
                                  aria-pressed={data.impact === val}
                                  className={cn(
                                    "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                                    data.impact === val
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                      : "bg-white/[0.025] border-white/[0.07] text-white/50 hover:bg-white/[0.05] hover:text-white/70"
                                  )}>
                                  {val}
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-white/50">{IMPACT_LABELS[data.impact]}</p>
                          </div>

                          {/* Tradeoffs */}
                          <div className="space-y-2.5">
                            <h3 className="text-sm font-medium text-white/70">Key trade-offs</h3>
                            <div className="space-y-2">
                              {TRADEOFF_AXES.map((axis) => {
                                const val = getAxisValue(axis)
                                const color = val >= 70 ? "#10b981" : val >= 40 ? "#f59e0b" : "#f43f5e"
                                return (
                                  <div key={axis} className="flex items-center gap-3">
                                    <span className="text-xs text-white/55 w-20 flex-shrink-0">{axis}</span>
                                    <div className="flex-1 relative h-1 bg-white/5 rounded-full">
                                      <div className="absolute inset-y-0 left-0 rounded-full"
                                        style={{ width: `${val}%`, backgroundColor: color }} />
                                    </div>
                                    <input type="range" min="0" max="100" value={val}
                                      onChange={(e) => setAxisValue(axis, parseInt(e.target.value))}
                                      aria-label={`${axis} tradeoff value`}
                                      className="w-16 h-1 bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/40 [&::-webkit-slider-thumb]:cursor-pointer" />
                                    <span className="text-xs w-6 text-right flex-shrink-0 tabular-nums" style={{ color }}>{val}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* ── Step 3: Risk Review ─────────────────────────────── */}
                      {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="space-y-5">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="w-4 h-4 text-rose-400" />
                            </div>
                            <div>
                              <h2 className="text-xl font-semibold text-white">Pre-mortem</h2>
                              <p className="text-white/45 text-sm mt-0.5">Imagine it failed. What killed it?</p>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <AnimatePresence initial={false}>
                              {data.risks.map((risk, i) => {
                                const borderColor = risk.severity >= 80 ? "border-rose-500/35" : risk.severity >= 60 ? "border-rose-500/20" : risk.severity >= 35 ? "border-amber-500/20" : "border-white/[0.07]"
                                return (
                                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                                    <div className={cn("rounded-xl p-4 border bg-white/[0.025]", borderColor)}>
                                      <div className="flex items-start gap-3">
                                        <div className="flex-1 space-y-3">
                                          <input type="text" value={risk.text} onChange={(e) => updateRisk(i, "text", e.target.value)}
                                            placeholder="Describe the failure mode..." aria-label={`Risk ${i + 1} description`}
                                            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-rose-500/40 transition-colors" />
                                          <div className="flex items-center gap-3">
                                            <span className="text-xs text-white/55 flex-shrink-0">Severity</span>
                                            <SeverityBar value={risk.severity} />
                                            <input type="range" min="5" max="100" value={risk.severity} onChange={(e) => updateRisk(i, "severity", parseInt(e.target.value))} aria-label={`Risk ${i + 1} severity: ${risk.severity}%`}
                                              className="w-[72px] h-1 bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-400 [&::-webkit-slider-thumb]:cursor-pointer" />
                                            <span className="text-xs w-[34px] text-right flex-shrink-0 tabular-nums"
                                              style={{ color: risk.severity >= 80 ? "#f43f5e" : risk.severity >= 60 ? "#fb923c" : risk.severity >= 35 ? "#f59e0b" : "#10b981" }}>{risk.severity}%</span>
                                          </div>
                                        </div>
                                        <button onClick={() => removeRisk(i)} aria-label={`Remove risk ${i + 1}`}
                                          className="p-1.5 hover:bg-white/[0.07] rounded-lg transition-colors flex-shrink-0">
                                          <Trash2 className="w-3.5 h-3.5 text-white/45" />
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                )
                              })}
                            </AnimatePresence>

                            {!data.skipRisks && (
                              <button onClick={addRisk}
                                className="w-full py-3 border border-dashed border-white/[0.09] rounded-xl text-white/50 text-sm hover:bg-white/[0.02] hover:border-white/[0.18] hover:text-white/70 transition-colors flex items-center justify-center gap-2 min-h-[44px]">
                                <Plus className="w-3.5 h-3.5" />Add risk
                              </button>
                            )}

                            {/* Skip option — only show when no risks added */}
                            {data.risks.length === 0 && (
                              <button
                                onClick={() => setData((p) => ({ ...p, skipRisks: !p.skipRisks, acceptRisk: !p.skipRisks }))}
                                aria-pressed={data.skipRisks}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                                  data.skipRisks
                                    ? "bg-white/[0.04] border-white/[0.12] text-white/55"
                                    : "bg-white/[0.015] border-white/[0.06] text-white/45 hover:border-white/[0.1] hover:text-white/55"
                                }`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                  data.skipRisks ? "bg-white/15 border-white/25" : "bg-white/[0.04] border-white/[0.12]"
                                }`}>
                                  {data.skipRisks && <Check className="w-2.5 h-2.5 text-white/70" />}
                                </div>
                                <span className="text-sm">No risks to document at this time</span>
                              </button>
                            )}
                          </div>

                          {/* Accept toggle — only when risks added */}
                          <AnimatePresence>
                            {data.risks.length > 0 && (
                              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                className="flex items-center justify-between p-4 bg-white/[0.025] border border-white/[0.07] rounded-xl">
                                <div>
                                  <div className="text-sm text-white/75 font-medium">Accept these risks?</div>
                                  <div className="text-xs text-white/45 mt-0.5">Required before you can record the decision.</div>
                                </div>
                                <button onClick={() => setData((p) => ({ ...p, acceptRisk: !p.acceptRisk }))}
                                  aria-label="Toggle risk acceptance" aria-pressed={data.acceptRisk}
                                  className={cn(
                                    "relative w-12 h-6 rounded-full transition-colors border focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                                    data.acceptRisk ? "bg-emerald-500/20 border-emerald-500/40" : "bg-white/5 border-white/15"
                                  )}>
                                  <div className={cn(
                                    "absolute top-0.5 w-5 h-5 rounded-full transition-transform",
                                    data.acceptRisk ? "translate-x-6 bg-emerald-400" : "translate-x-0.5 bg-white/40"
                                  )} />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}

                      {/* ── Step 4: Review ───────────────────────────────────── */}
                      {step === 4 && (
                        <motion.div key="s4" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="space-y-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2 className="text-xl font-semibold text-white">Review your decision</h2>
                              <p className="text-white/45 text-sm mt-0.5">Check the record before saving.</p>
                            </div>
                            <div className="sm:hidden flex-shrink-0"><LiveQualityRing score={quality} /></div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3.5 bg-white/[0.025] border border-white/[0.07] rounded-xl">
                              <div className="text-xs text-white/45 mb-1.5">Title</div>
                              <div className="text-sm font-medium text-white truncate">{data.name || "—"}</div>
                            </div>
                            <div className="p-3.5 bg-white/[0.025] border border-white/[0.07] rounded-xl">
                              <div className="text-xs text-white/45 mb-1.5">Impact</div>
                              <div className="text-sm font-medium text-emerald-300">
                                {data.impact}/5 — {IMPACT_LABELS[data.impact]}
                              </div>
                            </div>
                            <div className="p-3.5 bg-primary/[0.04] border border-primary/15 rounded-xl">
                              <div className="text-xs text-primary/55 mb-1.5">Option A</div>
                              <div className="text-sm font-medium text-primary truncate">{data.pathA.title || "—"}</div>
                            </div>
                            <div className="p-3.5 bg-purple-500/[0.04] border border-purple-500/15 rounded-xl">
                              <div className="text-xs text-purple-400/55 mb-1.5">Option B</div>
                              <div className="text-sm font-medium text-purple-400 truncate">{data.pathB.title || "—"}</div>
                            </div>
                          </div>

                          {hasHumanFrame && (
                            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                              <div className="text-sm font-medium text-white/70 mb-3">Human frame</div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {data.valuesAtStake.trim() && (
                                  <div>
                                    <div className="text-xs text-white/40">Values</div>
                                    <p className="mt-1 text-sm leading-relaxed text-white/65">{data.valuesAtStake}</p>
                                  </div>
                                )}
                                {data.humanCost.trim() && (
                                  <div>
                                    <div className="text-xs text-white/40">Human cost</div>
                                    <p className="mt-1 text-sm leading-relaxed text-white/65">{data.humanCost}</p>
                                  </div>
                                )}
                                {data.guidingPrinciple.trim() && (
                                  <div>
                                    <div className="text-xs text-white/40">Principle</div>
                                    <p className="mt-1 text-sm leading-relaxed text-white/65">{data.guidingPrinciple}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between p-3.5 bg-rose-500/[0.03] border border-rose-500/[0.12] rounded-xl">
                            <div>
                              <div className="text-xs text-rose-300/65 mb-1">Risks identified</div>
                              <div className="text-sm text-rose-300">
                                {data.skipRisks ? "No risks documented" : `${data.risks.length} risk${data.risks.length !== 1 ? "s" : ""} acknowledged`}
                              </div>
                            </div>
                            {derivedRiskLevel() && (
                              <div className={cn(
                                "px-2.5 py-1 rounded-lg text-xs border",
                                derivedRiskLevel() === "critical" && "bg-rose-500/12 border-rose-500/30 text-rose-300",
                                derivedRiskLevel() === "high" && "bg-orange-500/12 border-orange-500/30 text-orange-300",
                                derivedRiskLevel() === "medium" && "bg-amber-500/12 border-amber-500/30 text-amber-300",
                                derivedRiskLevel() === "low" && "bg-emerald-500/12 border-emerald-500/30 text-emerald-300"
                              )}>{derivedRiskLevel()}</div>
                            )}
                          </div>

                          {!data.skipRisks && data.risks.length > 0 && (
                            <button
                              onClick={() => setData((p) => ({ ...p, acceptRisk: !p.acceptRisk }))}
                              aria-pressed={data.acceptRisk}
                              className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                                data.acceptRisk
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                  : "border-amber-500/25 bg-amber-500/[0.06] text-amber-200/80 hover:bg-amber-500/10"
                              }`}
                            >
                              <span className="text-sm">
                                {data.acceptRisk ? "Risks accepted" : "Accept documented risks to record this decision"}
                              </span>
                              {data.acceptRisk && <Check className="h-4 w-4" />}
                            </button>
                          )}

                          {!data.acceptRisk && !data.skipRisks && (
                            <p className="text-xs leading-relaxed text-amber-200/65">
                              The decision can only be recorded after you explicitly accept the documented risks.
                            </p>
                          )}

                          <button onClick={handleSubmit} disabled={(!data.acceptRisk && !data.skipRisks) || isSubmitting}
                            aria-label="Record decision"
                            className={cn(
                              "w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border",
                              (data.acceptRisk || data.skipRisks) && !isSubmitting
                                ? "bg-primary text-bg-body hover:opacity-90 border-primary cursor-pointer"
                                : "bg-white/[0.04] text-white/45 cursor-not-allowed border-white/[0.07]"
                            )}>
                            {isSubmitting ? (
                              <>
                                <motion.div className="w-4 h-4 border-2 border-current/35 border-t-current rounded-full"
                                  animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} />
                                Saving…
                              </>
                            ) : (
                              <><CheckCircle2 className="w-4 h-4" />Record decision</>
                            )}
                          </button>
                        </motion.div>
                      )}

                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 border-t border-white/[0.05] bg-white/[0.008] flex-shrink-0">
                {step > 1 ? (
                  <button onClick={() => setStep((s) => s - 1)}
                    className="px-3 py-2 text-sm text-white/55 hover:text-white/80 transition-colors min-h-[40px]">
                    ← Back
                  </button>
                ) : <div />}
                <div className="flex items-center gap-3">
                  {step === 4 && <div className="sm:hidden text-xs text-white/45">{quality}% reflected</div>}
                  {step < 4 && (
                    <button onClick={() => canProceed() && setStep((s) => s + 1)} disabled={!canProceed()}
                      className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[40px] border",
                        canProceed()
                          ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/15"
                          : "bg-white/[0.025] border-white/[0.06] text-white/45 cursor-not-allowed"
                      )}>
                      {proceedLabels[step - 1]}<ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {showDiscardConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="discard-decision-title"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: 10 }}
                      className="w-full max-w-sm rounded-2xl border border-amber-500/20 bg-[#0a0f14] p-5 shadow-2xl"
                    >
                      <h2 id="discard-decision-title" className="text-base font-semibold text-white">Discard this draft?</h2>
                      <p className="mt-2 text-sm leading-relaxed text-white/55">
                        Closing now will lose the information entered in this wizard.
                      </p>
                      <div className="mt-5 flex justify-end gap-2">
                        <button
                          onClick={() => setShowDiscardConfirm(false)}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          Keep editing
                        </button>
                        <button
                          onClick={discardAndClose}
                          className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
                        >
                          Discard
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
