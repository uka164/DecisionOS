"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Copy, Download, Check, FileText } from "lucide-react"

interface RFCExportModalProps {
  isOpen: boolean
  onClose: () => void
  decision: {
    title: string
    context: string
    proposal: string
    tradeoffs: string
    decision: string
  }
}

export function RFCExportModal({ isOpen, onClose, decision }: RFCExportModalProps) {
  const [copied, setCopied] = useState(false)

  const generateRFC = () => {
    const date = new Date().toISOString().split("T")[0]
    return `# RFC: ${decision.title}

**Date:** ${date}  
**Status:** Proposed  
**Author:** [Your Name]

---

## Context

${decision.context}

---

## Proposal

${decision.proposal}

---

## Trade-offs

${decision.tradeoffs}

---

## Decision

${decision.decision}

---

## Consequences

_To be filled after implementation._

---

## References

- [Related Doc 1]
- [Related Doc 2]
`
  }

  const rfcContent = generateRFC()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rfcContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([rfcContent], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rfc-${decision.title.toLowerCase().replace(/\s+/g, "-")}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] max-w-[95vw] max-h-[85vh] z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rfc-modal-title"
          >
            <div className="bg-bg-card backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2
                      id="rfc-modal-title"
                      className="text-lg font-semibold text-white"
                    >
                      Export as RFC
                    </h2>
                    <p className="text-xs text-white/40">
                      Ready for team review
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <pre className="font-mono text-sm text-white/70 bg-white/5 border border-white/10 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">
                  {rfcContent}
                </pre>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy to Clipboard</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary hover:bg-cyan-500/30 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .md</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Demo trigger button for integration
export function RFCExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all text-xs"
    >
      <FileText className="w-3.5 h-3.5" />
      <span>Export RFC</span>
    </button>
  )
}
