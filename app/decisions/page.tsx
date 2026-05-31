"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import dynamic from "next/dynamic"
import { Search, X, SlidersHorizontal, LayoutList, Network } from "lucide-react"
import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { ThinkingCards } from "@/components/dashboard/thinking-cards"

// Lazy-load the relationship map only when the user switches to map view.
const NeuralMapView = dynamic(
  () => import("@/components/views/neural-map-view").then((m) => ({ default: m.NeuralMapView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    ),
  }
)
import { useDecisionsStore } from "@/stores"
import { useFilterState } from "@/hooks/useFilterState"
import {
  filterDecisions,
  getAvailableTags,
  getAvailableStatuses,
} from "@/lib/utils/filterDecisions"
import { cn } from "@/lib/utils"
import type { DecisionStatus } from "@/lib/types"

const STATUS_LABELS: Record<DecisionStatus, string> = {
  draft:         "Draft",
  "in-progress": "In Progress",
  decided:       "Decided",
  archived:      "Archived",
  voided:        "Voided",
  superseded:    "Superseded",
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-14 h-14 mb-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <SlidersHorizontal className="w-6 h-6 text-white/55" />
      </div>
      <p className="text-white/60 text-base mb-1">No decisions match your filters.</p>
      <p className="text-white/55 text-sm mb-5">
        {hasFilters ? "Clear filters or create a new one." : "Create your first decision to get started."}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-colors text-sm"
          aria-label="Clear all filters"
        >
          <X className="w-4 h-4" />
          Clear Filters
        </button>
      )}
    </div>
  )
}

function ViewToggle({ view, onChange }: { view: "list" | "map"; onChange: (v: "list" | "map") => void }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
      <button
        onClick={() => onChange("list")}
        aria-pressed={view === "list"}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
          view === "list"
            ? "bg-white/10 text-white shadow-sm"
            : "text-white/55 hover:text-white/60"
        )}
      >
        <LayoutList className="w-3.5 h-3.5" />
        List
      </button>
      <button
        onClick={() => onChange("map")}
        aria-pressed={view === "map"}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
          view === "map"
            ? "bg-white/10 text-white shadow-sm"
            : "text-white/55 hover:text-white/60"
        )}
      >
        <Network className="w-3.5 h-3.5" />
        Relationship Map
      </button>
    </div>
  )
}

function DecisionsContent() {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  const rawView = params.get("view")
  const view: "list" | "map" = rawView === "map" ? "map" : "list"

  const setView = (next: "list" | "map") => {
    const p = new URLSearchParams(params.toString())
    if (next === "list") p.delete("view")
    else p.set("view", "map")
    router.replace(`${pathname}?${p.toString()}`, { scroll: false })
  }

  const decisions = useDecisionsStore((s) => s.decisions)
  const isLoading = useDecisionsStore((s) => s.isLoading)
  const error = useDecisionsStore((s) => s.error)
  const { filters, debouncedFilters, setSearch, toggleTag, toggleStatus, resetFilters } = useFilterState()

  const availableTags      = getAvailableTags(decisions)
  const availableStatuses  = getAvailableStatuses(decisions)
  const filtered           = filterDecisions(decisions, debouncedFilters)
  const hasFilters =
    filters.search.length > 0 ||
    filters.tags.length > 0 ||
    filters.statuses.length > 0

  if (isLoading) return <div className="py-24 text-center text-white/55 text-sm">Loading decisions…</div>
  if (error)     return <div className="py-24 text-center text-destructive text-sm">Error: {error}</div>

  return (
    <div className={view === "map" ? "h-[calc(100vh-4rem)] lg:h-screen flex flex-col" : "p-4 sm:p-6 space-y-5"}>

      {/* Header — always visible */}
      <header className={cn(
        "flex items-start justify-between",
        view === "map" && "flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6"
      )}>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Decisions</h1>
          <p className="text-white/50 text-sm mt-1">
            {view === "list"
              ? `${filtered.length} of ${decisions.length} decision${decisions.length !== 1 ? "s" : ""}`
              : `${decisions.length} decision${decisions.length !== 1 ? "s" : ""} in relationship map`}
          </p>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </header>

      {/* Filter bar — list view only */}
      {view === "list" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/55 pointer-events-none" />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or thinking…"
              aria-label="Search decisions"
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-primary/50 focus:bg-surface-3 transition-all"
            />
            {filters.search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5 text-white/55" />
              </button>
            )}
          </div>

          {(availableTags.length > 0 || availableStatuses.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  aria-pressed={filters.tags.includes(tag)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all min-h-[32px] ${
                    filters.tags.includes(tag)
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"
                  }`}
                >
                  {tag}
                </button>
              ))}
              {availableStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  aria-pressed={filters.statuses.includes(status)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all min-h-[32px] ${
                    filters.statuses.includes(status)
                      ? "bg-secondary/20 border-secondary/40 text-secondary"
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/5 text-white/55 hover:text-white/60 transition-colors min-h-[32px]"
                  aria-label="Reset all filters"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {view === "map" ? (
        <div className="flex-1 min-h-0">
          <NeuralMapView />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={resetFilters} />
      ) : (
        <ThinkingCards decisions={filtered} />
      )}
    </div>
  )
}

export default function DecisionsPage() {
  return (
    <div className="min-h-screen mesh-gradient">
      <MobileNav />
      <div className="hidden lg:block">
        <LeftSidebar />
      </div>
      <main className="pt-16 lg:pt-0 lg:ml-64 min-h-screen">
        <Suspense fallback={<div className="py-24 text-center text-white/55 text-sm">Loading…</div>}>
          <DecisionsContent />
        </Suspense>
      </main>
    </div>
  )
}
