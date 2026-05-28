"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Container, Section, Eyebrow, Reveal, EASE_OUT } from "../primitives"
import { CTAButton } from "../cta-button"

const QUOTES = [
  {
    quote:
      "We stopped having the same argument every quarter. The reasoning behind each call is just there when we need it.",
    name: "Head of Product",
    role: "Series B SaaS",
    initials: "HP",
  },
  {
    quote:
      "Leadership reviews went from circular debates to decisions with clear owners and a reason we can point to later.",
    name: "Chief Operating Officer",
    role: "Fintech",
    initials: "CO",
  },
  {
    quote:
      "Six months in, new hires can read exactly why we chose what we chose. That context is the real unlock.",
    name: "Founder",
    role: "AI infrastructure",
    initials: "F",
  },
  {
    quote:
      "Prioritization stopped being a fight about opinions and became a conversation about weights everyone could see.",
    name: "VP Engineering",
    role: "Marketplace",
    initials: "VE",
  },
]

const OUTCOMES = ["Fewer circular meetings", "Clearer priorities", "Preserved reasoning"]

export function SocialProof() {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (reduce || paused) return
    const id = setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), 6000)
    return () => clearInterval(id)
  }, [reduce, paused])

  const active = QUOTES[index]

  return (
    <Section id="proof">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow index="11" className="justify-center">
              Why teams switch
            </Eyebrow>
          </Reveal>

          <Reveal delay={0.05}>
            <div
              className="relative mt-10 min-h-[220px] sm:min-h-[200px]"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={index}
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                >
                  <p className="text-balance text-xl font-light leading-snug text-white/90 sm:text-2xl lg:text-[1.85rem]">
                    &ldquo;{active.quote}&rdquo;
                  </p>
                  <footer className="mt-7 flex items-center justify-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] font-mono text-xs text-white/60">
                      {active.initials}
                    </span>
                    <span className="text-left">
                      <span className="block text-sm font-medium text-white">
                        {active.name}
                      </span>
                      <span className="block text-xs text-white/45">{active.role}</span>
                    </span>
                  </footer>
                </motion.blockquote>
              </AnimatePresence>
            </div>
          </Reveal>

          {/* dots */}
          <div className="mt-6 flex justify-center gap-2">
            {QUOTES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show quote ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-primary" : "w-1.5 bg-white/20 hover:bg-white/40"
                )}
              />
            ))}
          </div>

          {/* outcomes + cta */}
          <Reveal delay={0.1} className="mt-12">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {OUTCOMES.map((o) => (
                <span
                  key={o}
                  className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3.5 py-1.5 text-xs text-white/60"
                >
                  {o}
                </span>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <CTAButton href="/app" variant="primary" icon="arrow">
                Open app
              </CTAButton>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}
