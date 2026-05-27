import type { Decision, DecisionStatus } from "@/lib/types"

export interface FilterState {
  search: string
  tags: string[]
  statuses: DecisionStatus[]
}

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  tags: [],
  statuses: [],
}

// Pure filter function

export function filterDecisions(decisions: Decision[], filters: FilterState): Decision[] {
  const needle = filters.search.trim().toLowerCase()

  return decisions.filter((d) => {
    if (needle) {
      const haystack = `${d.title} ${d.rawThinking} ${d.tags.join(" ")} ${d.summary ?? ""} ${d.constraints.join(" ")} ${d.gotWrong ?? ""}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }

    if (filters.tags.length > 0) {
      const hasTag = filters.tags.some((t) => d.tags.includes(t))
      if (!hasTag) return false
    }

    if (filters.statuses.length > 0 && !filters.statuses.includes(d.status)) return false

    return true
  })
}

// URL param serialization

const PARAM = {
  search: "search",
  tags: "tag",
  statuses: "status",
} as const

export function serializeFilters(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.search) params.set(PARAM.search, filters.search)
  filters.tags.forEach((t) => params.append(PARAM.tags, t))
  filters.statuses.forEach((s) => params.append(PARAM.statuses, s))

  return params
}

export function deserializeFilters(params: URLSearchParams): FilterState {
  return {
    search: params.get(PARAM.search) ?? "",
    tags: params.getAll(PARAM.tags),
    statuses: params.getAll(PARAM.statuses) as DecisionStatus[],
  }
}

// Available facet values derived from a decision list

export function getAvailableTags(decisions: Decision[]): string[] {
  return Array.from(new Set(decisions.flatMap((d) => d.tags))).sort()
}

export function getAvailableStatuses(decisions: Decision[]): DecisionStatus[] {
  return Array.from(new Set(decisions.map((d) => d.status))) as DecisionStatus[]
}
