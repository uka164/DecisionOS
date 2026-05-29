"use client"

import { useLayoutEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CTAButton } from "./cta-button"

export function MobileCTA() {
  const [pastHero, setPastHero] = useState(false)
  const [endInView, setEndInView] = useState(false)

  useLayoutEffect(() => {
    const onScroll = () =>
      setPastHero(window.scrollY > window.innerHeight * 0.85)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Hide once the closing zone (final CTA or footer — both carry their own CTA)
  // is on screen, so the bar never floats over content that already invites action.
  useLayoutEffect(() => {
    const targets = ["request", "site-footer"]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (targets.length === 0) return

    const onScreen = new Set<Element>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target)
          else onScreen.delete(entry.target)
        }
        setEndInView(onScreen.size > 0)
      },
      { rootMargin: "0px 0px -25% 0px" }
    )
    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [])

  const visible = pastHero && !endInView

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={false}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-bg-body/85 px-4 py-3 backdrop-blur-xl md:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <CTAButton href="/app" variant="primary" size="lg" className="w-full">
            Open app
          </CTAButton>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
