"use client"

import { usePathname } from "next/navigation"
import { NeuralBackground } from "@/components/ui/neural-background"
import { CommandPalette } from "@/components/ui/command-palette"
import { QuickCapture } from "@/components/ui/quick-capture"

/**
 * App-only chrome. Excluded on the public landing page (root `/`) so it
 * controls its own background and isn't overlaid with product affordances
 * (quick-capture FAB, command palette). The app lives at `/app` and the other
 * top-level routes (`/decisions`, `/archive`, …).
 */
export function AppChrome() {
  const pathname = usePathname()
  if (pathname === "/") return null

  return (
    <>
      <NeuralBackground />
      <CommandPalette />
      <QuickCapture />
    </>
  )
}
