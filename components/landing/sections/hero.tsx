"use client"

import { useRef } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion"
import { Container, GridBackdrop, EASE_OUT } from "../primitives"
import { CTAButton } from "../cta-button"

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })
  const visualY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 64])
  const visualOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.45])

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
        className="pointer-events-none absolute -top-40 left-[10%] h-[520px] w-[720px] rounded-full opacity-35 blur-[140px]"
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
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-14 xl:gap-20">
          {/* ── copy ── */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-1 px-3.5 py-1.5 backdrop-blur-md"
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
              className="mt-7 max-w-xl text-balance text-[2.55rem] font-semibold leading-[1.05] text-white sm:text-[3.4rem] lg:text-[3.5rem] xl:text-[3.95rem]"
            >
              A private journal for{" "}
              <span className="bg-gradient-to-r from-white via-primary to-secondary bg-clip-text text-transparent">
                better decisions.
              </span>
            </motion.h1>

            <motion.p
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.12 }}
              className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-white/62 sm:text-lg"
            >
              DecisionOS helps you record the decision, schedule the revisit,
              and write down what your reasoning got wrong.
            </motion.p>

            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.18 }}
              className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row lg:justify-start"
            >
              <CTAButton href="/app" variant="primary" size="lg" className="w-full sm:w-auto">
                Open app
              </CTAButton>
              <CTAButton href="#how" variant="secondary" size="lg" icon="play" className="w-full sm:w-auto">
                Watch walkthrough
              </CTAButton>
            </motion.div>
          </div>

          {/* ── cinematic intelligence visual ── */}
          <motion.div
            style={{ y: visualY, opacity: visualOpacity }}
            className="relative mx-auto w-full max-w-xl lg:max-w-none"
          >
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE_OUT, delay: 0.2 }}
              className="relative"
            >
              {/* soft glow seating the panel into the page */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] opacity-70 blur-2xl"
                style={{
                  background:
                    "radial-gradient(60% 60% at 60% 40%, var(--primary-glow), transparent 70%)",
                }}
              />
              <div className="relative overflow-hidden rounded-2xl border border-hairline bg-bg-card/60 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.04]">
                <div className="relative aspect-[16/11] w-full sm:aspect-[16/10] lg:aspect-[5/6] xl:aspect-[16/14]">
                  <Image
                    src="/visuals/intelligence.jpg"
                    alt="An abstract map of connected decisions — the reasoning at the core of DecisionOS"
                    fill
                    priority
                    sizes="(min-width: 1024px) 46vw, 100vw"
                    className="object-cover object-center"
                  />
                </div>
                {/* tonal blend: melt edges into the dark page, keep center calm */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(2,4,8,0.32) 0%, transparent 22%, transparent 70%, rgba(2,4,8,0.55) 100%)",
                  }}
                />
                {/* quiet caption — context without spectacle */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2.5 px-5 pb-4">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary shadow-[0_0_10px_var(--primary-glow)]" />
                  <span className="font-mono text-[11px] uppercase tracking-wide text-white/55">
                    Reasoning, linked and remembered
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </Container>

      {/* fade into next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-bg-body"
      />
    </section>
  )
}
