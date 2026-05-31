"use client"

import { Command } from "lucide-react"

export function CmdKHint() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-white/55 flex items-center gap-2">
      <Command className="w-3 h-3" />
      <span>Press <kbd className="font-mono">K</kbd> for command palette</span>
    </div>
  )
}
