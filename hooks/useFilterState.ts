"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  FilterState,
  DEFAULT_FILTERS,
  deserializeFilters,
  serializeFilters,
} from "@/lib/utils/filterDecisions"

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export interface UseFilterStateReturn {
  filters: FilterState
  debouncedFilters: FilterState
  setSearch: (value: string) => void
  toggleTag: (tag: string) => void
  toggleStatus: (status: FilterState["statuses"][number]) => void
  resetFilters: () => void
  isPending: boolean
}

export function useFilterState(): UseFilterStateReturn {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [filters, setFilters] = useState<FilterState>(() =>
    deserializeFilters(searchParams)
  )

  const debouncedFilters = useDebounce(filters, 300)

  // Sync debounced state to URL
  useEffect(() => {
    const params = serializeFilters(debouncedFilters)
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }, [debouncedFilters, pathname, router])

  const setSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }))
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }))
  }, [])

  const toggleStatus = useCallback((status: FilterState["statuses"][number]) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  return {
    filters,
    debouncedFilters,
    setSearch,
    toggleTag,
    toggleStatus,
    resetFilters,
    isPending,
  }
}
