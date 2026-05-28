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
    a: "A system of record for how your team thinks, decides, and executes. Not a chat tool and not another doc — a persistent layer that keeps reasoning, priorities, and outcomes connected over time.",
  },
  {
    q: "How is this different from docs, wikis, or project tools?",
    a: "Those each store a fragment. DecisionOS keeps the whole decision coherent: the reasoning, the trade-offs, the owners, and what actually happened — all linked, so context never goes missing.",
  },
  {
    q: "How do people actually use it day to day?",
    a: "Capture a decision, structure the options, weigh them against criteria you control, assign owners, and set a date to revisit. The reasoning stays attached from first draft to final outcome.",
  },
  {
    q: "Does the AI make decisions for us?",
    a: "No. AI surfaces structure and reasoning; people decide. Every suggestion shows its logic, traces back to its source, and nothing moves forward without human approval.",
  },
  {
    q: "How does it improve decision quality over time?",
    a: "Past decisions become reusable context. New decisions inherit the reasoning behind earlier ones, so your team stops relitigating settled questions and starts compounding what it has already learned.",
  },
  {
    q: "How do we get started?",
    a: "Start with one team and one strategic workflow. Request access and we'll help you stand up your first persistent decision system — from reasoning to execution.",
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
              What DecisionOS is, how teams use it, and how it makes thinking
              and execution compound.
            </p>
            <div className="mt-8 hidden lg:block">
              <CTAButton href="#request" variant="secondary" icon="arrow">
                Request access
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
