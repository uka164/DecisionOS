"use client"

import { useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { useDecisionsStore } from "@/stores"
import { useWizard } from "@/contexts/WizardContext"
import { useNow } from "@/hooks/useNow"
import { useRevisitNotifications } from "@/hooks/useRevisitNotifications"
import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { RightSidebar } from "@/components/dashboard/right-sidebar"
import { RevisitDigest } from "@/components/dashboard/revisit-digest"
import { DecisionHealth } from "@/components/dashboard/decision-health"
import { NextHonestAction } from "@/components/dashboard/next-honest-action"
import { Signals } from "@/components/dashboard/signals"
import { ThinkingCards } from "@/components/dashboard/thinking-cards"
import { DecisionTimeline } from "@/components/dashboard/decision-timeline"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { CmdKHint } from "@/components/dashboard/cmdk-hint"

export default function DashboardPage() {
  const decisions = useDecisionsStore((s) => s.decisions)
  const isLoading = useDecisionsStore((s) => s.isLoading)
  const error = useDecisionsStore((s) => s.error)
  const { openCapture } = useWizard()
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
              <h1 className="text-balance text-title text-white">Right Now</h1>
              <p className="text-white/55 text-sm mt-1.5">
                What needs your attention, and what&apos;s quietly decaying.
              </p>
            </div>
            <div className="hidden sm:block">
              <CmdKHint />
            </div>
          </header>

          {isLoading ? (
            <div className="py-12 text-center text-white/55 text-sm">Loading decisions…</div>
          ) : error ? (
            <div className="py-12 text-center text-destructive text-sm">Error: {error}</div>
          ) : (
            <>
              {/* First-time user banner — written for the person who suspects they repeat the same mistake */}
              {isExampleOnly && (
                <div className="max-w-2xl rounded-lg border border-hairline bg-surface-1 p-5 sm:p-6">
                  <p className="text-xs text-white/55">For when you can already feel the pattern.</p>
                  <h2 className="mt-2 text-xl font-semibold text-white leading-snug text-balance">
                    Write down the decision you're about to make.
                  </h2>
                  <p className="mt-2 text-sm text-white/55 leading-relaxed text-pretty">
                    Then set a date to come back. When that day arrives, this is the tool that
                    forces you to write what was wrong about your reasoning — not just whether it
                    worked. That's the only loop that ever changes anything.
                  </p>
                  <button
                    onClick={openCapture}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/[0.12] px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    Log a decision
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="mt-4 text-xs text-white/55">
                    Everything stays in this browser. No account. No sync. The decisions below are examples — yours don't appear in this view until you log one.
                  </p>
                </div>
              )}

              {/* TOP — the one thing that matters now, then a calm health read */}
              {!isExampleOnly && (
                <div className="space-y-5">
                  <NextHonestAction />
                  <DecisionHealth decisions={decisions} />
                </div>
              )}
              {/* The recurring reason to return — overdue + due-soon revisits,
                  with one-tap Review or Snooze. Renders nothing when none due. */}
              {!isExampleOnly && <RevisitDigest />}

              {/* MIDDLE — the single, deduped attention surface */}
              <Signals />

              {/* BOTTOM — what you've been thinking about, and the loop over time */}
              <ThinkingCards decisions={decisions} limit={3} title="Active Memory" />
              <DecisionTimeline decisions={decisions} />

              {!isExampleOnly && decisions.length > 0 && inProgressCount > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-hairline bg-surface-1 p-4">
                  <div className="h-8 w-1 flex-shrink-0 rounded-full bg-primary/35" />
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
