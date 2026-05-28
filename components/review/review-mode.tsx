"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  HeartCrack,
  Scale,
  Eye,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  Decision,
  DecisionReview,
  ReviewOutcome,
  ReviewProcessQuality,
  ReviewVerdict,
} from "@/lib/types"

interface ReviewModeProps {
  isOpen: boolean
  decision: Decision | null
  onClose: () => void
  onSave: (review: DecisionReview, regret: boolean) => void
}

interface ReviewDraft {
  whatHappened: string
  originalAssumption: string
  wrongAssumption: string
  underestimated: string
  overestimated: string
  sameAgain: ReviewVerdict | ""
  lesson: string
  outcome: ReviewOutcome | ""
  processQuality: ReviewProcessQuality | ""
  regret: boolean
}

const EMPTY_DRAFT: ReviewDraft = {
  whatHappened: "",
  originalAssumption: "",
  wrongAssumption: "",
  underestimated: "",
  overestimated: "",
  sameAgain: "",
  lesson: "",
  outcome: "",
  processQuality: "",
  regret: false,
}

function fromDecision(decision: Decision | null): ReviewDraft {
  if (!decision) return EMPTY_DRAFT
  const r = decision.review
  return {
    whatHappened: r?.whatHappened ?? "",
    originalAssumption: r?.originalAssumption ?? "",
    wrongAssumption: r?.wrongAssumption ?? "",
    underestimated: r?.underestimated ?? "",
    overestimated: r?.overestimated ?? "",
    sameAgain: r?.sameAgain ?? "",
    lesson: r?.lesson ?? decision.gotWrong ?? "",
    outcome: r?.outcome ?? "",
    processQuality: r?.processQuality ?? "",
    regret: Boolean(decision.regret),
  }
}

const STEPS = [
  { id: 1, code: "01", label: "REALITY", sub: "What actually happened", icon: Eye },
  { id: 2, code: "02", label: "JUDGEMENT", sub: "Outcome vs process", icon: Scale },
  { id: 3, code: "03", label: "LESSON", sub: "What you carry forward", icon: CheckCircle2 },
] as const

const OUTCOMES: { value: ReviewOutcome; label: string; hint: string; tone: string }[] = [
  { value: "good", label: "Good", hint: "It worked or it is working", tone: "emerald" },
  { value: "mixed", label: "Mixed", hint: "Some upside, some pain", tone: "amber" },
  { value: "bad", label: "Bad", hint: "It did not work", tone: "rose" },
]

const PROCESS: { value: ReviewProcessQuality; label: string; hint: string; tone: string }[] = [
  { value: "good", label: "Good", hint: "I would defend the reasoning even if I had been wrong", tone: "emerald" },
  { value: "mixed", label: "Mixed", hint: "Some honest thinking, some hand-waving", tone: "amber" },
  { value: "poor", label: "Poor", hint: "I was rationalising what I wanted to do", tone: "rose" },
]

const SAME_AGAIN: { value: ReviewVerdict; label: string; hint: string }[] = [
  { value: "same-again", label: "Same again", hint: "With this knowledge I would still choose this" },
  { value: "different", label: "Different", hint: "I would not choose this again" },
  { value: "unsure", label: "Unsure", hint: "Honestly cannot tell yet" },
]

const TONE_STYLES: Record<string, { active: string; inactive: string }> = {
  emerald: {
    active: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
    inactive: "bg-white/[0.025] border-white/[0.07] text-white/55 hover:bg-emerald-500/[0.07] hover:border-emerald-500/20",
  },
  amber: {
    active: "bg-amber-500/15 border-amber-500/40 text-amber-300",
    inactive: "bg-white/[0.025] border-white/[0.07] text-white/55 hover:bg-amber-500/[0.07] hover:border-amber-500/20",
  },
  rose: {
    active: "bg-rose-500/15 border-rose-500/40 text-rose-300",
    inactive: "bg-white/[0.025] border-white/[0.07] text-white/55 hover:bg-rose-500/[0.07] hover:border-rose-500/20",
  },
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[11px] font-mono text-white/50 uppercase tracking-wider mb-1.5"
    >
      {children}
    </label>
  )
}

export function ReviewMode({ isOpen, decision, onClose, onSave }: ReviewModeProps) {
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<ReviewDraft>(EMPTY_DRAFT)

  useEffect(() => {
    if (isOpen && decision) {
      setDraft(fromDecision(decision))
      setStep(1)
    }
  }, [isOpen, decision])

  const canSave = useMemo(() => {
    return (
      draft.whatHappened.trim().length > 0 &&
      draft.outcome !== "" &&
      draft.processQuality !== ""
    )
  }, [draft])

  if (!decision) return null

  const handleSave = () => {
    if (!canSave) {
      toast.error("Review needs at least: what happened, outcome, process quality.")
      return
    }
    const review: DecisionReview = {
      whatHappened: draft.whatHappened.trim() || undefined,
      originalAssumption: draft.originalAssumption.trim() || undefined,
      wrongAssumption: draft.wrongAssumption.trim() || undefined,
      underestimated: draft.underestimated.trim() || undefined,
      overestimated: draft.overestimated.trim() || undefined,
      sameAgain: draft.sameAgain === "" ? undefined : draft.sameAgain,
      lesson: draft.lesson.trim() || undefined,
      outcome: draft.outcome === "" ? undefined : draft.outcome,
      processQuality: draft.processQuality === "" ? undefined : draft.processQuality,
      completedAt: new Date().toISOString(),
    }
    onSave(review, draft.regret)
    toast.success("Review saved", {
      description: "The loop is closed. The lesson is yours now.",
    })
    onClose()
  }

  const next = () => setStep((s) => Math.min(3, s + 1))
  const prev = () => setStep((s) => Math.max(1, s - 1))

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Review decision"
        >
          <motion.div
            className="absolute inset-0 bg-[#020408]/95 backdrop-blur-xl"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full sm:max-w-[640px] flex flex-col bg-bg-surface sm:rounded-2xl border border-white/10 shadow-2xl"
            style={{ maxHeight: "100vh" }}
          >
            <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] flex-shrink-0">
              <div className="min-w-0 flex-1 pr-4">
                <p className="text-[10px] font-mono text-violet-400/70 uppercase tracking-[0.2em]">
                  Review Mode · Step {step}/3
                </p>
                <h2 className="text-sm font-semibold text-white truncate mt-0.5">
                  {decision.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
                aria-label="Close review"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <nav
              aria-label="Review steps"
              className="flex items-center gap-1.5 px-5 py-3 border-b border-white/[0.06] flex-shrink-0 overflow-x-auto scrollbar-none"
            >
              {STEPS.map((s) => {
                const Icon = s.icon
                const active = step === s.id
                const done = step > s.id
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono uppercase tracking-wider flex-shrink-0 transition-colors",
                      active && "bg-violet-500/10 border-violet-500/30 text-violet-300",
                      done && "bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400/70",
                      !active && !done && "bg-white/[0.02] border-white/[0.05] text-white/35"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {s.label}
                  </div>
                )
              })}
            </nav>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.section
                    key="step-reality"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                    aria-labelledby="review-step-reality"
                  >
                    <div>
                      <h3 id="review-step-reality" className="text-base font-semibold text-white">
                        What actually happened?
                      </h3>
                      <p className="text-xs text-white/45 mt-1 leading-relaxed">
                        Plain language. The boring truth, not the LinkedIn version.
                      </p>
                    </div>

                    <div>
                      <FieldLabel htmlFor="review-what-happened">
                        What actually happened
                      </FieldLabel>
                      <textarea
                        id="review-what-happened"
                        value={draft.whatHappened}
                        onChange={(e) => setDraft((d) => ({ ...d, whatHappened: e.target.value }))}
                        rows={4}
                        placeholder="It shipped late and the migration ran twice. We rolled back on day three."
                        className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <FieldLabel htmlFor="review-original-assumption">
                          Original assumption
                        </FieldLabel>
                        <textarea
                          id="review-original-assumption"
                          value={draft.originalAssumption}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, originalAssumption: e.target.value }))
                          }
                          rows={3}
                          placeholder="What did I believe would be true?"
                          className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none leading-relaxed"
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor="review-underestimated">
                          What was underestimated
                        </FieldLabel>
                        <textarea
                          id="review-underestimated"
                          value={draft.underestimated}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, underestimated: e.target.value }))
                          }
                          rows={3}
                          placeholder="Effort, risk, second-order effect..."
                          className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none leading-relaxed"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <FieldLabel htmlFor="review-overestimated">
                          What was overestimated
                        </FieldLabel>
                        <textarea
                          id="review-overestimated"
                          value={draft.overestimated}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, overestimated: e.target.value }))
                          }
                          rows={2}
                          placeholder="Benefit, demand, team capacity..."
                          className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </motion.section>
                )}

                {step === 2 && (
                  <motion.section
                    key="step-judgement"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-5"
                    aria-labelledby="review-step-judgement"
                  >
                    <div>
                      <h3 id="review-step-judgement" className="text-base font-semibold text-white">
                        Judge the outcome and the process separately.
                      </h3>
                      <p className="text-xs text-white/45 mt-1 leading-relaxed">
                        A good decision can have a bad outcome. A bad decision can get lucky. Both matter.
                      </p>
                    </div>

                    <fieldset className="space-y-2.5">
                      <legend className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                        Outcome quality
                      </legend>
                      <div className="grid grid-cols-3 gap-2">
                        {OUTCOMES.map((opt) => {
                          const styles = TONE_STYLES[opt.tone]
                          const active = draft.outcome === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setDraft((d) => ({ ...d, outcome: opt.value }))}
                              aria-pressed={active}
                              className={cn(
                                "px-3 py-2.5 rounded-xl border text-left transition-colors min-h-[60px]",
                                active ? styles.active : styles.inactive
                              )}
                            >
                              <div className="text-sm font-medium">{opt.label}</div>
                              <div className="text-[11px] mt-0.5 opacity-70 leading-snug">{opt.hint}</div>
                            </button>
                          )
                        })}
                      </div>
                    </fieldset>

                    <fieldset className="space-y-2.5">
                      <legend className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                        Process quality
                      </legend>
                      <div className="grid grid-cols-3 gap-2">
                        {PROCESS.map((opt) => {
                          const styles = TONE_STYLES[opt.tone]
                          const active = draft.processQuality === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setDraft((d) => ({ ...d, processQuality: opt.value }))}
                              aria-pressed={active}
                              className={cn(
                                "px-3 py-2.5 rounded-xl border text-left transition-colors min-h-[60px]",
                                active ? styles.active : styles.inactive
                              )}
                            >
                              <div className="text-sm font-medium">{opt.label}</div>
                              <div className="text-[11px] mt-0.5 opacity-70 leading-snug">{opt.hint}</div>
                            </button>
                          )
                        })}
                      </div>
                    </fieldset>

                    <fieldset className="space-y-2.5">
                      <legend className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                        Would you make the same decision again?
                      </legend>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {SAME_AGAIN.map((opt) => {
                          const active = draft.sameAgain === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setDraft((d) => ({ ...d, sameAgain: opt.value }))}
                              aria-pressed={active}
                              className={cn(
                                "px-3 py-2.5 rounded-xl border text-left transition-colors min-h-[60px]",
                                active
                                  ? "bg-violet-500/15 border-violet-500/40 text-violet-200"
                                  : "bg-white/[0.025] border-white/[0.07] text-white/55 hover:bg-violet-500/[0.07] hover:border-violet-500/20"
                              )}
                            >
                              <div className="text-sm font-medium">{opt.label}</div>
                              <div className="text-[11px] mt-0.5 opacity-70 leading-snug">{opt.hint}</div>
                            </button>
                          )
                        })}
                      </div>
                    </fieldset>

                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, regret: !d.regret }))}
                      aria-pressed={draft.regret}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border transition-colors text-left",
                        draft.regret
                          ? "bg-rose-500/12 border-rose-500/30 text-rose-200"
                          : "bg-white/[0.025] border-white/[0.07] text-white/55 hover:bg-rose-500/[0.06] hover:border-rose-500/20"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <HeartCrack className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">
                          {draft.regret ? "Marked as regret" : "Mark as regret (optional)"}
                        </span>
                      </span>
                      {draft.regret && <Check className="w-4 h-4 flex-shrink-0" />}
                    </button>
                  </motion.section>
                )}

                {step === 3 && (
                  <motion.section
                    key="step-lesson"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                    aria-labelledby="review-step-lesson"
                  >
                    <div>
                      <h3 id="review-step-lesson" className="text-base font-semibold text-white">
                        What do you carry forward?
                      </h3>
                      <p className="text-xs text-white/45 mt-1 leading-relaxed">
                        If you skip this step, the loop never closes.
                      </p>
                    </div>

                    <div>
                      <FieldLabel htmlFor="review-wrong-assumption">
                        Which assumption was wrong or naive
                      </FieldLabel>
                      <textarea
                        id="review-wrong-assumption"
                        value={draft.wrongAssumption}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, wrongAssumption: e.target.value }))
                        }
                        rows={3}
                        placeholder="I assumed X, but the real shape was Y."
                        className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="review-lesson">
                        Rule or lesson to carry forward
                      </FieldLabel>
                      <textarea
                        id="review-lesson"
                        value={draft.lesson}
                        onChange={(e) => setDraft((d) => ({ ...d, lesson: e.target.value }))}
                        rows={3}
                        placeholder="One sentence. The next time I see this pattern, I will…"
                        className="w-full px-3 py-2.5 bg-white/[0.04] border border-violet-500/25 rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 resize-none leading-relaxed"
                      />
                    </div>

                    {!canSave && (
                      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-2.5">
                        <p className="text-[11px] font-mono text-amber-300/80 uppercase tracking-wider">
                          Still needed
                        </p>
                        <ul className="text-xs text-white/55 mt-1 list-disc list-inside space-y-0.5">
                          {!draft.whatHappened.trim() && <li>What actually happened</li>}
                          {!draft.outcome && <li>Outcome quality</li>}
                          {!draft.processQuality && <li>Process quality</li>}
                        </ul>
                      </div>
                    )}
                  </motion.section>
                )}
              </AnimatePresence>
            </div>

            <footer className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-white/[0.06] bg-white/[0.01] flex-shrink-0">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prev}
                  className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono text-white/55 uppercase tracking-wider hover:text-white/80 transition-colors min-h-[40px]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              ) : (
                <div />
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={next}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-200 text-[11px] font-mono uppercase tracking-wider hover:bg-violet-500/15 transition-colors min-h-[40px]"
                >
                  Continue <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-colors min-h-[40px] border",
                    canSave
                      ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/20"
                      : "bg-white/[0.04] border-white/[0.08] text-white/35 cursor-not-allowed"
                  )}
                >
                  <Check className="w-3.5 h-3.5" /> Save Review
                </button>
              )}
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
