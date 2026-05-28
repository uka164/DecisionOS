"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Brain, Network, Gauge, GitBranch, Plus } from "lucide-react"
import { Container, Section, Eyebrow, Heading, Reveal, EASE_OUT } from "../primitives"
import { cn } from "@/lib/utils"

const LAYERS = [
  {
    icon: Brain,
    name: "Reasoning Layer",
    line: "Structure messy thinking into clear, comparable decision paths.",
    outcome: "Arguments become legible instead of lost in a thread.",
  },
  {
    icon: Network,
    name: "Context Memory",
    line: "Preserve the why behind every choice — permanently and in context.",
    outcome: "Past reasoning informs the next decision automatically.",
  },
  {
    icon: Gauge,
    name: "Prioritization Engine",
    line: "Rank what matters using explainable, weighted, revisable criteria.",
    outcome: "Focus replaces noise, and trade-offs become visible.",
  },
  {
    icon: GitBranch,
    name: "Execution Graph",
    line: "Connect each decision to owners, milestones, and real outcomes.",
    outcome: "Decisions turn into delivered, tracked work.",
  },
]

export function Category() {
  const [active, setActive] = useState(0)

  return (
    <Section id="system">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow index="02" className="justify-center">
              The system
            </Eyebrow>
            <Heading className="mt-5 text-3xl leading-[1.12] sm:text-4xl lg:text-[2.85rem]">
              DecisionOS connects the way teams think, decide, remember, and act.
            </Heading>
            <p className="mt-5 text-pretty text-base leading-relaxed text-white/55">
              Four layers, one coherent system. Each builds on the one beneath
              it — from raw thinking to executed outcome.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mx-auto mt-14 max-w-3xl">
          <div className="space-y-2.5">
            {LAYERS.map((layer, i) => {
              const Icon = layer.icon
              const isOpen = active === i
              return (
                <button
                  key={layer.name}
                  type="button"
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  aria-expanded={isOpen}
                  className={cn(
                    "block w-full overflow-hidden rounded-lg border text-left transition-colors duration-500",
                    isOpen
                      ? "border-white/[0.14] bg-white/[0.035]"
                      : "border-white/[0.07] bg-white/[0.015] hover:border-white/[0.12]"
                  )}
                >
                  <div className="flex items-center gap-4 px-5 py-4 sm:px-6">
                    <span
                      className={cn(
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border transition-colors duration-500",
                        isOpen
                          ? "border-primary/30 bg-primary/10"
                          : "border-white/[0.08] bg-white/[0.03]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4.5 w-4.5 transition-colors duration-500",
                          isOpen ? "text-primary" : "text-white/45"
                        )}
                        style={{ width: 18, height: 18 }}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-white/30">
                          L{i + 1}
                        </span>
                        <h3
                          className={cn(
                            "text-base font-semibold transition-colors duration-500 sm:text-lg",
                            isOpen ? "text-white" : "text-white/70"
                          )}
                        >
                          {layer.name}
                        </h3>
                      </div>
                    </div>
                    <Plus
                      className={cn(
                        "h-4 w-4 flex-shrink-0 text-white/40 transition-transform duration-500",
                        isOpen && "rotate-45 text-primary"
                      )}
                    />
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={false}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: EASE_OUT }}
                      >
                        <div className="px-5 pb-5 pl-[4.5rem] sm:px-6 sm:pl-[4.75rem]">
                          <p className="text-pretty text-sm leading-relaxed text-white/65">
                            {layer.line}
                          </p>
                          <p className="mt-2 flex items-center gap-2 text-sm text-primary/90">
                            <span className="h-px w-4 bg-primary/50" />
                            {layer.outcome}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              )
            })}
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}
