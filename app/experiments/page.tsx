"use client"

import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { ExperimentLab } from "@/components/views/experiment-lab"
import { useExperimentsStore, useDecisionsStore } from "@/stores"

export default function ExperimentsPage() {
  const experiments = useExperimentsStore((s) => s.experiments)
  const isLoading = useDecisionsStore((s) => s.isLoading)
  const error = useDecisionsStore((s) => s.error)

  return (
    <div className="min-h-screen mesh-gradient">
      <MobileNav />
      <div className="hidden lg:block">
        <LeftSidebar />
      </div>
      <main className="pt-16 lg:pt-0 lg:ml-64 min-h-screen flex flex-col">
        {isLoading ? (
          <div className="py-24 text-center text-white/40 text-sm">Loading experiments…</div>
        ) : error ? (
          <div className="py-24 text-center text-destructive text-sm">Error: {error}</div>
        ) : (
          <ExperimentLab experiments={experiments} />
        )}
      </main>
    </div>
  )
}
