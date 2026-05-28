"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Container, Section, Eyebrow, Heading, Reveal, EASE_OUT } from "../primitives"
import { CTAButton } from "../cta-button"

const FAQS = [
  {
    q: "What exactly is DecisionOS?",
    a: "A private decision journal for recording what you decided, why you decided it, and what you learned when reality answered back.",
  },
  {
    q: "How is this different from docs, wikis, or project tools?",
    a: "Those usually preserve the artifact. DecisionOS preserves the reasoning loop: options, trade-offs, risks, revisit dates, outcomes, and the lesson.",
  },
  {
    q: "How do people actually use it day to day?",
    a: "Capture a decision, structure the options, weigh what matters, set a revisit date, and later write what your original thinking got wrong.",
  },
  {
    q: "Does it make decisions for me?",
    a: "No. It gives your thinking structure. You still decide, and the app keeps the audit trail honest enough to learn from later.",
  },
  {
    q: "How does it improve decision quality over time?",
    a: "Past decisions become evidence. You see repeated assumptions, neglected risks, and the difference between a bad outcome and a bad process.",
  },
  {
    q: "How do I get started?",
    a: "Open the app and log one real decision before you make it. The value appears when you revisit it after the outcome is visible.",
  },
]

export function FAQ() {
  const [open, setOpen] = useState(0)

  return (
    <Section id="faq" className="border-y border-white/[0.05] bg-white/[0.012]">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          {/* heading column */}
          <Reveal>
            <Eyebrow index="12">FAQ</Eyebrow>
            <Heading className="mt-5 text-3xl leading-[1.1] sm:text-4xl">
              Questions, answered.
            </Heading>
            <p className="mt-5 max-w-sm text-pretty text-base leading-relaxed text-white/55">
              What DecisionOS is, how it works locally, and why the revisit
              loop matters more than another note.
            </p>
            <div className="mt-8 hidden lg:block">
              <CTAButton href="/app" variant="secondary" icon="arrow">
                Open app
              </CTAButton>
            </div>
          </Reveal>

          {/* accordion column */}
          <Reveal delay={0.08}>
            <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {FAQS.map((item, i) => {
                const isOpen = open === i
                return (
                  <div key={item.q}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 py-5 text-left"
                    >
                      <span
                        className={cn(
                          "text-base font-medium transition-colors duration-300",
                          isOpen ? "text-white" : "text-white/75"
                        )}
                      >
                        {item.q}
                      </span>
                      <span
                        className={cn(
                          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                          isOpen
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-white/10 text-white/40"
                        )}
                      >
                        <Plus
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-300",
                            isOpen && "rotate-45"
                          )}
                        />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={false}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: EASE_OUT }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-xl pb-6 pr-10 text-pretty text-sm leading-relaxed text-white/55">
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}
