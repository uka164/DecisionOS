"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, LayoutDashboard, Network, Archive, FlaskConical, Settings, BookOpen, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { LOCAL_PROFILE } from "@/lib/local-profile"

const primaryNav = [
  { icon: LayoutDashboard, label: "Right Now", href: "/app" },
  { icon: Network,         label: "Memory",    href: "/decisions" },
]

const secondaryNav = [
  { icon: Archive,      label: "Archive",     href: "/archive",      note: null },
  { icon: FlaskConical, label: "Experiments", href: "/experiments",  note: "beta" },
  { icon: Settings,     label: "Settings",    href: "/settings",     note: null },
]

export function LeftSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-white/[0.07] bg-bg-body/72 backdrop-blur-2xl">
      {/* Brand */}
      <div className="border-b border-white/[0.07] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand/25 bg-brand/10">
            <Shield className="h-5 w-5 text-brand" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">DecisionOS</span>
            <span className="font-mono text-xs text-white/35">local system</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 border-l-2 border-primary text-primary"
                  : "text-white/60 hover:text-white/90 hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}

        <div className="my-3 border-t border-white/[0.06]" />

        <p className="mb-1 px-3 font-mono text-[10px] uppercase text-white/25">More</p>
        {secondaryNav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 border-l-2 border-primary text-primary"
                  : "text-white/55 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.note && (
                <span className="rounded border border-warning/20 bg-warning/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-warning/70">
                  {item.note}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Tip */}
      <div className="mx-4 mb-3 rounded-lg border border-white/[0.06] bg-white/[0.018] p-3">
        <div className="flex items-start gap-2">
          <BookOpen className="w-3.5 h-3.5 text-white/30 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-white/35 leading-relaxed">
            Press <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-white/50">Cmd K</kbd> to search or{" "}
            <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-white/50">+</kbd> to capture a decision quickly.
          </p>
        </div>
      </div>

      {/* Profile footer */}
      <div className="border-t border-white/[0.07] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035]">
            <User className="h-4 w-4 text-white/55" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{LOCAL_PROFILE.name}</p>
            <p className="text-xs text-white/40">{LOCAL_PROFILE.role}</p>
          </div>
          <Link href="/settings" className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" aria-label="Settings">
            <Settings className="w-4 h-4 text-white/40" />
          </Link>
        </div>
      </div>
    </aside>
  )
}
