"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Container, Section, Eyebrow, Heading, EASE_OUT } from "../primitives"
import { CTAButton } from "../cta-button"

export function DecisionsDecay() {
  return (
    <Section id="decay" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/4 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[150px]"
        style={{ background: "radial-gradient(circle, var(--mesh-1), transparent 65%)" }}
      />
      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* narrative — problem, consequence, and memory in one arc */}
          <div>
            <motion.div
              initial={false}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE_OUT }}
            >
              <Eyebrow index="02">Why it matters</Eyebrow>
            </motion.div>

            <Heading className="mt-5 text-3xl leading-[1.1] sm:text-4xl lg:text-[2.6rem]">
              Decisions decay the moment the meeting ends.
            </Heading>

            <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-white/55">
              Context scatters across calls, docs, and threads. The reasoning
              behind a choice evaporates — and six weeks later, no one remembers
              why, so the debate starts over.
            </p>

            <motion.p
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ duration: 1, ease: EASE_OUT, delay: 0.1 }}
              className="mt-6 max-w-md text-pretty text-lg font-medium leading-relaxed text-white/85"
            >
              You become what you repeatedly decide. DecisionOS makes that
              compounding deliberate — it keeps your reasoning, not just the
              outcome, so your next decision starts from earned clarity instead
              of a blank page.
            </motion.p>

            <div className="mt-8">
              <CTAButton href="#system" variant="ghost" icon="arrow">
                See how it holds the line
              </CTAButton>
            </div>
          </div>

          {/* human cost spotlight */}
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 1, ease: EASE_OUT, delay: 0.1 }}
            className="relative"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] opacity-60 blur-2xl"
              style={{ background: "radial-gradient(60% 60% at 40% 40%, var(--secondary-glow), transparent 70%)" }}
            />
            <div className="relative overflow-hidden rounded-2xl border border-hairline bg-bg-card/60 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.04]">
              <div className="relative aspect-[16/11] w-full sm:aspect-[16/10]">
                <Image
                  src="/visuals/human-cost.jpg"
                  alt="A person surrounded by scattered dashboards and notes, holding the context of past decisions in their head"
                  fill
                  loading="lazy"
                  sizes="(min-width: 1024px) 46vw, 100vw"
                  className="object-cover object-center"
                />
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(2,4,8,0.78) 0%, rgba(2,4,8,0.18) 38%, transparent 60%)" }}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <p className="max-w-xs text-pretty text-sm font-medium leading-snug text-white/85">
                  The cost of forgetting is paid by the next person who has to
                  decide.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </Section>
  )
}
