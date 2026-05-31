"use client"

import { forwardRef } from "react"
import type { ReactNode } from "react"
import { motion, type Variants } from "framer-motion"
import { cn } from "@/lib/utils"

/* ───────────────────────────────────────────────────────────────────────
   MOTION PRIMITIVES
   The calm, "systems aligning" feel comes from long durations, soft easing,
   and small travel distances. Nothing bounces. Everything settles.
   ─────────────────────────────────────────────────────────────────────── */

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1]

/**
 * Reveal — fades and lifts a block into place when scrolled into view.
 * Honors reduced-motion by collapsing to a plain fade with no travel.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  once = true,
  as = "div",
}: {
  children: ReactNode
  className?: string
  delay?: number
  once?: boolean
  as?: "div" | "section" | "li" | "span"
}) {
  const MotionTag = motion[as] as typeof motion.div

  return (
    <MotionTag
      className={className}
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-12% 0px -12% 0px" }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
    >
      {children}
    </MotionTag>
  )
}

/**
 * Stagger — parent that orchestrates child reveals in sequence.
 * Pair with <StaggerItem>.
 */
export function Stagger({
  children,
  className,
  delay = 0,
  gap = 0.09,
  once = true,
}: {
  children: ReactNode
  className?: string
  delay?: number
  gap?: number
  once?: boolean
}) {
  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: gap, delayChildren: delay },
    },
  }

  return (
    <motion.div
      className={className}
      variants={container}
      initial={false}
      whileInView="show"
      viewport={{ once, margin: "-10% 0px -10% 0px" }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
  y = 22,
}: {
  children: ReactNode
  className?: string
  y?: number
}) {
  const item: Variants = {
    hidden: { opacity: 1, y },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.65, ease: EASE_OUT },
    },
  }
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  )
}

/* ───────────────────────────────────────────────────────────────────────
   LAYOUT PRIMITIVES
   ─────────────────────────────────────────────────────────────────────── */

/** Constrains content to a calm reading measure with consistent gutters. */
export function Container({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1180px] px-6 sm:px-8 lg:px-10", className)}>
      {children}
    </div>
  )
}

/** Vertical section rhythm. Generous breathing room is the point. */
export const Section = forwardRef<
  HTMLElement,
  { children: ReactNode; className?: string; id?: string }
>(function Section({ children, className, id }, ref) {
  return (
    <section
      ref={ref}
      id={id}
      className={cn("relative scroll-mt-24 py-16 sm:py-24 lg:py-28", className)}
    >
      {children}
    </section>
  )
})

/** Mono kicker label that sits above headings. */
export function Eyebrow({
  children,
  className,
  index,
}: {
  children: ReactNode
  className?: string
  index?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 font-mono text-[11px] uppercase text-white/60",
        className
      )}
    >
      {index && <span className="text-primary/80">{index}</span>}
      <span className="h-px w-6 bg-gradient-to-r from-primary/60 to-transparent" />
      <span>{children}</span>
    </div>
  )
}

/** Display heading with balanced wrapping and calm measure. */
export function Heading({
  children,
  className,
  as: As = "h2",
}: {
  children: ReactNode
  className?: string
  as?: "h1" | "h2" | "h3"
}) {
  return (
    <As
      className={cn(
        "text-balance font-semibold text-white",
        className
      )}
    >
      {children}
    </As>
  )
}

/** Soft glass surface used across feature cards. */
export function GlassCard({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-hairline bg-surface-1 backdrop-blur-xl",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]",
        interactive &&
          "transition-colors duration-500 hover:border-hairline-strong hover:bg-surface-2",
        className
      )}
    >
      {children}
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────────────
   GRID BACKDROP — thin architectural lines, barely there
   ─────────────────────────────────────────────────────────────────────── */
export function GridBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }}
    />
  )
}
