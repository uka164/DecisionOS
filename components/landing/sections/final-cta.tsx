"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check } from "lucide-react"
import { Container, Section, Eyebrow, Heading, Reveal, GridBackdrop, EASE_OUT } from "../primitives"
import { CTAButton } from "../cta-button"
import { WorkspaceMock } from "../workspace-mock"

export function FinalCTA() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
  }

  return (
    <Section id="request" className="relative overflow-hidden">
      <GridBackdrop />
      {/* product layers aligning, faded behind */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-10 mx-auto hidden max-w-4xl opacity-[0.12] blur-[2px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)] lg:block"
      >
        <WorkspaceMock />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[760px] -translate-x-1/2 rounded-full opacity-[0.32] blur-[150px]"
        style={{ background: "radial-gradient(ellipse, var(--mesh-1), transparent 70%)" }}
      />

      <Container className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow index="13" className="justify-center">
              Get started
            </Eyebrow>
            <Heading
              as="h2"
              className="mt-5 text-[2.2rem] leading-[1.08] sm:text-5xl lg:text-[3.4rem]"
            >
              Give your organization a memory for decisions.
            </Heading>
            <p className="mx-auto mt-6 max-w-lg text-pretty text-base leading-relaxed text-white/55 sm:text-lg">
              Start with one team, one strategic workflow, and one persistent
              system for reasoning to execution.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-10">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="done"
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                  className="mx-auto flex max-w-md items-center justify-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-5 py-3.5"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span className="text-sm text-white/85">
                    You&apos;re on the list — we&apos;ll be in touch shortly.
                  </span>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={onSubmit}
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mx-auto flex max-w-md flex-col gap-2.5 sm:flex-row"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    aria-label="Work email"
                    className="h-12 flex-1 rounded-full border border-white/12 bg-white/[0.03] px-5 text-sm text-white placeholder:text-white/35 backdrop-blur-md transition-colors focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                  <button
                    type="submit"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-[0_8px_26px_-12px_var(--primary-glow)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_12px_34px_-14px_var(--primary-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-body"
                  >
                    Request access
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="mt-5 flex items-center justify-center gap-4">
              <CTAButton href="#how" variant="ghost" icon="play">
                Watch walkthrough
              </CTAButton>
            </div>
            <p className="mt-6 text-xs text-white/30">
              Private beta · No spam · One strategic workflow to start
            </p>
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}
