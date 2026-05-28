"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion"
import { Container, GridBackdrop, EASE_OUT } from "../primitives"
import { CTAButton } from "../cta-button"
import { WorkspaceMock } from "../workspace-mock"

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })
  const mockY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 80])
  const mockOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.35])

  return (
    <section
      id="top"
      ref={ref}
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pb-[4.5rem] pt-28 sm:pb-24 sm:pt-[8.5rem]"
    >
      {/* ambient backdrop */}
      <GridBackdrop />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-35 blur-[140px]"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--mesh-1), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-[-10%] h-[480px] w-[620px] rounded-full opacity-30 blur-[150px]"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--mesh-2), transparent 70%)",
        }}
      />

      <Container className="relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-3.5 py-1.5 backdrop-blur-md"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-35" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-[11px] uppercase text-white/60">
              Now in private beta
            </span>
          </motion.div>

          <motion.h1
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.05 }}
            className="mt-7 text-balance text-[2.55rem] font-semibold leading-[1.05] text-white sm:text-6xl lg:text-[4.35rem]"
          >
            The operating system for{" "}
            <span className="bg-gradient-to-r from-white via-primary to-secondary bg-clip-text text-transparent">
              organizational intelligence.
            </span>
          </motion.h1>

          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.12 }}
            className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-white/62 sm:text-lg"
          >
            DecisionOS helps teams reason clearly, prioritize what matters,
            preserve context, and execute with alignment.
          </motion.p>

          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.18 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <CTAButton href="#request" variant="primary" size="lg" className="w-full sm:w-auto">
              Request access
            </CTAButton>
            <CTAButton href="#how" variant="secondary" size="lg" icon="play" className="w-full sm:w-auto">
              Watch walkthrough
            </CTAButton>
          </motion.div>
        </div>

        {/* product preview emerging below the headline */}
        <motion.div
          style={{ y: mockY, opacity: mockOpacity }}
          className="relative mx-auto mt-14 max-w-5xl sm:mt-[4.5rem]"
        >
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, ease: EASE_OUT, delay: 0.22 }}
          >
            <WorkspaceMock />
          </motion.div>
        </motion.div>
      </Container>

      {/* fade into next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-bg-body"
      />
    </section>
  )
}
