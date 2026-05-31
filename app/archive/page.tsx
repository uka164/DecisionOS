"use client"

import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { ArchiveTimeline } from "@/components/views/archive-timeline"
import { useDecisionsStore } from "@/stores"

export default function ArchivePage() {
  const decisions = useDecisionsStore((s) => s.decisions)
  const updateDecision = useDecisionsStore((s) => s.updateDecision)
  const isLoading = useDecisionsStore((s) => s.isLoading)
  const error = useDecisionsStore((s) => s.error)

  const handleRestore = (id: string) => {
    updateDecision(id, { status: "draft" })
  }

  return (
    <div className="min-h-screen mesh-gradient">
      <MobileNav />
      <div className="hidden lg:block">
        <LeftSidebar />
      </div>
      <main className="pt-16 lg:pt-0 lg:ml-64 min-h-screen">
        {isLoading ? (
          <div className="py-24 text-center text-white/55 text-sm">Loading archive…</div>
        ) : error ? (
          <div className="py-24 text-center text-destructive text-sm">Error: {error}</div>
        ) : (
          <ArchiveTimeline storeDecisions={decisions} onRestore={handleRestore} />
        )}
      </main>
    </div>
  )
}
