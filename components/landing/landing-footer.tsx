import { Container } from "./primitives"
import { Logo } from "./logo"
import { CTAButton } from "./cta-button"

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "The product", href: "#product" },
      { label: "How it works", href: "#how" },
      { label: "Core system", href: "#system" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Why it matters", href: "#decay" },
      { label: "Where it fits", href: "#compare" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Start",
    links: [
      { label: "Open the app", href: "/app" },
      { label: "Watch walkthrough", href: "#how" },
    ],
  },
]

export function LandingFooter() {
  return (
    <footer id="site-footer" className="relative border-t border-white/[0.06] py-16">
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
              A private, local-first journal for decisions you want to learn
              from instead of merely remember.
            </p>
            <div className="mt-6">
              <CTAButton href="/app" variant="secondary" icon="arrow">
                Open app
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
            Designed for people who want cleaner judgment loops.
          </p>
        </div>
      </Container>
    </footer>
  )
}
