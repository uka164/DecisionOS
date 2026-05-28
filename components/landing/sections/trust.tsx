"use client"

import { motion } from "framer-motion"
import { Eye, Link2, UserCheck, Lock, ScrollText, Check } from "lucide-react"
import {
  Container,
  Section,
  Eyebrow,
  Heading,
  Reveal,
  Stagger,
  StaggerItem,
  EASE_OUT,
} from "../primitives"
import { CTAButton } from "../cta-button"

const PILLARS = [
  { icon: Eye, title: "Explainable reasoning", desc: "Every suggestion shows its logic. No black boxes to trust on faith." },
  { icon: Link2, title: "Source-linked context", desc: "Claims trace back to the doc, thread, or decision they came from." },
  { icon: UserCheck, title: "Human approval", desc: "AI proposes, people decide. Nothing moves without sign-off." },
  { icon: Lock, title: "Granular permissions", desc: "Control who can view, edit, and approve at every level." },
  { icon: ScrollText, title: "Full audit trail", desc: "Every change recorded — who, what, when, and why." },
]

export function Trust() {
  return (
    <Section id="trust">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow index="09" className="justify-center">
              Trust &amp; control
            </Eyebrow>
            <Heading className="mt-5 text-3xl leading-[1.12] sm:text-4xl lg:text-[2.85rem]">
              AI should make reasoning visible — not replace judgment.
            </Heading>
            <p className="mt-5 text-pretty text-base leading-relaxed text-white/55">
              DecisionOS is built on restraint. It surfaces thinking, keeps
              humans in control, and leaves a record you can verify.
            </p>
          </Reveal>
        </div>

        <Stagger className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PILLARS.map((p, i) => {
            const Icon = p.icon
            return (
              <StaggerItem key={p.title}>
                <div className="group h-full rounded-lg border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.14]">
                  <div className="relative inline-flex">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/55 transition-colors group-hover:text-primary">
                      <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                    </span>
                    <motion.span
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      initial={false}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.3 + i * 0.08 }}
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </motion.span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-white">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/50">{p.desc}</p>
                </div>
              </StaggerItem>
            )
          })}
        </Stagger>

        <Reveal delay={0.1} className="mt-10 flex justify-center">
          <CTAButton href="#request" variant="ghost" icon="arrow">
            Read the trust principles
          </CTAButton>
        </Reveal>
      </Container>
    </Section>
  )
}
