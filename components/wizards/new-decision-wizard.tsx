"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, AlertTriangle, Zap, Target, Shield,
  Plus, Trash2, CheckCircle2, ChevronRight, Activity, Check,
} from "lucide-react"
import { useDecisionsStore } from "@/stores"
import { getQualityBreakdown } from "@/lib/utils/calculateQualityScore"
import { DECISION_TEMPLATES } from "@/lib/templates"
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
  name: "", context: "",
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

function CornerBracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const cls = { tl: "top-0 left-0 border-t border-l", tr: "top-0 right-0 border-t border-r",
                bl: "bottom-0 left-0 border-b border-l", br: "bottom-0 right-0 border-b border-r" }
  return <div aria-hidden="true" className={`absolute w-4 h-4 border-cyan-500/40 pointer-events-none ${cls[pos]}`} />
}

function LiveQualityRing({ score }: { score: number }) {
  const r = 28, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  // Indigo→Cyan palette — semantically distinct from red/amber/green risk colors
  const color = score >= 80 ? "#06b6d4" : score >= 50 ? "#818cf8" : "#6366f1"
  const label = score >= 80 ? "STRONG" : score >= 50 ? "FAIR" : "BUILDING"
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
        <div className="text-[11px] font-mono text-white/40 tracking-wide">Filled</div>
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

  const qualityBreakdown = getQualityBreakdown({
    options:     [data.pathA, data.pathB].filter((o) => o.title.length > 0),
    preMortem:   data.risks.map((r) => r.text).join("\n"),
    riskLevel:   derivedRiskLevel(),
    title:       data.name,
    rawThinking: data.context,
    constraints: data.constraints,
  })
  const quality = qualityBreakdown.score
  const nextQualitySignal = qualityBreakdown.missing[0]
  const hasDraftContent =
    data.name.trim().length > 0 ||
    data.context.trim().length > 0 ||
    data.pathA.title.trim().length > 0 ||
    data.pathB.title.trim().length > 0 ||
    data.risks.some((r) => r.text.trim().length > 0) ||
    data.constraints.length > 0

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
          <motion.div className="absolute inset-0 bg-[#020408]/95 backdrop-blur-xl" onClick={requestClose} />

          <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "linear-gradient(rgba(var(--primary-rgb),0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--primary-rgb),0.035) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }} />

          <motion.div aria-hidden="true" className="absolute inset-0 pointer-events-none"
            animate={{ background: step === 3
              ? "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(244,63,94,0.07), transparent)"
              : step === 4
              ? "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(16,185,129,0.06), transparent)"
              : "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(var(--primary-rgb),0.07), transparent)"
            }} transition={{ duration: 0.7 }} />

          <motion.div aria-hidden="true" className="absolute left-0 right-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(var(--primary-rgb),0.1), transparent)" }}
            initial={{ top: "0%" }} animate={{ top: "100%" }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }} />

          {/* Modal shell */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 18 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[900px]" style={{ maxHeight: "90vh" }}
          >
            <motion.div aria-hidden="true" className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{ boxShadow: step === 3
                ? "0 0 0 1px rgba(244,63,94,0.28), 0 0 50px rgba(244,63,94,0.07)"
                : "0 0 0 1px rgba(255,255,255,0.07), 0 0 50px rgba(0,0,0,0.5)"
              }} transition={{ duration: 0.55 }} />

            <div className="relative flex flex-col rounded-2xl overflow-hidden bg-bg-surface" style={{ maxHeight: "90vh" }}>
              <CornerBracket pos="tl" /><CornerBracket pos="tr" />
              <CornerBracket pos="bl" /><CornerBracket pos="br" />

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-cyan-500/15 flex items-center justify-center">
                    <Activity className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-[11px] font-mono text-white/40 uppercase tracking-[0.2em]">DECISIONOS</span>
                  <span className="text-white/40 text-[11px] font-mono">/</span>
                  <span className="text-[11px] font-mono text-primary/60 uppercase tracking-[0.15em]">New Decision</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:block text-[11px] font-mono text-white/40 uppercase tracking-[0.2em]">Step {step}/4</span>
                  <button onClick={requestClose} aria-label="Close wizard"
                    className="p-1.5 rounded-lg hover:bg-white/[0.07] border border-transparent hover:border-white/[0.08] transition-all group">
                    <X className="w-4 h-4 text-white/25 group-hover:text-white/55 transition-colors" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 min-h-0">

                {/* Left nav panel */}
                <div className="hidden sm:flex flex-col w-[178px] flex-shrink-0 border-r border-white/[0.06] p-4 gap-5">
                  <div className="text-[11px] font-mono text-white/40 tracking-wide">Steps</div>
                  <nav className="flex flex-col gap-0.5 relative">
                    <div className="absolute left-[10px] top-5 bottom-5 w-px bg-white/[0.05]" />
                    <motion.div className="absolute left-[10px] top-5 w-px origin-top"
                      style={{ background: "linear-gradient(to bottom, rgba(16,185,129,0.5), rgba(var(--primary-rgb),0.35))" }}
                      animate={{ height: `${Math.max(0, ((step - 1) / 3)) * 100}%` }}
                      transition={{ duration: 0.45, ease: "easeInOut" }} />
                    {STEPS.map((s) => {
                      const done = step > s.id, active = step === s.id, Icon = s.icon
                      return (
                        <div key={s.id} className={`relative flex items-start gap-2.5 px-2 py-2 rounded-lg transition-colors duration-200 ${active ? "bg-white/[0.035]" : ""}`}>
                          <motion.div className={`relative w-[21px] h-[21px] rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            done ? "border-emerald-500/40 bg-emerald-500/10" : active ? "border-primary/50 bg-primary/10" : "border-white/[0.08] bg-white/[0.02]"
                          }`} animate={active ? { boxShadow: ["0 0 0 0 var(--bg-body)","0 0 0 5px rgba(var(--primary-rgb),0.1)","0 0 0 0 var(--bg-body)"] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}>
                            <Icon className={`w-2.5 h-2.5 ${done ? "text-emerald-400" : active ? "text-primary" : "text-white/40"}`} />
                          </motion.div>
                          <div className="min-w-0 pt-0.5">
                            <div className={`text-[10px] font-mono uppercase tracking-wider leading-none ${done ? "text-emerald-400/50" : active ? "text-primary" : "text-white/45"}`}>{s.label}</div>
                            <div className="text-[11px] text-white/45 mt-0.5 leading-none truncate">{s.sublabel}</div>
                          </div>
                        </div>
                      )
                    })}
                  </nav>
                  <div className="h-px bg-white/[0.05]" />
                  {step === 4 && (
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-[11px] font-mono text-white/50 tracking-wide">Completeness</div>
                      <LiveQualityRing score={quality} />
                      {nextQualitySignal && (
                        <p className="max-w-[130px] text-center text-[11px] leading-snug text-white/35">
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
                        transition={{ duration: 0.18 }}
                        className="absolute inset-0 z-10 bg-bg-surface flex flex-col p-5 sm:p-7 gap-4"
                      >
                        <div>
                          <div className="text-[11px] font-mono text-primary/50 uppercase tracking-[0.3em] mb-1">Start with</div>
                          <h2 className="text-xl font-semibold text-white">Choose a template</h2>
                          <p className="text-white/35 text-sm mt-1">Pre-fills the form so you can focus on the details.</p>
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
                              className="flex flex-col items-start gap-1 p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05] hover:border-primary/25 transition-all text-left group"
                            >
                              <span className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                                {tpl.name}
                              </span>
                              <span className="text-[11px] text-white/40 leading-snug">
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
                        <div key={s.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono uppercase tracking-wider flex-shrink-0 transition-all ${
                          active ? "bg-primary/10 border-cyan-500/25 text-primary"
                         : done  ? "bg-emerald-500/8 border-emerald-500/15 text-emerald-400/50"
                         :         "bg-white/[0.02] border-white/[0.05] text-white/45"
                        }`}>
                          <Icon className="w-3 h-3" />{s.label}
                        </div>
                      )
                    })}
                  </div>

                  <div className="p-5 sm:p-7">
                    <AnimatePresence mode="wait">

                      {/* ── Step 1: The Brief ───────────────────────────────── */}
                      {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2, ease: "easeOut" }} className="space-y-6">
                          <div>
                            <div className="text-[11px] font-mono text-primary/50 uppercase tracking-[0.3em] mb-1">Step 01 - Context</div>
                            <h2 className="text-xl font-semibold text-white tracking-tight">Define the decision</h2>
                            <p className="text-white/35 text-sm mt-1">Capture what is being decided and why it matters.</p>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="decision-name" className="flex items-center gap-2 text-[11px] font-mono text-white/45 uppercase tracking-wide">
                              <span className="text-primary/45">&gt;_</span>Decision title
                            </label>
                            <input id="decision-name" name="decision-title" type="text" value={data.name}
                              onChange={(e) => setData({ ...data, name: e.target.value })}
                              placeholder="e.g., Database Migration Strategy"
                              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-lg font-mono placeholder:text-white/12 focus:outline-none focus:border-primary/35 focus:bg-white/[0.055] transition-all" />
                            {data.name.length > 0 && data.name.length <= 5 && (
                              <p className="text-[11px] text-amber-400/55 font-mono tracking-wide">· MINIMUM 6 CHARACTERS TO PROCEED</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="decision-context" className="flex items-center gap-2 text-[11px] font-mono text-white/45 uppercase tracking-wide">
                              <span className="text-primary/45">&gt;_</span>Context & notes
                            </label>
                            <div className="relative rounded-xl overflow-hidden border border-white/[0.08] focus-within:border-cyan-500/30 transition-colors">
                              <div aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-9 bg-black/25 border-r border-white/[0.05] flex flex-col items-center py-3 select-none pointer-events-none">
                                {Array.from({ length: 10 }, (_, i) => (
                                  <div key={i} className="h-[22px] flex items-center text-[11px] font-mono text-white/40">{String(i + 1).padStart(2, "0")}</div>
                                ))}
                              </div>
                              <textarea id="decision-context" name="decision-context" value={data.context} rows={8}
                                onChange={(e) => setData({ ...data, context: e.target.value })}
                                placeholder="Describe the current situation, constraints, and what triggered this decision..."
                                className="w-full pl-12 pr-4 py-3 bg-white/[0.025] text-white text-sm font-mono placeholder:text-white/12 focus:outline-none resize-none leading-[22px]" />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* ── Step 2: Options ─────────────────────────────────── */}
                      {step === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2, ease: "easeOut" }} className="space-y-5">
                          <div>
                            <div className="text-[11px] font-mono text-primary/50 uppercase tracking-[0.3em] mb-1">Step 02 - Options</div>
                            <h2 className="text-xl font-semibold text-white tracking-tight">Compare viable paths</h2>
                            <p className="text-white/35 text-sm mt-1">Make the trade-off explicit before you commit.</p>
                          </div>

                          {/* Option cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                            <div aria-hidden="true" className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                              <div className="w-7 h-7 rounded-full bg-bg-surface border border-white/[0.08] flex items-center justify-center">
                                <span className="text-[11px] font-mono text-white/45 tracking-widest">VS</span>
                              </div>
                            </div>
                            {/* Option A */}
                            <motion.div className="rounded-xl p-4" style={{ border: "1px solid" }}
                              animate={{ borderColor: focusedPath === "A" ? "rgba(var(--primary-rgb),0.35)" : focusedPath === "B" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)", backgroundColor: focusedPath === "A" ? "rgba(var(--primary-rgb),0.045)" : focusedPath === "B" ? "rgba(255,255,255,0.008)" : "rgba(255,255,255,0.025)", opacity: focusedPath === "B" ? 0.45 : 1, scale: focusedPath === "A" ? 1.012 : 1 }} transition={{ duration: 0.15 }}>
                              <div className="flex items-center gap-2 mb-3.5">
                                <div className="w-6 h-6 rounded-lg bg-primary/12 border border-cyan-500/18 flex items-center justify-center flex-shrink-0">
                                  <span className="text-primary font-mono font-bold text-[11px]">A</span>
                                </div>
                                <span className="text-[11px] font-mono text-primary/45 uppercase tracking-[0.2em]">Option A</span>
                              </div>
                              <input type="text" value={data.pathA.title} onFocus={() => setFocusedPath("A")} onBlur={() => setFocusedPath(null)}
                                onChange={(e) => setData({ ...data, pathA: { ...data.pathA, title: e.target.value } })}
                                placeholder="Option name" aria-label="Option A title"
                                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-white text-sm font-mono placeholder:text-white/12 focus:outline-none focus:border-primary/28 transition-all mb-2.5" />
                              <textarea value={data.pathA.description} rows={3} onFocus={() => setFocusedPath("A")} onBlur={() => setFocusedPath(null)}
                                onChange={(e) => setData({ ...data, pathA: { ...data.pathA, description: e.target.value } })}
                                placeholder="Describe this approach..." aria-label="Option A description"
                                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-white text-sm font-mono placeholder:text-white/12 focus:outline-none focus:border-primary/28 transition-all resize-none" />
                            </motion.div>
                            {/* Option B */}
                            <motion.div className="rounded-xl p-4" style={{ border: "1px solid" }}
                              animate={{ borderColor: focusedPath === "B" ? "rgba(139,92,246,0.35)" : focusedPath === "A" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)", backgroundColor: focusedPath === "B" ? "rgba(139,92,246,0.045)" : focusedPath === "A" ? "rgba(255,255,255,0.008)" : "rgba(255,255,255,0.025)", opacity: focusedPath === "A" ? 0.45 : 1, scale: focusedPath === "B" ? 1.012 : 1 }} transition={{ duration: 0.15 }}>
                              <div className="flex items-center gap-2 mb-3.5">
                                <div className="w-6 h-6 rounded-lg bg-purple-500/12 border border-purple-500/18 flex items-center justify-center flex-shrink-0">
                                  <span className="text-purple-400 font-mono font-bold text-[11px]">B</span>
                                </div>
                                <span className="text-[11px] font-mono text-purple-400/45 uppercase tracking-[0.2em]">Option B</span>
                              </div>
                              <input type="text" value={data.pathB.title} onFocus={() => setFocusedPath("B")} onBlur={() => setFocusedPath(null)}
                                onChange={(e) => setData({ ...data, pathB: { ...data.pathB, title: e.target.value } })}
                                placeholder="Option name" aria-label="Option B title"
                                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-white text-sm font-mono placeholder:text-white/12 focus:outline-none focus:border-purple-500/28 transition-all mb-2.5" />
                              <textarea value={data.pathB.description} rows={3} onFocus={() => setFocusedPath("B")} onBlur={() => setFocusedPath(null)}
                                onChange={(e) => setData({ ...data, pathB: { ...data.pathB, description: e.target.value } })}
                                placeholder="Describe this approach..." aria-label="Option B description"
                                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-white text-sm font-mono placeholder:text-white/12 focus:outline-none focus:border-purple-500/28 transition-all resize-none" />
                            </motion.div>
                          </div>

                          {/* Constraints */}
                          <div className="space-y-2.5">
                            <div className="text-[11px] font-mono text-white/45 uppercase tracking-wide flex items-center gap-2">
                              <span className="text-amber-500/38">&gt;_</span>ACTIVE CONSTRAINTS
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {CONSTRAINTS.map((c) => (
                                <button key={c} onClick={() => toggleConstraint(c)} aria-pressed={data.constraints.includes(c)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wide transition-all border min-h-[36px] ${
                                    data.constraints.includes(c) ? "bg-amber-500/10 border-amber-500/28 text-amber-400" : "bg-white/[0.025] border-white/[0.07] text-white/45 hover:bg-white/[0.05] hover:text-white/50"
                                  }`}>
                                  [{c.toUpperCase()}]
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Impact selector */}
                          <div className="space-y-2.5">
                            <div className="text-[11px] font-mono text-white/45 uppercase tracking-wide flex items-center gap-2">
                              <span className="text-emerald-500/38">&gt;_</span>EXPECTED IMPACT
                            </div>
                            <div className="flex gap-2">
                              {([1, 2, 3, 4, 5] as const).map((val) => (
                                <button key={val} onClick={() => setData({ ...data, impact: val })}
                                  aria-pressed={data.impact === val}
                                  className={`flex-1 py-2 rounded-lg border text-[11px] font-mono font-bold transition-all ${
                                    data.impact === val ? "bg-emerald-500/10 border-emerald-500/28 text-emerald-400" : "bg-white/[0.025] border-white/[0.07] text-white/45 hover:bg-white/[0.05] hover:text-white/50"
                                  }`}>
                                  {val}
                                </button>
                              ))}
                            </div>
                            <p className="text-[11px] font-mono text-white/45 uppercase tracking-wider">
                              {IMPACT_LABELS[data.impact]}
                            </p>
                          </div>

                          {/* Tradeoffs */}
                          <div className="space-y-2.5">
                            <div className="text-[11px] font-mono text-white/45 uppercase tracking-wide flex items-center gap-2">
                              <span className="text-purple-500/38">&gt;_</span>KEY TRADEOFFS
                            </div>
                            <div className="space-y-2">
                              {TRADEOFF_AXES.map((axis) => {
                                const val = getAxisValue(axis)
                                const color = val >= 70 ? "#10b981" : val >= 40 ? "#f59e0b" : "#f43f5e"
                                return (
                                  <div key={axis} className="flex items-center gap-3">
                                    <span className="text-[10px] font-mono text-white/35 w-20 flex-shrink-0">{axis}</span>
                                    <div className="flex-1 relative h-1 bg-white/5 rounded-full">
                                      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-75"
                                        style={{ width: `${val}%`, background: `linear-gradient(90deg, ${color}40, ${color})` }} />
                                    </div>
                                    <input type="range" min="0" max="100" value={val}
                                      onChange={(e) => setAxisValue(axis, parseInt(e.target.value))}
                                      aria-label={`${axis} tradeoff value`}
                                      className="w-16 h-1 bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/40 [&::-webkit-slider-thumb]:cursor-pointer" />
                                    <span className="text-[11px] font-mono w-6 text-right flex-shrink-0" style={{ color }}>{val}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* ── Step 3: Risk Review ─────────────────────────────── */}
                      {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2, ease: "easeOut" }} className="space-y-5">
                          <div className="flex items-start gap-3">
                            <motion.div className="w-10 h-10 rounded-xl bg-rose-500/12 border border-rose-500/22 flex items-center justify-center flex-shrink-0"
                              animate={{ boxShadow: ["0 0 0 0 rgba(244,63,94,0)","0 0 18px 2px rgba(244,63,94,0.14)","0 0 0 0 rgba(244,63,94,0)"] }}
                              transition={{ duration: 2.8, repeat: Infinity }}>
                              <AlertTriangle className="w-5 h-5 text-rose-400" />
                            </motion.div>
                            <div>
                              <div className="text-[11px] font-mono text-rose-500/65 uppercase tracking-[0.3em] mb-0.5">Step 03 - Risks</div>
                              <h2 className="text-xl font-semibold text-white tracking-tight">Pre-mortem review</h2>
                              <p className="text-white/35 text-sm mt-0.5">Imagine it failed. What killed it?</p>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <div className="text-[11px] font-mono text-white/50 tracking-wide">Risks</div>

                            <AnimatePresence initial={false}>
                              {data.risks.map((risk, i) => {
                                const glow = risk.severity >= 80 ? "rgba(244,63,94,0.18)" : risk.severity >= 60 ? "rgba(244,63,94,0.09)" : risk.severity >= 35 ? "rgba(245,158,11,0.07)" : "transparent"
                                const borderColor = risk.severity >= 80 ? "rgba(244,63,94,0.32)" : risk.severity >= 60 ? "rgba(244,63,94,0.18)" : risk.severity >= 35 ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.06)"
                                return (
                                  <motion.div key={i} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.97 }} transition={{ duration: 0.17 }}>
                                    <motion.div className="rounded-xl p-4" style={{ border: "1px solid" }}
                                      animate={{ borderColor, boxShadow: `0 0 22px ${glow}`, backgroundColor: `rgba(244,63,94,${risk.severity * 0.001})` }}
                                      transition={{ duration: 0.12 }}>
                                      <div className="flex items-start gap-3">
                                        <div className="flex-1 space-y-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-mono text-white/45 flex-shrink-0">V_{String(i + 1).padStart(2, "0")}</span>
                                            <input type="text" value={risk.text} onChange={(e) => updateRisk(i, "text", e.target.value)}
                                              placeholder="Describe the failure mode..." aria-label={`Risk ${i + 1} description`}
                                              className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-white text-sm font-mono placeholder:text-white/12 focus:outline-none focus:border-rose-500/28 transition-all" />
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-mono text-white/45 flex-shrink-0 uppercase tracking-wider">SEVERITY</span>
                                            <SeverityBar value={risk.severity} />
                                            <input type="range" min="5" max="100" value={risk.severity} onChange={(e) => updateRisk(i, "severity", parseInt(e.target.value))} aria-label={`Risk ${i + 1} severity: ${risk.severity}%`}
                                              className="w-[72px] h-1 bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                                            <motion.span key={risk.severity} className="text-[10px] font-mono w-[30px] text-right flex-shrink-0"
                                              style={{ color: risk.severity >= 80 ? "#f43f5e" : risk.severity >= 60 ? "#fb923c" : risk.severity >= 35 ? "#f59e0b" : "#10b981" }}
                                              animate={{ opacity: [0.4, 1] }} transition={{ duration: 0.1 }}>{risk.severity}%</motion.span>
                                          </div>
                                        </div>
                                        <button onClick={() => removeRisk(i)} aria-label={`Remove risk ${i + 1}`}
                                          className="p-1.5 hover:bg-white/[0.07] rounded-lg transition-colors flex-shrink-0">
                                          <Trash2 className="w-3.5 h-3.5 text-white/45 hover:text-white/45 transition-colors" />
                                        </button>
                                      </div>
                                    </motion.div>
                                  </motion.div>
                                )
                              })}
                            </AnimatePresence>

                            {!data.skipRisks && (
                              <button onClick={addRisk}
                                className="w-full py-3 border border-dashed border-white/[0.09] rounded-xl text-white/45 text-[10px] font-mono uppercase tracking-[0.22em] hover:bg-white/[0.02] hover:border-white/[0.18] hover:text-white/55 transition-all flex items-center justify-center gap-2 min-h-[44px]">
                                <Plus className="w-3.5 h-3.5" />Add Risk
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
                                  <div className="text-sm text-white/65 font-medium">Accept identified risks?</div>
                                  <div className="text-[11px] font-mono text-white/45 mt-0.5 uppercase tracking-wider">Required before recording</div>
                                </div>
                                <button onClick={() => setData((p) => ({ ...p, acceptRisk: !p.acceptRisk }))}
                                  aria-label="Toggle risk acceptance" aria-pressed={data.acceptRisk}
                                  className={`relative w-14 h-7 rounded-full transition-all duration-300 border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${data.acceptRisk ? "bg-emerald-500/15 border-emerald-500/35" : "bg-[#0a0f14] border-white/[0.09]"}`}>
                                  <div aria-hidden="true" className="absolute inset-y-2 left-2 right-2 flex justify-between pointer-events-none">
                                    {[0,1,2].map((x) => <div key={x} className="w-px h-full bg-white/[0.09]" />)}
                                  </div>
                                  <div aria-hidden="true" className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300"
                                    style={{ background: data.acceptRisk ? "radial-gradient(circle at 75% 50%, #10b981, transparent 65%)" : "radial-gradient(circle at 25% 50%, #f43f5e, transparent 65%)", opacity: 0.22 }} />
                                  <motion.div animate={{ left: data.acceptRisk ? 28 : 3 }} transition={{ type: "spring", stiffness: 600, damping: 38 }}
                                    className="absolute top-1 w-5 h-5 rounded-full border"
                                    style={{ background: "linear-gradient(155deg, rgba(255,255,255,0.22), rgba(255,255,255,0.05))", borderColor: data.acceptRisk ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.12)", boxShadow: data.acceptRisk ? "0 0 8px rgba(16,185,129,0.45), inset 0 1px 0 rgba(255,255,255,0.18)" : "0 0 4px rgba(244,63,94,0.25), inset 0 1px 0 rgba(255,255,255,0.12)" }} />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}

                      {/* ── Step 4: Review ───────────────────────────────────── */}
                      {step === 4 && (
                        <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2, ease: "easeOut" }} className="space-y-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-[11px] font-mono text-emerald-500/55 uppercase tracking-[0.3em] mb-0.5">Step 04 - Review</div>
                              <h2 className="text-xl font-semibold text-white tracking-tight">Decision review</h2>
                              <p className="text-white/35 text-sm mt-0.5">Check the record before saving it.</p>
                            </div>
                            <div className="sm:hidden flex-shrink-0"><LiveQualityRing score={quality} /></div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3.5 bg-white/[0.025] border border-white/[0.07] rounded-xl">
                              <div className="text-[11px] font-mono text-white/45 uppercase tracking-[0.22em] mb-1.5">Decision title</div>
                              <div className="text-sm font-mono font-medium text-white truncate">{data.name || "—"}</div>
                            </div>
                            <div className="p-3.5 bg-white/[0.025] border border-white/[0.07] rounded-xl">
                              <div className="text-[11px] font-mono text-white/45 uppercase tracking-[0.22em] mb-1.5">IMPACT</div>
                              <div className="text-sm font-mono font-medium text-emerald-400">
                                {data.impact}/5 — {IMPACT_LABELS[data.impact]}
                              </div>
                            </div>
                            <div className="p-3.5 bg-cyan-500/[0.04] border border-cyan-500/12 rounded-xl">
                              <div className="text-[11px] font-mono text-primary/38 uppercase tracking-[0.22em] mb-1.5">Option A</div>
                              <div className="text-sm font-mono font-medium text-primary truncate">{data.pathA.title || "—"}</div>
                            </div>
                            <div className="p-3.5 bg-purple-500/[0.04] border border-purple-500/12 rounded-xl">
                              <div className="text-[11px] font-mono text-purple-400/38 uppercase tracking-[0.22em] mb-1.5">Option B</div>
                              <div className="text-sm font-mono font-medium text-purple-400 truncate">{data.pathB.title || "—"}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3.5 bg-rose-500/[0.03] border border-rose-500/[0.12] rounded-xl">
                            <div>
                              <div className="text-[11px] font-mono text-rose-400/55 tracking-wide mb-1">Risks identified</div>
                              <div className="text-sm font-mono text-rose-400">
                                {data.skipRisks ? "No risks documented" : `${data.risks.length} risk${data.risks.length !== 1 ? "s" : ""} acknowledged`}
                              </div>
                            </div>
                            {derivedRiskLevel() && (
                              <div className={`px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase tracking-wider border ${
                                derivedRiskLevel() === "critical" ? "bg-rose-500/12 border-rose-500/28 text-rose-400"
                              : derivedRiskLevel() === "high"     ? "bg-orange-500/12 border-orange-500/28 text-orange-400"
                              : derivedRiskLevel() === "medium"   ? "bg-amber-500/12 border-amber-500/28 text-amber-400"
                              :                                      "bg-emerald-500/12 border-emerald-500/28 text-emerald-400"
                              }`}>{derivedRiskLevel()}</div>
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

                          <motion.button onClick={handleSubmit} disabled={(!data.acceptRisk && !data.skipRisks) || isSubmitting}
                            aria-label="Record decision"
                            className={`w-full py-4 rounded-xl text-[13px] font-mono font-semibold tracking-[0.18em] flex items-center justify-center gap-3 transition-all uppercase relative overflow-hidden ${
                              (data.acceptRisk || data.skipRisks) && !isSubmitting
                                ? "bg-gradient-to-r from-primary to-primary/80 text-[#020408] cursor-pointer"
                                : "bg-white/[0.04] text-white/45 cursor-not-allowed border border-white/[0.07]"
                            }`}
                            animate={(data.acceptRisk || data.skipRisks) && !isSubmitting ? {
                              boxShadow: ["0 0 0 0 var(--bg-body), 0 4px 24px rgba(var(--primary-rgb),0.12)","0 0 0 6px rgba(var(--primary-rgb),0.07), 0 4px 24px rgba(var(--primary-rgb),0.22)","0 0 0 0 var(--bg-body), 0 4px 24px rgba(var(--primary-rgb),0.12)"],
                            } : {}} transition={{ duration: 2.8, repeat: Infinity }}>
                            {(data.acceptRisk || data.skipRisks) && !isSubmitting && (
                              <motion.div aria-hidden="true" className="absolute inset-0 pointer-events-none"
                                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)" }}
                                initial={{ x: "-100%" }} animate={{ x: "200%" }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1.2 }} />
                            )}
                            {isSubmitting ? (
                              <>
                                <motion.div className="w-4 h-4 border-2 border-[#020408]/35 border-t-[#020408] rounded-full"
                                  animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} />
                                Saving...
                              </>
                            ) : (
                              <><CheckCircle2 className="w-5 h-5" />Record decision</>
                            )}
                          </motion.button>
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
                    className="px-4 py-2 text-white/45 text-[10px] font-mono uppercase tracking-[0.22em] hover:text-white/55 transition-colors min-h-[40px]">
                    ← BACK
                  </button>
                ) : <div />}
                <div className="flex items-center gap-3">
                  {step === 4 && <div className="sm:hidden text-[11px] font-mono text-white/40">{quality}% <span className="text-white/25">filled</span></div>}
                  {step < 4 && (
                    <motion.button onClick={() => canProceed() && setStep((s) => s + 1)} disabled={!canProceed()}
                      whileTap={canProceed() ? { scale: 0.96 } : {}}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-[0.18em] transition-all min-h-[40px] border ${
                        canProceed() ? "bg-primary/10 border-primary/28 text-primary hover:bg-primary/14" : "bg-white/[0.025] border-white/[0.06] text-white/45 cursor-not-allowed"
                      }`}>
                      {proceedLabels[step - 1]}<ChevronRight className="w-3.5 h-3.5" />
                    </motion.button>
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
