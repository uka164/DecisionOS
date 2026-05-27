"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, X, Zap, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { useDecisionsStore } from "@/stores"
import { useWizard } from "@/contexts/WizardContext"
import { cn } from "@/lib/utils"

export function QuickCapture() {
  const router = useRouter()
  const addDecision = useDecisionsStore((s) => s.addDecision)
  const { open: openWizard } = useWizard()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [brainDump, setBrainDump] = useState("")
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setTitle("")
    setBrainDump("")
    setSaving(false)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    reset()
  }, [reset])

  const handleOpen = () => setOpen(true)

  // Focus title when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [open])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) close()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, close])

  const handleCapture = () => {
    const trimmed = title.trim()
    if (!trimmed) return

    setSaving(true)

    const created = addDecision({
      title: trimmed,
      status: "draft",
      impact: 3,
      tags: [],
      rawThinking: brainDump.trim(),
      tradeoffs: [],
      riskLevel: null,
      badges: [],
      options: [],
      constraints: [],
      risks: [],
    })

    toast.success("Decision captured", {
      description: "Saved as draft — open it to add more detail.",
      action: {
        label: "Open",
        onClick: () => router.push(`/decisions/${created.id}`),
      },
    })

    close()
    setSaving(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleCapture()
    }
  }

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={handleOpen}
            aria-label="Quick capture decision"
            className="hidden sm:flex fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-primary border border-primary/50 text-primary-foreground shadow-lg shadow-primary/25 items-center justify-center hover:scale-110 hover:shadow-xl hover:shadow-primary/30 transition-transform duration-150 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Capture modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) close() }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-lg rounded-2xl bg-[#070c18] border border-white/10 p-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-capture-title"
              onKeyDown={handleKeyDown}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <h2 id="quick-capture-title" className="text-sm font-semibold text-white">
                    Quick capture
                  </h2>
                </div>
                <button
                  onClick={close}
                  aria-label="Close"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What decision are you facing?"
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-primary/40 transition-colors"
                />

                <textarea
                  value={brainDump}
                  onChange={(e) => setBrainDump(e.target.value)}
                  placeholder="Brain dump — what's on your mind? (optional)"
                  rows={4}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => { close(); openWizard() }}
                  className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/50 transition-colors"
                >
                  Full wizard
                  <ChevronRight className="w-3 h-3" />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={close}
                    className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/70 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCapture}
                    disabled={!title.trim() || saving}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                      title.trim()
                        ? "bg-primary/15 border-primary/30 text-primary hover:bg-primary/20"
                        : "bg-white/[0.03] border-white/10 text-white/25 cursor-not-allowed"
                    )}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Capture
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
