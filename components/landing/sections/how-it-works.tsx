"use client"

import { Inbox, GitCompare, Flag, RefreshCw } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Container,
  Section,
  Eyebrow,
  Heading,
  Reveal,
  Stagger,
  StaggerItem,
} from "../primitives"
import { CTAButton } from "../cta-button"

const STEPS = [
  { icon: Inbox, title: "Capture", line: "Pull in the messy inputs and frame the decision." },
  { icon: GitCompare, title: "Compare", line: "Lay out the options and weigh the trade-offs." },
  { icon: Flag, title: "Commit", line: "Make the call with owners and a rationale you can audit." },
  { icon: RefreshCw, title: "Revisit", line: "Come back on a set date and write what you got wrong." },
]

export function HowItWorks() {
  const reduce = useReducedMotion()

  return (
    <Section id="how">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow index="03" className="justify-center">
              How it works
            </Eyebrow>
            <Heading className="mt-5 text-3xl leading-[1.12] sm:text-4xl lg:text-[2.85rem]">
              Four steps from scattered signal to aligned action.
            </Heading>
            <p className="mt-5 text-pretty text-base leading-relaxed text-white/55">
              Capture the decision, compare the paths, commit with a clear
              rationale, and revisit it when reality answers back.
            </p>
          </Reveal>
        </div>

        {/* desktop horizontal flow */}
        <div className="mt-14 hidden lg:block">
          <div className="relative mb-8 h-px">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent" />
            {!reduce && (
              <motion.div
                className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--primary-glow)]"
                animate={{ left: ["0%", "100%"] }}
                transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
              />
            )}
          </div>
          <Stagger className="grid grid-cols-4 gap-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <StaggerItem key={step.title}>
                  <div className="group flex flex-col items-center text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-hairline bg-bg-card/60 text-white/50 backdrop-blur-md transition-all duration-500 group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="mt-3 font-mono text-[11px] text-white/55">0{i + 1}</span>
                    <h3 className="mt-1 text-base font-semibold text-white">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/55">{step.line}</p>
                  </div>
                </StaggerItem>
              )
            })}
          </Stagger>
        </div>

        {/* mobile vertical timeline */}
        <Stagger className="relative mt-12 space-y-5 pl-8 lg:hidden">
          <div className="absolute bottom-2 left-[15px] top-2 w-px bg-gradient-to-b from-primary/40 via-white/10 to-transparent" />
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <StaggerItem key={step.title}>
                <div className="relative">
                  <span className="absolute -left-8 flex h-8 w-8 items-center justify-center rounded-lg border border-hairline bg-bg-card text-white/55">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="pt-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[11px] text-white/55">0{i + 1}</span>
                      <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-white/50">{step.line}</p>
                  </div>
                </div>
              </StaggerItem>
            )
          })}
        </Stagger>

        <Reveal delay={0.1} className="mt-14 flex justify-center">
          <CTAButton href="#system" variant="secondary" icon="arrow">
            Explore the system
          </CTAButton>
        </Reveal>
      </Container>
    </Section>
  )
}
