"use client"

import { Cloud, CloudOff, RefreshCw, AlertTriangle } from "lucide-react"
import { useSyncStore, syncNow } from "@/stores"
import { cn } from "@/lib/utils"
import type { SyncMode } from "@/stores"

const MAP: Record<SyncMode, { icon: React.ElementType; text: string; cls: string }> = {
  local: { icon: CloudOff, text: "On this device", cls: "text-white/55" },
  syncing: { icon: RefreshCw, text: "Syncing…", cls: "text-secondary" },
  synced: { icon: Cloud, text: "Synced", cls: "text-success" },
  error: { icon: AlertTriangle, text: "Sync error", cls: "text-warning" },
}

/** Compact live sync indicator. Click to force a sync. */
export function SyncStatusBadge({ className }: { className?: string }) {
  const mode = useSyncStore((s) => s.mode)
  const m = MAP[mode]
  const Icon = m.icon
  return (
    <button
      onClick={() => syncNow()}
      title="Sync now"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs transition-colors hover:opacity-80",
        m.cls,
        className
      )}
    >
      <Icon className={cn("h-3 w-3", mode === "syncing" && "animate-spin")} aria-hidden />
      {m.text}
    </button>
  )
}
