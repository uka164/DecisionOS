"use client"

import { useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, CalendarClock } from "lucide-react"
import { toast } from "sonner"
import { useDecisionsStore } from "@/stores"
import { useWizard } from "@/contexts/WizardContext"
import { useNow } from "@/hooks/useNow"
import { useRevisitNotifications } from "@/hooks/useRevisitNotifications"
import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { RightSidebar } from "@/components/dashboard/right-sidebar"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { DecisionInsights } from "@/components/dashboard/decision-insights"
import { NextHonestAction } from "@/components/dashboard/next-honest-action"
import { BlindSpots } from "@/components/dashboard/blind-spots"
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
  const now = useNow()
  useRevisitNotifications()

  const isExampleOnly = useMemo(
    () => decisions.length > 0 && decisions.every((d) => d.id.startsWith("static-")),
    [decisions]
  )

  const inProgressCount = useMemo(
    () => decisions.filter((d) => d.status === "in-progress" || d.status === "draft").length,
    [decisions]
  )

  const overdueDecisions = useMemo(
    () =>
      now == null
        ? []
        : decisions.filter((d) => d.revisitAt && new Date(d.revisitAt).getTime() < now),
    [decisions, now]
  )

  // Check for overdue revisits and surface a single toast per session
  useEffect(() => {
    if (revisitToastShown.current || isLoading || overdueDecisions.length === 0) return
    if (window.matchMedia("(max-width: 639px)").matches) return

      revisitToastShown.current = true
      toast(`${overdueDecisions.length} decision${overdueDecisions.length !== 1 ? "s" : ""} need a revisit`, {
        description: overdueDecisions.length === 1 ? `"${overdueDecisions[0].title}"` : "Check the Revisit Queue in the sidebar.",
        duration: 6000,
        action: {
          label: "Review",
          onClick: () => router.push(`/decisions/${overdueDecisions[0].id}?focus=review`),
        },
      })
  }, [overdueDecisions, isLoading, router])

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
              {/* First-time user banner — written for the person who suspects they repeat the same mistake */}
              {isExampleOnly && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6 max-w-2xl">
                  <p className="text-xs text-white/40">For when you can already feel the pattern.</p>
                  <h2 className="mt-2 text-xl font-semibold text-white leading-snug text-balance">
                    Write down the decision you're about to make.
                  </h2>
                  <p className="mt-2 text-sm text-white/55 leading-relaxed text-pretty">
                    Then set a date to come back. When that day arrives, this is the tool that
                    forces you to write what was wrong about your reasoning — not just whether it
                    worked. That's the only loop that ever changes anything.
                  </p>
                  <button
                    onClick={open}
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                  >
                    Log a decision
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="mt-4 text-xs text-white/30">
                    Everything stays in this browser. No account. No sync. The decisions below are examples — yours don't appear in this view until you log one.
                  </p>
                </div>
              )}

              {!isExampleOnly && <NextHonestAction />}
              <DashboardStats decisions={decisions} />
              {overdueDecisions.length > 0 && (
                <button
                  onClick={() => router.push(`/decisions/${overdueDecisions[0].id}?focus=review`)}
                  className="sm:hidden w-full flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-left"
                >
                  <CalendarClock className="w-4 h-4 text-violet-300 mt-0.5 flex-shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-white">
                      {overdueDecisions.length} revisit{overdueDecisions.length !== 1 ? "s" : ""} due
                    </span>
                    <span className="block truncate text-xs text-white/45">
                      {overdueDecisions[0].title}
                    </span>
                  </span>
                </button>
              )}
              <BlindSpots />
              <DecisionInsights />
              <ThinkingCards decisions={decisions} limit={3} title="Recent Decisions" />
              <DecisionTimeline decisions={decisions} />

              {!isExampleOnly && decisions.length > 0 && inProgressCount > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-1 h-8 rounded-full bg-primary/40 flex-shrink-0" />
                  <p className="text-sm text-white/50 flex-1">
                    {inProgressCount} decision{inProgressCount > 1 ? "s" : ""} still open.
                  </p>
                  <button
                    onClick={() => router.push("/decisions")}
                    className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors flex-shrink-0"
                  >
                    View
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
