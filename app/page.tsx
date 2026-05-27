"use client"

import { useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Flame } from "lucide-react"
import { toast } from "sonner"
import { useDecisionsStore } from "@/stores"
import { useWizard } from "@/contexts/WizardContext"
import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { RightSidebar } from "@/components/dashboard/right-sidebar"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { DecisionInsights } from "@/components/dashboard/decision-insights"
import { ThinkingCards } from "@/components/dashboard/thinking-cards"
import { DecisionTimeline } from "@/components/dashboard/decision-timeline"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { CmdKHint } from "@/components/dashboard/cmdk-hint"

export default function DashboardPage() {
  const decisions = useDecisionsStore((s) => s.decisions)
  const isLoading = useDecisionsStore((s) => s.isLoading)
  const error = useDecisionsStore((s) => s.error)
  const { open } = useWizard()
  const router = useRouter()
  const revisitToastShown = useRef(false)

  const isExampleOnly = useMemo(
    () => decisions.length > 0 && decisions.every((d) => d.id.startsWith("static-")),
    [decisions]
  )

  const inProgressCount = useMemo(
    () => decisions.filter((d) => d.status === "in-progress" || d.status === "draft").length,
    [decisions]
  )

  // Check for overdue revisits and surface a single toast per session
  useEffect(() => {
    if (revisitToastShown.current || isLoading || decisions.length === 0) return

    const overdue = decisions.filter(
      (d) => d.revisitAt && new Date(d.revisitAt).getTime() < Date.now()
    )

    if (overdue.length > 0) {
      revisitToastShown.current = true
      toast(`${overdue.length} decision${overdue.length !== 1 ? "s" : ""} need a revisit`, {
        description: overdue.length === 1 ? `"${overdue[0].title}"` : "Check the Revisit Queue in the sidebar.",
        duration: 6000,
        action: {
          label: "View",
          onClick: () => router.push(`/decisions/${overdue[0].id}`),
        },
      })
    }
  }, [decisions, isLoading, router])

  return (
    <div className="min-h-screen mesh-gradient">
      <MobileNav />

      <div className="hidden lg:block">
        <LeftSidebar />
      </div>

      <main className="pt-16 lg:pt-0 lg:ml-64 lg:mr-80 min-h-screen flex flex-col">
        <div className="p-4 sm:p-6 space-y-5 flex-1 pb-12">
          <header className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-white text-balance">Dashboard</h1>
              <p className="text-white/50 text-sm mt-1">
                Your decision journal
              </p>
            </div>
            <div className="hidden sm:block">
              <CmdKHint />
            </div>
          </header>

          {isLoading ? (
            <div className="py-12 text-center text-white/40 text-sm">Loading decisions…</div>
          ) : error ? (
            <div className="py-12 text-center text-rose-400 text-sm">Error: {error}</div>
          ) : (
            <>
              {/* First-time user banner */}
              {isExampleOnly && (
                <div className="rounded-2xl bg-primary/[0.05] border border-primary/15 overflow-hidden">
                  <div className="flex items-start gap-4 p-5">
                    <Flame className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white mb-1">
                        Your private decision journal
                      </p>
                      <p className="text-sm text-white/50 leading-relaxed">
                        Log a decision → set a revisit date → come back and write what you got wrong.
                        That loop, repeated, makes you sharper. Everything stays local — nothing leaves your browser.
                      </p>
                      <button
                        onClick={open}
                        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-all focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none group"
                      >
                        Log your first real decision
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 border-t border-primary/10 divide-x divide-primary/10">
                    {[
                      { step: "1", label: "Log it", sub: "Capture any decision, big or small" },
                      { step: "2", label: "Revisit it", sub: "Schedule a check-in on what happened" },
                      { step: "3", label: "Learn from it", sub: "Write what you got wrong — honestly" },
                    ].map((item) => (
                      <div key={item.step} className="px-4 py-3">
                        <p className="text-[10px] font-mono text-primary/50 mb-0.5">0{item.step}</p>
                        <p className="text-xs font-medium text-white/70">{item.label}</p>
                        <p className="text-[11px] text-white/35 mt-0.5 leading-snug">{item.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DashboardStats decisions={decisions} />
              <DecisionInsights />
              <ThinkingCards decisions={decisions} limit={3} title="Recent Decisions" />
              <DecisionTimeline decisions={decisions} />

              {/* Next action zone */}
              {!isExampleOnly && decisions.length > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-1 h-8 rounded-full bg-primary/40 flex-shrink-0" />
                  <p className="text-sm text-white/50 flex-1">
                    {inProgressCount > 0
                      ? `${inProgressCount} decision${inProgressCount > 1 ? "s" : ""} still open.`
                      : "All caught up. Add a retrospective to any past decision to close the loop."}
                  </p>
                  <button
                    onClick={() => router.push("/decisions")}
                    className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors flex-shrink-0"
                  >
                    {inProgressCount > 0 ? "Review" : "View all"}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <RightSidebar />
    </div>
  )
}
