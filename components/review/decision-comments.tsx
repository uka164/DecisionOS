"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, CornerDownLeft, X, Sparkles } from "lucide-react"
import { useDecisionsStore } from "@/stores"
import { getInitials, useDisplayName } from "@/lib/identity"
import { staggerContainer, riseItemLight, SPRING_SETTLE } from "@/lib/motion"
import type { Decision } from "@/lib/types"
import { cn } from "@/lib/utils"

function relTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function DecisionComments({ decision }: { decision: Decision }) {
  const addComment = useDecisionsStore((s) => s.addComment)
  const deleteComment = useDecisionsStore((s) => s.deleteComment)
  const me = useDisplayName()

  const comments = decision.comments ?? []
  const decisiveQuestion = decision.aiCritique?.decisiveQuestion
  const alreadyAnswered = comments.some((c) => c.answersDecisiveQuestion)

  const [draft, setDraft] = useState("")
  const [answering, setAnswering] = useState(false)

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    addComment(decision.id, text, answering)
    setDraft("")
    setAnswering(false)
  }

  return (
    <section id="discussion-section" className="rounded-2xl border border-hairline bg-surface-2 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="label-eyebrow flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          Discussion
        </h2>
        {comments.length > 0 && (
          <span className="text-readout text-xs text-white/55">{comments.length}</span>
        )}
      </div>

      {/* Tie-in: the AI's decisive question is something to answer here. */}
      {decisiveQuestion && !alreadyAnswered && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary/80" />
          <div className="min-w-0">
            <p className="label-eyebrow text-primary/80">The AI asked</p>
            <p className="mt-1 text-sm leading-relaxed text-white/80">{decisiveQuestion}</p>
            <button
              onClick={() => {
                setAnswering(true)
                document.getElementById("comment-input")?.focus()
              }}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              Answer it →
            </button>
          </div>
        </div>
      )}

      {/* Thread */}
      {comments.length > 0 ? (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mb-4 space-y-3"
        >
          {comments.map((c) => {
            const mine = c.author === me
            return (
              <motion.li key={c.id} variants={riseItemLight} className="group flex gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                    mine
                      ? "border-secondary/35 bg-secondary/20 text-secondary"
                      : "border-hairline-strong bg-surface-3 text-white/70"
                  )}
                  aria-hidden
                >
                  {getInitials(c.author)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/85">{c.author}</span>
                    <span className="text-xs text-white/50">{relTime(c.createdAt)}</span>
                    {c.answersDecisiveQuestion && (
                      <span className="label-eyebrow rounded border border-primary/25 bg-primary/10 px-1.5 py-px text-primary/80">
                        answers AI
                      </span>
                    )}
                    {mine && (
                      <button
                        onClick={() => deleteComment(decision.id, c.id)}
                        className="ml-auto text-white/30 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        aria-label="Delete comment"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                    {c.text}
                  </p>
                </div>
              </motion.li>
            )
          })}
        </motion.ul>
      ) : (
        <p className="mb-4 text-sm text-white/55">
          No comments yet. Add context for future-you — or, on a shared instance, for whoever else
          weighs in.
        </p>
      )}

      {/* Composer */}
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-secondary/35 bg-secondary/20 text-[11px] font-semibold text-secondary"
          aria-hidden
        >
          {getInitials(me)}
        </div>
        <div className="min-w-0 flex-1">
          <textarea
            id="comment-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                submit()
              }
            }}
            rows={2}
            placeholder={`Comment as ${me}…`}
            aria-label="Add a comment"
            className="w-full resize-none rounded-xl border border-hairline bg-surface-1 px-3 py-2 text-sm leading-relaxed text-white placeholder:text-white/45 transition-colors focus:border-secondary/40 focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <AnimatePresence mode="wait">
              {answering && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={SPRING_SETTLE}
                  className="flex items-center gap-1.5 text-xs text-primary/80"
                >
                  <Sparkles className="h-3 w-3" />
                  Answering the AI&apos;s question
                  <button
                    onClick={() => setAnswering(false)}
                    className="text-primary/60 hover:text-primary"
                    aria-label="Don't tag as answer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.span>
              )}
            </AnimatePresence>
            <button
              onClick={submit}
              disabled={!draft.trim()}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-secondary/35 bg-secondary/15 px-3 py-1.5 text-sm font-medium text-secondary transition-colors hover:bg-secondary/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Comment
              <kbd className="ml-0.5 hidden items-center gap-0.5 text-xs text-secondary/70 sm:inline-flex">
                <CornerDownLeft className="h-3 w-3" />
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
