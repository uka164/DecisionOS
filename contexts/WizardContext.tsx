"use client"

import { createContext, useContext, useState } from "react"
import dynamic from "next/dynamic"

// Lazy-load the 52KB wizard component — only downloaded when the user clicks "New Decision"
const NewDecisionWizard = dynamic(
  () => import("@/components/wizards/new-decision-wizard").then((m) => ({ default: m.NewDecisionWizard })),
  { ssr: false }
)

interface WizardContextValue {
  open: () => void
  close: () => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <WizardContext.Provider value={{ open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
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
