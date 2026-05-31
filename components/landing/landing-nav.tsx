"use client"

import { useLayoutEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { CTAButton } from "./cta-button"
import { Logo } from "./logo"

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how" },
  { label: "System", href: "#system" },
  { label: "Compare", href: "#compare" },
  { label: "FAQ", href: "#faq" },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useLayoutEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Lock body scroll while the mobile menu is open.
  useLayoutEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [menuOpen])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "transition-all duration-500",
          scrolled
            ? "border-b border-hairline bg-bg-body/70 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <nav className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-6 sm:px-8 lg:px-10">
          <a
            href="#top"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label="DecisionOS home"
          >
            <Logo className="h-7 w-7" />
            <span className="text-[15px] font-semibold text-white">
              Decision<span className="text-white/55">OS</span>
            </span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-white/55 transition-colors duration-200 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <CTAButton href="/app" variant="ghost" icon="none">
              Open app
            </CTAButton>
            <CTAButton href="/app" variant="primary" icon="arrow">
              Open app
            </CTAButton>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-surface-3 md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 top-16 z-40 bg-bg-body/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-8">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  initial={false}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                  className="border-b border-hairline py-4 text-lg text-white/80"
                >
                  {link.label}
                </motion.a>
              ))}
              <div className="mt-6 flex flex-col gap-3">
                <CTAButton
                  href="/app"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => setMenuOpen(false)}
                >
                  Open app
                </CTAButton>
                <CTAButton
                  href="#how"
                  variant="secondary"
                  size="lg"
                  icon="play"
                  className="w-full"
                  onClick={() => setMenuOpen(false)}
                >
                  Watch walkthrough
                </CTAButton>
                <CTAButton
                  href="/app"
                  variant="ghost"
                  size="lg"
                  icon="arrow"
                  className="w-full"
                  onClick={() => setMenuOpen(false)}
                >
                  Open app
                </CTAButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
