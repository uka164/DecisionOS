import { Container } from "./primitives"
import { Logo } from "./logo"
import { CTAButton } from "./cta-button"

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "The system", href: "#system" },
      { label: "How it works", href: "#how" },
      { label: "Context memory", href: "#memory" },
      { label: "Prioritization", href: "#prioritize" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Use cases", href: "#use-cases" },
      { label: "Trust & control", href: "#trust" },
      { label: "Comparison", href: "#compare" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Open the app", href: "/app" },
      { label: "Request access", href: "#request" },
    ],
  },
]

export function LandingFooter() {
  return (
    <footer className="relative border-t border-white/[0.06] py-16">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.5fr_2fr]">
          <div>
            <a href="#top" className="flex items-center gap-2.5">
              <Logo className="h-7 w-7" />
              <span className="text-[15px] font-semibold text-white">
                Decision<span className="text-white/55">OS</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-pretty text-sm leading-relaxed text-white/45">
              The operating system for organizational intelligence. Reason
              clearly, prioritize what matters, and execute with alignment.
            </p>
            <div className="mt-6">
              <CTAButton href="#request" variant="secondary" icon="arrow">
                Request access
              </CTAButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h4 className="font-mono text-[10px] uppercase text-white/35">
                  {col.title}
                </h4>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-white/55 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-white/35">
            &copy; {new Date().getFullYear()} DecisionOS. All rights reserved.
          </p>
          <p className="font-mono text-[11px] text-white/30">
            Designed for teams who decide carefully.
          </p>
        </div>
      </Container>
    </footer>
  )
}
