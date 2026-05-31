"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText, Trash2, AlertTriangle, ChevronRight, ChevronDown, Pencil, Check, FlaskConical, X, Save, Plus, HeartCrack, Calendar, CheckCircle2, Eye } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useDecisionsStore, useExperimentsStore, useSettingsStore } from "@/stores"
import { downloadRFC, copyRFCToClipboard } from "@/lib/utils/generateRFC"
import { getQualityBreakdownFromDecision } from "@/lib/utils/calculateQualityScore"
import { QualityRing } from "@/components/ui/quality-ring"
import { TradeoffRadar } from "@/components/ui/tradeoff-radar"
import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { ReviewMode } from "@/components/review/review-mode"
import { InlineBlindSpots } from "@/components/review/inline-blind-spots"
import { AICritique } from "@/components/review/ai-critique"
import { DecisionComments } from "@/components/review/decision-comments"
import { useNow } from "@/hooks/useNow"
import { cn } from "@/lib/utils"
import type { Decision, DecisionStatus, DecisionOption, DecisionReview, ExecutionStep } from "@/lib/types"

// Status helpers


const RISK_STYLES: Record<NonNullable<Decision["riskLevel"]>, string> = {
  low:      "bg-success/10 border-success/25 text-success",
  medium:   "bg-warning/10 border-warning/25 text-warning",
  high:     "bg-destructive/10 border-destructive/25 text-destructive",
  critical: "bg-destructive/20 border-destructive/40 text-destructive",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })
}

// Sections

function SectionCard({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="bg-surface-2 border border-hairline rounded-2xl p-5">
      <h2 className="label-eyebrow mb-4">{title}</h2>
      {children}
    </div>
  )
}

// Status flow ordered for the picker
const STATUS_FLOW: DecisionStatus[] = ["draft", "in-progress", "decided", "archived"]
const STATUS_FLOW_TERMINAL: DecisionStatus[] = ["voided", "superseded"]

const STATUS_PICKER_STYLES: Record<DecisionStatus, string> = {
  draft:         "bg-white/5 border-white/10 text-white/55 hover:border-white/20",
  "in-progress": "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15",
  decided:       "bg-success/10 border-success/20 text-success hover:bg-success/15",
  archived:      "bg-white/5 border-white/10 text-white/55 hover:border-white/20",
  voided:        "bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/15",
  superseded:    "bg-warning/10 border-warning/20 text-warning hover:bg-warning/15",
}

function StatusEditor({ current, onChange }: { current: DecisionStatus; onChange: (s: DecisionStatus) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all",
          STATUS_PICKER_STYLES[current]
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change decision status"
      >
        {current}
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1.5 z-20 bg-[#0a0f18]/95 backdrop-blur-2xl border border-white/10 rounded-xl p-1.5 shadow-2xl min-w-[160px]"
        >
          {STATUS_FLOW.map((s) => (
            <button
              key={s}
              role="option"
              aria-selected={s === current}
              onClick={() => { onChange(s); setOpen(false) }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all",
                s === current
                  ? cn("border", STATUS_PICKER_STYLES[s])
                  : "text-white/55 hover:bg-white/5 hover:text-white/70"
              )}
            >
              {s}
              {s === current && <Check className="w-3 h-3" />}
            </button>
          ))}
          <div className="my-1 border-t border-hairline" />
          <p className="px-3 py-1 text-[11px] font-mono text-white/55 uppercase tracking-wider">Terminal</p>
          {STATUS_FLOW_TERMINAL.map((s) => (
            <button
              key={s}
              role="option"
              aria-selected={s === current}
              onClick={() => { onChange(s); setOpen(false) }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all",
                s === current
                  ? cn("border", STATUS_PICKER_STYLES[s])
                  : "text-white/55 hover:bg-white/5 hover:text-white/55"
              )}
            >
              {s}
              {s === current && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function InlineEditor({
  value,
  onSave,
  placeholder,
  accentColor = "emerald",
}: {
  value: string | undefined
  onSave: (text: string) => void
  placeholder: string
  accentColor?: "emerald" | "rose"
}) {
  const [draft, setDraft] = useState(value ?? "")
  const [editing, setEditing] = useState(false)

  useEffect(() => { setDraft(value ?? "") }, [value])

  const handleBlur = () => {
    setEditing(false)
    if (draft !== (value ?? "")) onSave(draft)
  }

  const borderFocus = accentColor === "rose" ? "border-destructive/30 focus:border-destructive/50" : "border-success/30 focus:border-success/50"
  const borderDisplay = accentColor === "rose" ? "border-destructive/30" : "border-success/30"

  if (!editing && !draft) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 text-sm text-white/55 hover:text-white/55 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        {placeholder}
      </button>
    )
  }

  return editing ? (
    <textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleBlur}
      autoFocus
      rows={4}
      placeholder={placeholder}
      className={`w-full px-4 py-3 bg-surface-2 border ${borderFocus} rounded-xl text-white text-sm font-mono placeholder:text-white/45 focus:outline-none resize-none leading-relaxed transition-all`}
    />
  ) : (
    <div className="relative group cursor-pointer" onClick={() => setEditing(true)}>
      <div className={`border-l-2 ${borderDisplay} pl-4`}>
        <pre className="text-white/65 text-sm font-mono whitespace-pre-wrap leading-relaxed">
          {draft}
        </pre>
      </div>
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Pencil className="w-3.5 h-3.5 text-white/55" />
      </div>
    </div>
  )
}

// Options Editor

function OptionsEditor({
  options,
  onChange,
  isEditing,
}: {
  options: DecisionOption[]
  onChange: (opts: DecisionOption[]) => void
  isEditing: boolean
}) {
  const updateOption = (index: number, field: keyof DecisionOption, value: string) => {
    const next = options.map((o, i) => (i === index ? { ...o, [field]: value } : o))
    onChange(next)
  }

  const addOption = () => onChange([...options, { title: "", description: "" }])
  const removeOption = (index: number) => onChange(options.filter((_, i) => i !== index))

  if (!isEditing) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, i) => (
          <div key={i} className="p-3.5 bg-surface-1 border border-hairline rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono font-bold ${i === 0 ? "bg-primary/15 text-primary" : "bg-secondary/15 text-secondary"}`}>
                {String.fromCharCode(65 + i)}
              </div>
              <span className="text-sm font-medium text-white">{opt.title}</span>
            </div>
            {opt.description && (
              <p className="text-xs text-white/55 leading-relaxed">{opt.description}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {options.map((opt, i) => (
        <div key={i} className="p-3.5 bg-surface-1 border border-primary/15 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono font-bold ${i === 0 ? "bg-primary/15 text-primary" : "bg-secondary/15 text-secondary"}`}>
              {String.fromCharCode(65 + i)}
            </div>
            <input
              type="text"
              value={opt.title}
              onChange={(e) => updateOption(i, "title", e.target.value)}
              placeholder="Option title"
              className="flex-1 px-3 py-1.5 bg-surface-2 border border-hairline rounded-lg text-white text-sm font-mono placeholder:text-white/45 focus:outline-none focus:border-primary/40 transition-all"
            />
            <button
              onClick={() => removeOption(i)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              aria-label={`Remove option ${String.fromCharCode(65 + i)}`}
            >
              <X className="w-3.5 h-3.5 text-white/55" />
            </button>
          </div>
          <textarea
            value={opt.description}
            onChange={(e) => updateOption(i, "description", e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-1.5 bg-surface-2 border border-hairline rounded-lg text-white text-xs font-mono placeholder:text-white/45 focus:outline-none focus:border-primary/40 transition-all resize-none"
          />
        </div>
      ))}
      <button
        onClick={addOption}
        className="w-full py-2.5 border border-dashed border-white/10 rounded-xl text-white/55 text-xs font-mono hover:bg-surface-1 hover:border-white/20 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Option
      </button>
    </div>
  )
}

// Tags Editor

function TagsEditor({
  tags,
  onChange,
  isEditing,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  isEditing: boolean
}) {
  const [newTag, setNewTag] = useState("")

  const addTag = () => {
    const t = newTag.trim().toUpperCase()
    if (t && !tags.includes(t)) {
      onChange([...tags, t])
      setNewTag("")
    }
  }

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag))

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs flex items-center gap-1.5">
          {tag}
          {isEditing && (
            <button onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors" aria-label={`Remove tag ${tag}`}>
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}
      {isEditing && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
            placeholder="New tag?"
            className="w-24 px-2 py-1 bg-surface-2 border border-hairline rounded-lg text-white text-xs font-mono placeholder:text-white/45 focus:outline-none focus:border-primary/40 transition-all"
          />
          <button
            onClick={addTag}
            disabled={!newTag.trim()}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30"
            aria-label="Add tag"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
          </button>
        </div>
      )}
    </div>
  )
}

// Not found

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="w-14 h-14 mb-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-white/55" />
      </div>
      <p className="text-white/60 text-base mb-1">Decision not found</p>
      <p className="text-white/55 text-sm mb-6">This decision may have been deleted or the ID is invalid.</p>
      <Link
        href="/decisions"
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Decisions
      </Link>
    </div>
  )
}

// Draft type for edit mode

interface EditDraft {
  title: string
  rawThinking: string
  valuesAtStake: string
  humanCost: string
  guidingPrinciple: string
  summary: string
  preMortem: string
  tags: string[]
  constraints: string[]
  options: DecisionOption[]
}

function createDraft(d: Decision): EditDraft {
  return {
    title: d.title,
    rawThinking: d.rawThinking,
    valuesAtStake: d.valuesAtStake ?? "",
    humanCost: d.humanCost ?? "",
    guidingPrinciple: d.guidingPrinciple ?? "",
    summary: d.summary ?? "",
    preMortem: d.preMortem ?? "",
    tags: [...d.tags],
    constraints: [...d.constraints],
    options: d.options.map((o) => ({ ...o })),
  }
}

// Main

const REVIEW_OUTCOME_STYLES: Record<NonNullable<DecisionReview["outcome"]>, string> = {
  good: "bg-success/12 border-success/30 text-success",
  mixed: "bg-warning/12 border-warning/30 text-warning",
  bad: "bg-destructive/12 border-destructive/30 text-destructive",
}

const REVIEW_PROCESS_STYLES: Record<NonNullable<DecisionReview["processQuality"]>, string> = {
  good: "bg-success/12 border-success/30 text-success",
  mixed: "bg-warning/12 border-warning/30 text-warning",
  poor: "bg-destructive/12 border-destructive/30 text-destructive",
}

const REVIEW_VERDICT_LABEL: Record<NonNullable<DecisionReview["sameAgain"]>, string> = {
  "same-again": "Same again",
  "different": "Would not repeat",
  "unsure": "Unsure",
}

function ReviewSummary({ review }: { review: DecisionReview }) {
  const completed = review.completedAt
    ? new Date(review.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {review.outcome && (
          <span className={cn("text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-lg border", REVIEW_OUTCOME_STYLES[review.outcome])}>
            Outcome: {review.outcome}
          </span>
        )}
        {review.processQuality && (
          <span className={cn("text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-lg border", REVIEW_PROCESS_STYLES[review.processQuality])}>
            Process: {review.processQuality}
          </span>
        )}
        {review.sameAgain && (
          <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-lg border bg-secondary/10 border-secondary/25 text-secondary">
            {REVIEW_VERDICT_LABEL[review.sameAgain]}
          </span>
        )}
        {completed && (
          <span className="text-[11px] font-mono text-white/55 uppercase tracking-wider ml-auto">
            Reviewed {completed}
          </span>
        )}
      </div>

      {review.whatHappened && (
        <div>
          <p className="text-[11px] font-mono text-white/55 uppercase tracking-wider mb-1.5">What happened</p>
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{review.whatHappened}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {review.originalAssumption && (
          <div>
            <p className="text-[11px] font-mono text-white/55 uppercase tracking-wider mb-1.5">Original assumption</p>
            <p className="text-sm text-white/60 leading-relaxed">{review.originalAssumption}</p>
          </div>
        )}
        {review.wrongAssumption && (
          <div>
            <p className="text-[11px] font-mono text-destructive/70 uppercase tracking-wider mb-1.5">Wrong assumption</p>
            <p className="text-sm text-white/60 leading-relaxed">{review.wrongAssumption}</p>
          </div>
        )}
        {review.underestimated && (
          <div>
            <p className="text-[11px] font-mono text-white/55 uppercase tracking-wider mb-1.5">Underestimated</p>
            <p className="text-sm text-white/60 leading-relaxed">{review.underestimated}</p>
          </div>
        )}
        {review.overestimated && (
          <div>
            <p className="text-[11px] font-mono text-white/55 uppercase tracking-wider mb-1.5">Overestimated</p>
            <p className="text-sm text-white/60 leading-relaxed">{review.overestimated}</p>
          </div>
        )}
      </div>

      {review.lesson && (
        <div className="rounded-xl border border-secondary/25 bg-secondary/[0.06] p-3.5">
          <p className="text-[11px] font-mono text-secondary/70 uppercase tracking-wider mb-1.5">Lesson carried forward</p>
          <p className="text-sm text-white/80 leading-relaxed">{review.lesson}</p>
        </div>
      )}
    </div>
  )
}

// Execution Trail — the bridge from decided to done

function newStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function ExecutionTrailSection({
  steps,
  onChange,
}: {
  steps: ExecutionStep[]
  onChange: (next: ExecutionStep[]) => void
}) {
  const [draft, setDraft] = useState("")
  const doneCount = steps.filter((s) => s.done).length
  const pct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0

  const addStep = () => {
    const text = draft.trim()
    if (!text) return
    onChange([
      ...steps,
      { id: newStepId(), text, done: false, createdAt: new Date().toISOString() },
    ])
    setDraft("")
  }

  const toggle = (id: string) =>
    onChange(
      steps.map((s) =>
        s.id === id
          ? { ...s, done: !s.done, doneAt: !s.done ? new Date().toISOString() : undefined }
          : s
      )
    )

  const remove = (id: string) => onChange(steps.filter((s) => s.id !== id))

  return (
    <SectionCard title="Execution Trail">
      {steps.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/55">
              {doneCount} of {steps.length} done
            </span>
            <span className="text-[11px] font-mono text-white/55 tabular-nums">{pct}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-success transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <ul className="space-y-1.5">
        {steps.map((step) => (
          <li
            key={step.id}
            className="group flex items-start gap-3 rounded-xl border border-hairline bg-surface-1 px-3 py-2.5"
          >
            <button
              type="button"
              onClick={() => toggle(step.id)}
              aria-pressed={step.done}
              aria-label={step.done ? "Mark step not done" : "Mark step done"}
              className={cn(
                "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors",
                step.done
                  ? "border-success/50 bg-success/20 text-success"
                  : "border-white/20 bg-surface-1 hover:border-white/35"
              )}
            >
              {step.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
            </button>
            <span
              className={cn(
                "min-w-0 flex-1 text-sm leading-relaxed",
                step.done ? "text-white/55 line-through" : "text-white/70"
              )}
            >
              {step.text}
            </span>
            <button
              type="button"
              onClick={() => remove(step.id)}
              className="text-white/55 opacity-0 transition-opacity hover:text-white/50 group-hover:opacity-100"
              aria-label="Remove step"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2.5 flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addStep()
            }
          }}
          placeholder={steps.length === 0 ? "First concrete step to execute this…" : "Add a step…"}
          aria-label="New execution step"
          className="flex-1 px-3 py-2 bg-surface-2 border border-hairline rounded-lg text-white text-sm placeholder:text-white/45 focus:outline-none focus:border-primary/40 transition-colors"
        />
        <button
          type="button"
          onClick={addStep}
          disabled={!draft.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/25 text-primary text-sm font-medium hover:bg-primary/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
    </SectionCard>
  )
}

export default function DecisionDetailPage() {
  const params  = useParams()
  const router  = useRouter()
  const searchParams = useSearchParams()
  const id      = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "")

  const decisions = useDecisionsStore((s) => s.decisions)
  const deleteDecision = useDecisionsStore((s) => s.deleteDecision)
  const updateDecision = useDecisionsStore((s) => s.updateDecision)
  const isLoading = useDecisionsStore((s) => s.isLoading)
  const experiments = useExperimentsStore((s) => s.experiments)
  const settings = useSettingsStore((s) => s.settings)
  const now = useNow()

  const decision = useMemo(
    () => decisions.find((d) => d.id === id) ?? null,
    [decisions, id]
  )

  // Linked experiments for this decision
  const linkedExperiments = useMemo(
    () => experiments.filter((e) => e.decisionId === id || decision?.experiments?.includes(e.id)),
    [experiments, id, decision]
  )

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<EditDraft | null>(null)

  // Celebration state for "decided" transition
  const [showCelebration, setShowCelebration] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const focusHandledRef = useRef(false)

  const handleReviewSave = useCallback(
    (review: DecisionReview, regret: boolean) => {
      if (!decision) return
      updateDecision(decision.id, { review, regret })
    },
    [decision, updateDecision]
  )

  const startEditing = useCallback(() => {
    if (!decision) return
    setDraft(createDraft(decision))
    setIsEditing(true)
  }, [decision])

  // Deep-link focus: the dashboard "next honest action" and revisit queue link
  // here with ?focus=… Open the review modal, or scroll to / activate the
  // relevant section so the CTA lands somewhere actionable.
  useEffect(() => {
    if (!decision || focusHandledRef.current) return
    const focus = searchParams.get("focus")
    if (!focus) return
    focusHandledRef.current = true

    if (focus === "review") {
      setIsReviewOpen(true)
      return
    }
    if (focus === "human-frame") {
      // The human-frame fields only render as inputs in edit mode, so open it.
      startEditing()
    }

    const targetId =
      focus === "revisit"      ? "revisit-controls"
      : focus === "regret"     ? "retrospective-section"
      : focus === "human-frame" ? "human-frame-section"
      : null
    if (!targetId) return

    // Defer until the (possibly edit-mode) section has committed to the DOM.
    const t = setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" })
      if (focus === "revisit") document.getElementById("revisit-date")?.focus()
    }, 80)
    return () => clearTimeout(t)
  }, [decision, searchParams, startEditing])

  const cancelEditing = useCallback(() => {
    setIsEditing(false)
    setDraft(null)
  }, [])

  const saveEdits = useCallback(() => {
    if (!decision || !draft) return
    updateDecision(decision.id, {
      title: draft.title.trim() || decision.title,
      rawThinking: draft.rawThinking,
      valuesAtStake: draft.valuesAtStake.trim() || undefined,
      humanCost: draft.humanCost.trim() || undefined,
      guidingPrinciple: draft.guidingPrinciple.trim() || undefined,
      summary: draft.summary || undefined,
      preMortem: draft.preMortem || undefined,
      tags: draft.tags,
      constraints: draft.constraints,
      options: draft.options.filter((o) => o.title.trim()),
    })
    toast.success("Decision updated", {
      description: `Changes saved to "${draft.title.trim() || decision.title}"`,
    })
    setIsEditing(false)
    setDraft(null)
  }, [decision, draft, updateDecision])

  const updateDraft = useCallback(<K extends keyof EditDraft>(field: K, value: EditDraft[K]) => {
    setDraft((prev) => prev ? { ...prev, [field]: value } : prev)
  }, [])

  const handleDelete = () => {
    if (!decision) return
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    if (!decision) return
    deleteDecision(decision.id)
    toast.success("Decision deleted")
    router.push("/decisions")
  }

  const archiveInstead = () => {
    if (!decision) return
    updateDecision(decision.id, { status: "archived" })
    setIsDeleteConfirmOpen(false)
    toast.success("Decision archived")
  }

  const handleExportRFC = async () => {
    if (!decision) return
    try {
      await copyRFCToClipboard(decision)
      toast.success("RFC copied to clipboard")
    } catch {
      downloadRFC(decision)
    }
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen mesh-gradient">
      <MobileNav />
      <div className="hidden lg:block">
        <LeftSidebar />
      </div>
      <main className="pt-16 lg:pt-0 lg:ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )

  if (isLoading) {
    return shell(
      <div className="py-24 text-center text-white/55 text-sm">Loading decision...</div>
    )
  }

  if (!decision) {
    return shell(<NotFound />)
  }

  const qualityBreakdown = getQualityBreakdownFromDecision(decision)
  const nextQualitySignal = qualityBreakdown.missing[0]

  const displayRawThinking = isEditing && draft ? draft.rawThinking : decision.rawThinking
  const displayValuesAtStake = isEditing && draft ? draft.valuesAtStake : (decision.valuesAtStake ?? "")
  const displayHumanCost = isEditing && draft ? draft.humanCost : (decision.humanCost ?? "")
  const displayGuidingPrinciple = isEditing && draft ? draft.guidingPrinciple : (decision.guidingPrinciple ?? "")
  const displaySummary = isEditing && draft ? draft.summary : (decision.summary ?? "")
  const displayPreMortem = isEditing && draft ? draft.preMortem : (decision.preMortem ?? "")
  const displayTags = isEditing && draft ? draft.tags : decision.tags
  const displayConstraints = isEditing && draft ? draft.constraints : decision.constraints
  const displayOptions = isEditing && draft ? draft.options : decision.options

  return shell(
    <div className="p-4 sm:p-6 max-w-4xl space-y-5">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-white/55" aria-label="Breadcrumb">
        <Link href="/decisions" className="hover:text-white/60 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Decisions
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white/55 truncate max-w-[200px]">{decision.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <StatusEditor
              current={decision.status}
              onChange={(s) => {
                updateDecision(decision.id, { status: s })
                if (s === "decided") {
                  toast.success("Decision marked as decided. Outcome tracking enabled.")
                  if (!settings.reducedMotion) {
                    setShowCelebration(true)
                    setTimeout(() => setShowCelebration(false), 1200)
                  }
                } else {
                  toast.success(`Status -> ${s}`)
                }
              }}
            />
            {decision.riskLevel && (
              <span className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-lg border ${RISK_STYLES[decision.riskLevel]}`}>
                {decision.riskLevel} risk
              </span>
            )}
            {decision.regret && (
              <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-lg border bg-destructive/10 border-destructive/25 text-destructive flex items-center gap-1">
                <HeartCrack className="w-2.5 h-2.5" />
                Regret
              </span>
            )}
          </div>

          {/* Title editable in edit mode */}
          {isEditing && draft ? (
            <input
              type="text"
              value={draft.title}
              onChange={(e) => updateDraft("title", e.target.value)}
              className="w-full text-3xl sm:text-[2.125rem] font-semibold tracking-tight text-white leading-[1.1] bg-transparent border-b-2 border-primary/40 focus:border-primary/70 focus:outline-none py-1 transition-colors"
              placeholder="Decision title"
            />
          ) : (
            <h1 className="text-3xl sm:text-[2.125rem] font-semibold tracking-tight text-white leading-[1.1] text-balance">{decision.title}</h1>
          )}
          <p className="text-white/55 text-sm mt-1.5 text-readout">
            Created {formatDate(decision.createdAt)}
          </p>
        </div>

        {/* Quality ring + celebration pulse */}
        <div className="flex-shrink-0 relative">
          <QualityRing score={decision.qualityScore} size={64} strokeWidth={4} label="Record" />
          <AnimatePresence>
            {showCelebration && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-success"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{ boxShadow: "0 0 20px var(--success)" }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {isEditing ? (
          <>
            <button
              onClick={saveEdits}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/15 border border-success/30 text-success hover:bg-success/20 transition-all text-sm font-medium focus-visible:ring-2 focus-visible:ring-success/50 focus-visible:outline-none"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
            <button
              onClick={cancelEditing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:outline-none"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsReviewOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/10 border border-secondary/30 text-secondary hover:bg-secondary/15 transition-all text-sm font-medium focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:outline-none"
            >
              {decision.review?.completedAt ? <Eye className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {decision.review?.completedAt ? "Update Review" : "Review this decision"}
            </button>
            <button
              onClick={startEditing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/25 text-primary hover:bg-primary/15 transition-all text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/15 transition-all text-sm focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:outline-none"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </>
        )}
      </div>

      {!isEditing && <InlineBlindSpots decisionId={decision.id} />}

      {/* Regret toggle + revisit date — always accessible */}
      {!isEditing && (
        <div id="revisit-controls" className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              updateDecision(decision.id, { regret: !decision.regret })
              toast(decision.regret ? "Regret mark removed" : "Marked as regret", {
                description: decision.regret
                  ? "Good to hear."
                  : "This will surface a “What I got wrong” prompt.",
              })
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition-all",
              decision.regret
                ? "bg-destructive/15 border-destructive/30 text-destructive hover:bg-destructive/10"
                : "bg-surface-1 border-white/10 text-white/55 hover:bg-surface-3 hover:text-white/60"
            )}
          >
            <HeartCrack className="w-3.5 h-3.5" />
            {decision.regret ? "Regret marked" : "Mark as regret"}
          </button>

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-white/55" />
            <label className="text-xs text-white/55 sr-only" htmlFor="revisit-date">Revisit date</label>
            <input
              id="revisit-date"
              type="date"
              value={decision.revisitAt ?? ""}
              onChange={(e) => {
                updateDecision(decision.id, { revisitAt: e.target.value || undefined })
                if (e.target.value) {
                  toast.success("Revisit date set", {
                    description: new Date(e.target.value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
                  })
                }
              }}
              className="px-3 py-1.5 rounded-xl text-xs bg-surface-1 border border-white/10 text-white/50 focus:outline-none focus:border-primary/40 transition-colors"
              aria-label="Set revisit date"
            />
            {decision.revisitAt && (
              <button
                onClick={() => updateDecision(decision.id, { revisitAt: undefined })}
                className="text-white/55 hover:text-white/50 transition-colors"
                aria-label="Clear revisit date"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-decision-title"
            onClick={() => setIsDeleteConfirmOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-md rounded-2xl border border-destructive/20 bg-[#0a0f14] p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-destructive/25 bg-destructive/10 p-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <h2 id="delete-decision-title" className="text-base font-semibold text-white">Delete this decision?</h2>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">
                    This removes the record from local storage. Archive it instead if you may need the history later.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={archiveInstead}
                  className="rounded-xl border border-warning/25 bg-warning/10 px-4 py-2 text-sm text-warning transition-colors hover:bg-warning/15"
                >
                  Archive instead
                </button>
                <button
                  onClick={confirmDelete}
                  className="rounded-xl border border-destructive/30 bg-destructive/15 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                >
                  Delete permanently
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit mode indicator */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/[0.07] border border-primary/20"
          >
            <Pencil className="w-3.5 h-3.5 text-primary" />
            <p className="text-sm text-primary/80">Edit mode - modify fields below, then save or cancel.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="rounded-2xl border border-hairline bg-surface-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Record completeness</h2>
            <p className="mt-1 text-sm text-white/55">
              {qualityBreakdown.earned.length} of {qualityBreakdown.signals.length} sections filled in.
            </p>
          </div>
          {nextQualitySignal && (
            <div className="max-w-sm rounded-xl border border-primary/15 bg-primary/[0.06] px-3 py-2">
              <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-primary/70">Add next</p>
              <p className="mt-1 text-sm text-white/65">{nextQualitySignal.guidance}</p>
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {qualityBreakdown.signals.map((signal) => (
            <div
              key={signal.id}
              className={cn(
                "rounded-xl border px-3 py-2",
                signal.earned
                  ? "border-success/20 bg-success/[0.06]"
                  : "border-hairline bg-black/10"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-white/70">{signal.label}</span>
                <span className={cn("text-[11px] font-mono", signal.earned ? "text-success" : "text-white/55")}>
                  {signal.earned ? `+${signal.points}` : `0/${signal.points}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tags */}
      {(displayTags.length > 0 || isEditing) && (
        <TagsEditor
          tags={displayTags}
          onChange={(tags) => updateDraft("tags", tags)}
          isEditing={isEditing}
        />
      )}

      {/* Brain dump */}
      {(displayRawThinking || isEditing) && (
        <SectionCard title="Brain dump">
          {isEditing && draft ? (
            <textarea
              value={draft.rawThinking}
              onChange={(e) => updateDraft("rawThinking", e.target.value)}
              rows={6}
              placeholder="Your raw thinking and analysis..."
              className="w-full px-4 py-3 bg-surface-2 border border-primary/20 rounded-xl text-white text-sm font-mono placeholder:text-white/45 focus:outline-none focus:border-primary/40 resize-none leading-relaxed transition-all"
            />
          ) : (
            <div className="border-l-2 border-primary/30 pl-4">
              <pre className="text-white/65 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                {displayRawThinking}
              </pre>
            </div>
          )}
        </SectionCard>
      )}

      {/* AI reasoning critique — the model reads the brain dump (and everything
          below) and pushes back. Hidden in edit mode to avoid critiquing a
          half-written draft. */}
      {!isEditing && <AICritique decision={decision} />}

      {/* Human frame */}
      {(displayValuesAtStake || displayHumanCost || displayGuidingPrinciple || isEditing) && (
        <SectionCard title="Human Frame" id="human-frame-section">
          {isEditing && draft ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="edit-values-at-stake" className="text-[11px] font-mono uppercase tracking-wider text-white/55">
                  Values at stake
                </label>
                <textarea
                  id="edit-values-at-stake"
                  value={draft.valuesAtStake}
                  onChange={(e) => updateDraft("valuesAtStake", e.target.value)}
                  rows={4}
                  placeholder="What value could be compromised?"
                  className="w-full px-3 py-2 bg-surface-2 border border-primary/20 rounded-xl text-white text-xs font-mono placeholder:text-white/45 focus:outline-none focus:border-primary/40 resize-none leading-relaxed transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-human-cost" className="text-[11px] font-mono uppercase tracking-wider text-white/55">
                  Human cost
                </label>
                <textarea
                  id="edit-human-cost"
                  value={draft.humanCost}
                  onChange={(e) => updateDraft("humanCost", e.target.value)}
                  rows={4}
                  placeholder="Who pays if this is wrong?"
                  className="w-full px-3 py-2 bg-surface-2 border border-primary/20 rounded-xl text-white text-xs font-mono placeholder:text-white/45 focus:outline-none focus:border-primary/40 resize-none leading-relaxed transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-guiding-principle" className="text-[11px] font-mono uppercase tracking-wider text-white/55">
                  Guiding principle
                </label>
                <textarea
                  id="edit-guiding-principle"
                  value={draft.guidingPrinciple}
                  onChange={(e) => updateDraft("guidingPrinciple", e.target.value)}
                  rows={4}
                  placeholder="What rule should still hold?"
                  className="w-full px-3 py-2 bg-surface-2 border border-primary/20 rounded-xl text-white text-xs font-mono placeholder:text-white/45 focus:outline-none focus:border-primary/40 resize-none leading-relaxed transition-all"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {displayValuesAtStake && (
                <div className="rounded-xl border border-hairline bg-surface-1 p-3">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-white/55">Values</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60">{displayValuesAtStake}</p>
                </div>
              )}
              {displayHumanCost && (
                <div className="rounded-xl border border-hairline bg-surface-1 p-3">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-white/55">Human cost</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60">{displayHumanCost}</p>
                </div>
              )}
              {displayGuidingPrinciple && (
                <div className="rounded-xl border border-hairline bg-surface-1 p-3">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-white/55">Principle</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60">{displayGuidingPrinciple}</p>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {/* Options */}
      {(displayOptions.length > 0 || isEditing) && (
        <SectionCard title="Options Considered">
          <OptionsEditor
            options={displayOptions}
            onChange={(opts) => updateDraft("options", opts)}
            isEditing={isEditing}
          />
        </SectionCard>
      )}

      {/* Trade-off Radar read-only */}
      {decision.tradeoffs.length > 0 && (
        <SectionCard title="Trade-off Analysis">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <TradeoffRadar data={decision.tradeoffs} size={180} />
            <div className="flex-1 space-y-2.5">
              {decision.tradeoffs.map((t) => (
                <div key={t.axis} className="flex items-center gap-3">
                  <span className="text-xs text-white/55 w-24 flex-shrink-0">{t.axis}</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${t.value}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-white/50 w-8 text-right">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Pre-Mortem */}
      {(displayPreMortem || isEditing) && (
        <SectionCard title="Pre-Mortem">
          {isEditing && draft ? (
            <textarea
              value={draft.preMortem}
              onChange={(e) => updateDraft("preMortem", e.target.value)}
              rows={4}
              placeholder="What could go wrong? Imagine this decision failed..."
              className="w-full px-4 py-3 bg-surface-2 border border-destructive/20 rounded-xl text-white text-sm font-mono placeholder:text-white/45 focus:outline-none focus:border-destructive/40 resize-none leading-relaxed transition-all"
            />
          ) : (
            <div className="p-3.5 bg-destructive/[0.04] border border-destructive/[0.12] rounded-xl">
              <pre className="text-white/60 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                {displayPreMortem}
              </pre>
            </div>
          )}
        </SectionCard>
      )}

      {/* Risks read-only */}
      {decision.risks.length > 0 && (
        <SectionCard title={`Risks (${decision.risks.length})`}>
          <div className="space-y-2">
            {decision.risks.map((risk, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-surface-1 border border-hairline rounded-xl">
                <span className="flex-1 text-sm text-white/65">{risk.text}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${risk.severity}%`,
                        backgroundColor: risk.severity >= 80 ? "#f43f5e" : risk.severity >= 60 ? "#fb923c" : risk.severity >= 35 ? "#f59e0b" : "#10b981",
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-white/55">{risk.severity}%</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Constraints */}
      {(displayConstraints.length > 0 || isEditing) && (
        <SectionCard title="Constraints">
          <div className="flex flex-wrap gap-2">
            {displayConstraints.map((c) => (
              <span key={c} className="px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs font-mono flex items-center gap-1.5">
                [{c.toUpperCase()}]
                {isEditing && (
                  <button
                    onClick={() => updateDraft("constraints", displayConstraints.filter((x) => x !== c))}
                    className="hover:text-destructive transition-colors"
                    aria-label={`Remove constraint ${c}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Execution Trail — what turns a decision into action */}
      <ExecutionTrailSection
        steps={decision.executionTrail ?? []}
        onChange={(next) => updateDecision(decision.id, { executionTrail: next })}
      />

      {/* Structured Review */}
      {decision.review?.completedAt ? (
        <SectionCard title="Review">
          <ReviewSummary review={decision.review} />
        </SectionCard>
      ) : decision.revisitAt && now != null && new Date(decision.revisitAt).getTime() <= now ? (
        <div className="rounded-2xl border border-secondary/25 bg-secondary/[0.06] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-secondary/15 border border-secondary/30 p-2">
              <CheckCircle2 className="w-4 h-4 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-white">Time to look back honestly</h2>
              <p className="mt-1 text-sm text-white/55 leading-relaxed">
                You said you would review this. Do it before the memory rewrites itself.
              </p>
              <button
                onClick={() => setIsReviewOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary/15 border border-secondary/35 text-secondary text-sm font-medium hover:bg-secondary/20 transition-colors"
              >
                Start review
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Retrospective — always editable */}
      <SectionCard title="Retrospective" id="retrospective-section">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-mono text-white/55 uppercase tracking-wider mb-2">What happened</p>
            <InlineEditor
              value={decision.retrospective}
              onSave={(text) => {
                updateDecision(decision.id, { retrospective: text || undefined })
                toast.success("Retrospective saved")
              }}
              placeholder="What happened after this decision? Did it work?"
              accentColor="emerald"
            />
          </div>

          {/* What I got wrong — always available when regret is marked, or if gotWrong has content */}
          {(decision.regret || decision.gotWrong) && (
            <div>
              <p className="text-xs font-mono text-destructive/60 uppercase tracking-wider mb-2">What I got wrong</p>
              <InlineEditor
                value={decision.gotWrong}
                onSave={(text) => {
                  updateDecision(decision.id, { gotWrong: text || undefined })
                  toast.success("Saved")
                }}
                placeholder="What did you misjudge or miss? Be honest — this is only for you."
                accentColor="rose"
              />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Summary */}
      {(displaySummary || isEditing) && (
        <SectionCard title="Summary">
          {isEditing && draft ? (
            <textarea
              value={draft.summary}
              onChange={(e) => updateDraft("summary", e.target.value)}
              rows={3}
              placeholder="Brief summary of this decision..."
              className="w-full px-4 py-3 bg-surface-2 border border-primary/20 rounded-xl text-white text-sm placeholder:text-white/45 focus:outline-none focus:border-primary/40 resize-none leading-relaxed transition-all"
            />
          ) : (
            <p className="text-white/60 text-sm leading-relaxed">{displaySummary}</p>
          )}
        </SectionCard>
      )}

      {/* Discussion — turns the solo journal entry into a conversation. On a
          shared instance, teammates' comments sync in here. */}
      {!isEditing && <DecisionComments decision={decision} />}

      {/* Linked Experiments */}
      {linkedExperiments.length > 0 && (
        <SectionCard title="Validating This Decision">
          <div className="space-y-3">
            {linkedExperiments.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between p-3 bg-surface-1 border border-hairline rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                    <FlaskConical className="w-4 h-4 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{exp.title}</p>
                    <p className="text-xs text-white/55 font-mono">
                      EXP-{String(exp.number).padStart(2, "0")} - {exp.status}
                    </p>
                  </div>
                </div>
                {exp.result.actual !== null && (
                  <span className={`text-sm font-mono ${
                    exp.result.actual >= exp.hypothesis.expected
                      ? "text-success"
                      : "text-destructive"
                  }`}>
                    {exp.result.actual}{exp.hypothesis.unit}
                  </span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* RFC export — small link, not a primary action */}
      {decision.rfcData && (
        <div className="flex justify-end pb-2">
          <button
            onClick={handleExportRFC}
            className="flex items-center gap-1.5 text-xs text-white/55 hover:text-white/50 transition-colors"
          >
            <FileText className="w-3 h-3" />
            Export as RFC
          </button>
        </div>
      )}

      <ReviewMode
        isOpen={isReviewOpen}
        decision={decision}
        onClose={() => setIsReviewOpen(false)}
        onSave={handleReviewSave}
      />

    </div>
  )
}
