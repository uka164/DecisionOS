"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, LayoutDashboard, Network, Archive, FlaskConical, Settings, BookOpen, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { LOCAL_PROFILE } from "@/lib/local-profile"

const primaryNav = [
  { icon: LayoutDashboard, label: "Dashboard",   href: "/" },
  { icon: Network,         label: "Decisions",   href: "/decisions" },
]

const secondaryNav = [
  { icon: Archive,      label: "Archive",     href: "/archive",      note: null },
  { icon: FlaskConical, label: "Experiments", href: "/experiments",  note: "beta" },
  { icon: Settings,     label: "Settings",    href: "/settings",     note: null },
]

export function LeftSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-white/10 bg-white/[0.02] backdrop-blur-2xl flex flex-col z-30">
      {/* Brand */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm tracking-tight">DECISIONOS</span>
            <span className="text-white/40 text-xs font-mono">v2.0</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
        <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider px-3 mb-1">Journal</p>
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

        <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider px-3 mb-1">More</p>
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
                <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400/70">
                  {item.note}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Tip */}
      <div className="mx-4 mb-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-start gap-2">
          <BookOpen className="w-3.5 h-3.5 text-white/30 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-white/35 leading-relaxed">
            Press <kbd className="font-mono bg-white/10 px-1 py-0.5 rounded text-white/50">⌘K</kbd> to search or{" "}
            <kbd className="font-mono bg-white/10 px-1 py-0.5 rounded text-white/50">+</kbd> to capture a decision quickly.
          </p>
        </div>
      </div>

      {/* Profile footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
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
