import { useSettingsStore } from "@/stores"

/** Up to two initials from a display name, for comment avatars. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** The current commenter's display name. Device-local; defaults to "You". */
export function useDisplayName(): string {
  return useSettingsStore((s) => s.settings.displayName?.trim() || "You")
}
