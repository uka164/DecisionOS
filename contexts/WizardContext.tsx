"use client"

import { createContext, useContext, useState } from "react"
import dynamic from "next/dynamic"

// The 4-step wizard is the opt-in "add full structure" path, lazy-loaded only
// when someone actually asks for it. The default front door is the one-box
// QuickCapture (rendered in app-chrome), whose open state lives here so any CTA
// can trigger it.
const NewDecisionWizard = dynamic(
  () => import("@/components/wizards/new-decision-wizard").then((m) => ({ default: m.NewDecisionWizard })),
  { ssr: false }
)

interface WizardContextValue {
  /** Open the heavy 4-step wizard (the deep path). */
  open: () => void
  close: () => void
  /** Open the one-box quick capture (the default new-decision action). */
  openCapture: () => void
  closeCapture: () => void
  captureOpen: boolean
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)

  return (
    <WizardContext.Provider
      value={{
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        openCapture: () => setCaptureOpen(true),
        closeCapture: () => setCaptureOpen(false),
        captureOpen,
      }}
    >
      {children}
      {isOpen && <NewDecisionWizard isOpen={isOpen} onClose={() => setIsOpen(false)} />}
    </WizardContext.Provider>
  )
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error("useWizard must be used inside WizardProvider")
  return ctx
}
