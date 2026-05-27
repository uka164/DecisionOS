"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText, Trash2, AlertTriangle, ChevronRight, ChevronDown, Pencil, Check, FlaskConical, X, Save, Plus, HeartCrack, Calendar } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useDecisionsStore, useExperimentsStore, useSettingsStore } from "@/stores"
import { downloadRFC, copyRFCToClipboard } from "@/lib/utils/generateRFC"
import { getQualityBreakdownFromDecision } from "@/lib/utils/calculateQualityScore"
import { QualityRing } from "@/components/ui/quality-ring"
import { TradeoffRadar } from "@/components/ui/tradeoff-radar"
import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { cn } from "@/lib/utils"
import type { Decision, DecisionStatus, DecisionOption } from "@/lib/types"

// Status helpers


const RISK_STYLES: Record<NonNullable<Decision["riskLevel"]>, string> = {
  low:      "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
  medium:   "bg-amber-500/10 border-amber-500/25 text-amber-400",
  high:     "bg-rose-500/10 border-rose-500/25 text-rose-400",
  critical: "bg-rose-500/20 border-rose-500/40 text-rose-400",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })
}

// Sections

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
      <h2 className="text-xs font-mono text-white/45 uppercase tracking-[0.2em] mb-4">{title}</h2>
      {children}
    </div>
  )
}

// Status flow ordered for the picker
const STATUS_FLOW: DecisionStatus[] = ["draft", "in-progress", "decided", "archived"]
const STATUS_FLOW_TERMINAL: DecisionStatus[] = ["voided", "superseded"]

const STATUS_PICKER_STYLES: Record<DecisionStatus, string> = {
  draft:         "bg-white/5 border-white/10 text-white/55 hover:border-white/20",
  "in-progress": "bg-cyan-500/10 border-cyan-500/20 text-primary hover:bg-cyan-500/15",
  decided:       "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15",
  archived:      "bg-white/5 border-white/10 text-white/40 hover:border-white/20",
  voided:        "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/15",
  superseded:    "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/15",
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
          "flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all",
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
                  : "text-white/45 hover:bg-white/5 hover:text-white/70"
              )}
            >
              {s}
              {s === current && <Check className="w-3 h-3" />}
            </button>
          ))}
          <div className="my-1 border-t border-white/[0.06]" />
          <p className="px-3 py-1 text-[9px] font-mono text-white/20 uppercase tracking-wider">Terminal</p>
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
                  : "text-white/35 hover:bg-white/5 hover:text-white/55"
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

  const borderFocus = accentColor === "rose" ? "border-rose-500/30 focus:border-rose-500/50" : "border-emerald-500/30 focus:border-emerald-500/50"
  const borderDisplay = accentColor === "rose" ? "border-rose-500/30" : "border-emerald-500/30"

  if (!editing && !draft) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 text-sm text-white/45 hover:text-white/55 transition-colors"
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
      className={`w-full px-4 py-3 bg-white/[0.04] border ${borderFocus} rounded-xl text-white text-sm font-mono placeholder:text-white/15 focus:outline-none resize-none leading-relaxed transition-all`}
    />
  ) : (
    <div className="relative group cursor-pointer" onClick={() => setEditing(true)}>
      <div className={`border-l-2 ${borderDisplay} pl-4`}>
        <pre className="text-white/65 text-sm font-mono whitespace-pre-wrap leading-relaxed">
          {draft}
        </pre>
      </div>
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Pencil className="w-3.5 h-3.5 text-white/45" />
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
          <div key={i} className="p-3.5 bg-white/[0.03] border border-white/[0.07] rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold ${i === 0 ? "bg-cyan-500/15 text-primary" : "bg-purple-500/15 text-purple-400"}`}>
                {String.fromCharCode(65 + i)}
              </div>
              <span className="text-sm font-medium text-white">{opt.title}</span>
            </div>
            {opt.description && (
              <p className="text-xs text-white/45 leading-relaxed">{opt.description}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {options.map((opt, i) => (
        <div key={i} className="p-3.5 bg-white/[0.03] border border-primary/15 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold ${i === 0 ? "bg-cyan-500/15 text-primary" : "bg-purple-500/15 text-purple-400"}`}>
              {String.fromCharCode(65 + i)}
            </div>
            <input
              type="text"
              value={opt.title}
              onChange={(e) => updateOption(i, "title", e.target.value)}
              placeholder="Option title"
              className="flex-1 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-all"
            />
            <button
              onClick={() => removeOption(i)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              aria-label={`Remove option ${String.fromCharCode(65 + i)}`}
            >
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>
          <textarea
            value={opt.description}
            onChange={(e) => updateOption(i, "description", e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-xs font-mono placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-all resize-none"
          />
        </div>
      ))}
      <button
        onClick={addOption}
        className="w-full py-2.5 border border-dashed border-white/10 rounded-xl text-white/40 text-xs font-mono hover:bg-white/[0.03] hover:border-white/20 transition-all flex items-center justify-center gap-2"
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
            <button onClick={() => removeTag(tag)} className="hover:text-rose-400 transition-colors" aria-label={`Remove tag ${tag}`}>
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
            className="w-24 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-xs font-mono placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-all"
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
        <AlertTriangle className="w-6 h-6 text-white/45" />
      </div>
      <p className="text-white/60 text-base mb-1">Decision not found</p>
      <p className="text-white/45 text-sm mb-6">This decision may have been deleted or the ID is invalid.</p>
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
    summary: d.summary ?? "",
    preMortem: d.preMortem ?? "",
    tags: [...d.tags],
    constraints: [...d.constraints],
    options: d.options.map((o) => ({ ...o })),
  }
}

// Main

export default function DecisionDetailPage() {
  const params  = useParams()
  const router  = useRouter()
  const id      = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "")

  const decisions = useDecisionsStore((s) => s.decisions)
  const deleteDecision = useDecisionsStore((s) => s.deleteDecision)
  const updateDecision = useDecisionsStore((s) => s.updateDecision)
  const isLoading = useDecisionsStore((s) => s.isLoading)
  const experiments = useExperimentsStore((s) => s.experiments)
  const settings = useSettingsStore((s) => s.settings)

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

  const startEditing = useCallback(() => {
    if (!decision) return
    setDraft(createDraft(decision))
    setIsEditing(true)
  }, [decision])

  const cancelEditing = useCallback(() => {
    setIsEditing(false)
    setDraft(null)
  }, [])

  const saveEdits = useCallback(() => {
    if (!decision || !draft) return
    updateDecision(decision.id, {
      title: draft.title.trim() || decision.title,
      rawThinking: draft.rawThinking,
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
      <div className="py-24 text-center text-white/40 text-sm">Loading decision...</div>
    )
  }

  if (!decision) {
    return shell(<NotFound />)
  }

  const qualityBreakdown = getQualityBreakdownFromDecision(decision)
  const nextQualitySignal = qualityBreakdown.missing[0]

  const displayRawThinking = isEditing && draft ? draft.rawThinking : decision.rawThinking
  const displaySummary = isEditing && draft ? draft.summary : (decision.summary ?? "")
  const displayPreMortem = isEditing && draft ? draft.preMortem : (decision.preMortem ?? "")
  const displayTags = isEditing && draft ? draft.tags : decision.tags
  const displayConstraints = isEditing && draft ? draft.constraints : decision.constraints
  const displayOptions = isEditing && draft ? draft.options : decision.options

  return shell(
    <div className="p-4 sm:p-6 max-w-4xl space-y-5">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-white/45" aria-label="Breadcrumb">
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
              <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-lg border ${RISK_STYLES[decision.riskLevel]}`}>
                {decision.riskLevel} risk
              </span>
            )}
            {decision.regret && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-lg border bg-rose-500/10 border-rose-500/25 text-rose-400 flex items-center gap-1">
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
              className="w-full text-2xl font-bold text-white leading-tight bg-transparent border-b-2 border-primary/40 focus:border-primary/70 focus:outline-none py-1 transition-colors"
              placeholder="Decision title"
            />
          ) : (
            <h1 className="text-2xl font-bold text-white leading-tight">{decision.title}</h1>
          )}
          <p className="text-white/45 text-sm mt-1 font-mono">
            Created {formatDate(decision.createdAt)}
          </p>
        </div>

        {/* Quality ring + celebration pulse */}
        <div className="flex-shrink-0 relative">
          <QualityRing score={decision.qualityScore} size={64} strokeWidth={4} label="Record" />
          <AnimatePresence>
            {showCelebration && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-emerald-400"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{ boxShadow: "0 0 20px #10b981" }}
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all text-sm font-medium focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:outline-none"
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
              onClick={startEditing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/25 text-primary hover:bg-cyan-500/15 transition-all text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/15 transition-all text-sm focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:outline-none"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </>
        )}
      </div>

      {/* Regret toggle + revisit date — always accessible */}
      {!isEditing && (
        <div className="flex flex-wrap items-center gap-3">
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
                ? "bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                : "bg-white/[0.03] border-white/10 text-white/40 hover:bg-white/[0.06] hover:text-white/60"
            )}
          >
            <HeartCrack className="w-3.5 h-3.5" />
            {decision.regret ? "Regret marked" : "Mark as regret"}
          </button>

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-white/35" />
            <label className="text-xs text-white/35 sr-only" htmlFor="revisit-date">Revisit date</label>
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
              className="px-3 py-1.5 rounded-xl text-xs bg-white/[0.03] border border-white/10 text-white/50 focus:outline-none focus:border-primary/40 transition-colors"
              aria-label="Set revisit date"
            />
            {decision.revisitAt && (
              <button
                onClick={() => updateDecision(decision.id, { revisitAt: undefined })}
                className="text-white/25 hover:text-white/50 transition-colors"
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
              className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-[#0a0f14] p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-rose-500/25 bg-rose-500/10 p-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
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
                  className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-500/15"
                >
                  Archive instead
                </button>
                <button
                  onClick={confirmDelete}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
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

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Record completeness</h2>
            <p className="mt-1 text-sm text-white/45">
              {qualityBreakdown.earned.length} of {qualityBreakdown.signals.length} sections filled in.
            </p>
          </div>
          {nextQualitySignal && (
            <div className="max-w-sm rounded-xl border border-primary/15 bg-primary/[0.06] px-3 py-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-primary/70">Add next</p>
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
                  ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                  : "border-white/[0.08] bg-black/10"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-white/70">{signal.label}</span>
                <span className={cn("text-[10px] font-mono", signal.earned ? "text-emerald-400" : "text-white/30")}>
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
              className="w-full px-4 py-3 bg-white/[0.04] border border-primary/20 rounded-xl text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-primary/40 resize-none leading-relaxed transition-all"
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
                  <span className="text-xs text-white/45 w-24 flex-shrink-0">{t.axis}</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-500"
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
              className="w-full px-4 py-3 bg-white/[0.04] border border-rose-500/20 rounded-xl text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-rose-500/40 resize-none leading-relaxed transition-all"
            />
          ) : (
            <div className="p-3.5 bg-rose-500/[0.04] border border-rose-500/[0.12] rounded-xl">
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
              <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                <span className="text-[9px] font-mono text-white/40 flex-shrink-0">V_{String(i + 1).padStart(2, "0")}</span>
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
                  <span className="text-[10px] font-mono text-white/40">{risk.severity}%</span>
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
              <span key={c} className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono flex items-center gap-1.5">
                [{c.toUpperCase()}]
                {isEditing && (
                  <button
                    onClick={() => updateDraft("constraints", displayConstraints.filter((x) => x !== c))}
                    className="hover:text-rose-400 transition-colors"
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

      {/* Retrospective — always editable */}
      <SectionCard title="Retrospective">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-mono text-white/40 uppercase tracking-wider mb-2">What happened</p>
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
              <p className="text-xs font-mono text-rose-400/60 uppercase tracking-wider mb-2">What I got wrong</p>
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
              className="w-full px-4 py-3 bg-white/[0.04] border border-primary/20 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/40 resize-none leading-relaxed transition-all"
            />
          ) : (
            <p className="text-white/60 text-sm leading-relaxed">{displaySummary}</p>
          )}
        </SectionCard>
      )}

      {/* Linked Experiments */}
      {linkedExperiments.length > 0 && (
        <SectionCard title="Validating This Decision">
          <div className="space-y-3">
            {linkedExperiments.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <FlaskConical className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{exp.title}</p>
                    <p className="text-xs text-white/40 font-mono">
                      EXP-{String(exp.number).padStart(2, "0")} - {exp.status}
                    </p>
                  </div>
                </div>
                {exp.result.actual !== null && (
                  <span className={`text-sm font-mono ${
                    exp.result.actual >= exp.hypothesis.expected
                      ? "text-emerald-400"
                      : "text-rose-400"
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
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            <FileText className="w-3 h-3" />
            Export as RFC
          </button>
        </div>
      )}

    </div>
  )
}
