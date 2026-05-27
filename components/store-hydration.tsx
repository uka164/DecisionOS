"use client"

import { useEffect, useRef } from "react"
import { hydrateAllStores } from "@/stores"

/**
 * Client component that hydrates all Zustand stores from localStorage on mount.
 * Must be rendered once, at the top of the component tree (inside layout.tsx).
 */
export function StoreHydration() {
  const hydrated = useRef(false)

  useEffect(() => {
    if (!hydrated.current) {
      hydrateAllStores()
      hydrated.current = true
    }
  }, [])

  return null
}
