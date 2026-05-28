"use client"

import { toast } from "sonner"
import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { ControlDeckSettings } from "@/components/views/control-deck-settings"
import { useDecisionsStore, useSettingsStore, clearAllStores, importStoreData } from "@/stores"
import { store } from "@/lib/store"
import { isPersistableDecision } from "@/lib/mock-data"

function triggerJSONDownload() {
  const json = store.exportJSON()
  const blob = new Blob([json], { type: "application/json" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `decisionos-export-${new Date().toISOString().split("T")[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success("Exported successfully")
}

export default function SettingsPage() {
  const decisions = useDecisionsStore((s) => s.decisions)
  const isLoading = useDecisionsStore((s) => s.isLoading)
  const error = useDecisionsStore((s) => s.error)
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const localDecisionCount = decisions.filter(isPersistableDecision).length

  const handleImport = async (file: File, mode: "overwrite" | "merge") => {
    const result = await importStoreData(file, mode)
    if (result.ok) {
      const parts: string[] = []
      if (result.added > 0) parts.push(`${result.added} added`)
      if (result.updated > 0) parts.push(`${result.updated} updated`)
      toast.success("Import complete", {
        description: parts.length > 0 ? parts.join(", ") : "No changes",
      })
    } else {
      toast.error("Import failed", {
        description: "Invalid or corrupted JSON file.",
      })
    }
    return result
  }

  return (
    <div className="min-h-screen mesh-gradient">
      <MobileNav />
      <div className="hidden lg:block">
        <LeftSidebar />
      </div>
      <main className="pt-16 lg:pt-0 lg:ml-64 min-h-screen">
        {isLoading ? (
          <div className="py-24 text-center text-white/40 text-sm">Loading settings…</div>
        ) : error ? (
          <div className="py-24 text-center text-destructive text-sm">Error: {error}</div>
        ) : (
          <ControlDeckSettings
            decisionCount={localDecisionCount}
            settings={settings}
            onUpdateSettings={updateSettings}
            onExportData={triggerJSONDownload}
            onImportData={handleImport}
            onClearData={clearAllStores}
          />
        )}
      </main>
    </div>
  )
}
