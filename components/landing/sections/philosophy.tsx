"use client"

import { motion } from "framer-motion"
import { Container, Section, EASE_OUT } from "../primitives"
import { CTAButton } from "../cta-button"

const LINES = [
  "Organizations become what they repeatedly decide.",
  "The quality of those decisions compounds — quietly, relentlessly.",
  "DecisionOS exists to make that compounding deliberate.",
]

export function Philosophy() {
  return (
    <Section id="philosophy" className="relative overflow-hidden">
      {/* faint ambient diagram */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[150px]"
        style={{
          background: "radial-gradient(circle, var(--mesh-1), transparent 65%)",
        }}
      />
      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <div className="space-y-5 sm:space-y-7">
            {LINES.map((line, i) => (
              <motion.p
                key={i}
                initial={false}
                whileInView={{ opacity: i === LINES.length - 1 ? 1 : 0.6, y: 0 }}
                viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
                transition={{ duration: 1.1, ease: EASE_OUT, delay: i * 0.25 }}
                className="text-balance text-2xl font-light leading-[1.25] text-white sm:text-3xl lg:text-[2.4rem]"
              >
                {line}
              </motion.p>
            ))}
          </div>
          <motion.div
            initial={false}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: EASE_OUT, delay: 0.9 }}
            className="mt-12 flex justify-center"
          >
            <CTAButton href="#proof" variant="ghost" icon="arrow">
              Continue
            </CTAButton>
          </motion.div>
        </div>
      </Container>
    </Section>
  )
}
