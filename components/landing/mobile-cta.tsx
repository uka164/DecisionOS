"use client"

import { useLayoutEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CTAButton } from "./cta-button"

export function MobileCTA() {
  const [pastHero, setPastHero] = useState(false)
  const [requestInView, setRequestInView] = useState(false)

  useLayoutEffect(() => {
    const onScroll = () =>
      setPastHero(window.scrollY > window.innerHeight * 0.85)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useLayoutEffect(() => {
    const target = document.getElementById("request")
    if (!target) return
    const observer = new IntersectionObserver(
      ([entry]) => setRequestInView(entry.isIntersecting),
      { rootMargin: "0px 0px -40% 0px" }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const visible = pastHero && !requestInView

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
