"use client"

import type { ReactNode } from "react"
import { ArrowRight, Play } from "lucide-react"
import { cn } from "@/lib/utils"

type Variant = "primary" | "secondary" | "ghost"

const BASE =
  "group relative inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-body select-none"

const SIZES = {
  md: "h-11 px-5",
  lg: "h-12 px-6 text-[15px]",
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-[0_8px_26px_-12px_var(--primary-glow)] hover:shadow-[0_12px_34px_-14px_var(--primary-glow)] hover:-translate-y-px",
  secondary:
    "border border-white/[0.14] bg-white/[0.025] text-white backdrop-blur-md hover:border-white/[0.24] hover:bg-white/[0.05]",
  ghost: "text-white/70 hover:text-white",
}

export function CTAButton({
  children,
  variant = "primary",
  size = "md",
  href,
  onClick,
  icon = "arrow",
  className,
}: {
  children: ReactNode
  variant?: Variant
  size?: "md" | "lg"
  href?: string
  onClick?: () => void
  icon?: "arrow" | "play" | "none"
  className?: string
}) {
  const classes = cn(BASE, SIZES[size], VARIANTS[variant], className)

  const inner = (
    <>
      {icon === "play" && (
        <Play className="h-3.5 w-3.5 fill-current opacity-80" aria-hidden />
      )}
      <span>{children}</span>
      {icon === "arrow" && (
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
          aria-hidden
        />
      )}
    </>
  )

  if (href) {
    return (
      <a href={href} onClick={onClick} className={classes}>
        {inner}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {inner}
    </button>
  )
}
