"use client"

import { useLayoutEffect } from "react"
import { MotionConfig } from "framer-motion"
import { useSettingsStore } from "@/stores"

export function ThemeApplier({ children }: { children: React.ReactNode }) {
  const settings = useSettingsStore((s) => s.settings)
  const { theme, animationIntensity, reducedMotion } = settings

  useLayoutEffect(() => {
    const html = document.documentElement
    html.setAttribute("data-theme", theme)
    // 0–100 → 0–2 (100% = normal speed 1, slider above centre = slower)
    const speed = animationIntensity / 100
    html.style.setProperty("--anim-speed", String(speed))
    html.setAttribute("data-reduced-motion", String(reducedMotion))
  }, [theme, animationIntensity, reducedMotion])

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>
      {children}
    </MotionConfig>
  )
}
