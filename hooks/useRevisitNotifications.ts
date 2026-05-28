"use client"

import { useEffect, useRef } from "react"
import { useDecisionsStore, useSettingsStore } from "@/stores"
import type { Decision } from "@/lib/types"

/**
 * Browser notification driver for due revisits.
 *
 * Local-first constraint: there's no service worker and no background process,
 * so notifications only fire when the app is open or when it regains focus.
 * For each overdue decision we fire one Notification per session — tracked in
 * a ref so the user isn't spammed on every poll.
 *
 * Permission is requested only when the user explicitly opts in via settings;
 * this hook never asks unprompted.
 */

const POLL_MS = 5 * 60 * 1000

function isOverdue(d: Decision, now: number): boolean {
  if (!d.revisitAt) return false
  if (d.review?.completedAt) return false
  return new Date(d.revisitAt).getTime() <= now
}

export function useRevisitNotifications(): void {
  const notifyRevisits = useSettingsStore((s) => s.settings.notifyRevisits)
  const decisions = useDecisionsStore((s) => s.decisions)
  const isLoading = useDecisionsStore((s) => s.isLoading)

  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (isLoading) return
    if (!notifyRevisits) return
    if (typeof window === "undefined") return
    if (!("Notification" in window)) return
    if (Notification.permission !== "granted") return

    const fire = () => {
      const now = Date.now()
      for (const d of decisions) {
        if (d.id.startsWith("static-")) continue
        if (!isOverdue(d, now)) continue
        if (notifiedRef.current.has(d.id)) continue
        notifiedRef.current.add(d.id)
        try {
          const n = new Notification("Decision due for review", {
            body: d.title,
            tag: `revisit-${d.id}`,
            requireInteraction: false,
          })
          n.onclick = () => {
            window.focus()
            window.location.href = `/decisions/${d.id}?focus=review`
            n.close()
          }
        } catch {
          // Some browsers throw if the page is hidden; safe to ignore.
        }
      }
    }

    fire()

    const onFocus = () => fire()
    const onVisibility = () => {
      if (document.visibilityState === "visible") fire()
    }
    const interval = window.setInterval(fire, POLL_MS)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [decisions, isLoading, notifyRevisits])
}

/**
 * Request notification permission. Returns the resulting state.
 * Safe to call from non-secure contexts — falls back to "denied".
 */
export async function requestRevisitNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied"
  }
  if (Notification.permission === "granted") return "granted"
  if (Notification.permission === "denied") return "denied"
  try {
    return await Notification.requestPermission()
  } catch {
    return "denied"
  }
}
