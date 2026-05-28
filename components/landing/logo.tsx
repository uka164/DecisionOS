import { cn } from "@/lib/utils"

/**
 * DecisionOS mark — four stacked layers (reasoning, context, priority,
 * execution) converging to a single node. Reads as a system, not an icon.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn(className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logo-stroke" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--secondary)" />
        </linearGradient>
      </defs>
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="8.5"
        stroke="url(#logo-stroke)"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <path d="M8 11h16" stroke="url(#logo-stroke)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 16h12" stroke="url(#logo-stroke)" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.7" />
      <path d="M8 21h8" stroke="url(#logo-stroke)" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.45" />
      <circle cx="22.5" cy="21" r="2.4" fill="var(--primary)" />
    </svg>
  )
}
