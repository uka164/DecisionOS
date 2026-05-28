"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Shield, LayoutDashboard, Network, Archive, FlaskConical, Settings, User, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { LOCAL_PROFILE } from "@/lib/local-profile"
import { useWizard } from "@/contexts/WizardContext"

const primaryNav = [
  { icon: LayoutDashboard, label: "Dashboard",  href: "/app",         note: null },
  { icon: Network,         label: "Decisions",  href: "/decisions",   note: null },
]

const secondaryNav = [
  { icon: Archive,      label: "Archive",     href: "/archive",     note: null },
  { icon: FlaskConical, label: "Experiments", href: "/experiments", note: "beta" },
  { icon: Settings,     label: "Settings",    href: "/settings",    note: null },
]

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { open } = useWizard()

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-bg-body/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 z-40 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">DECISIONOS</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={open}
            className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
            aria-label="Log decision"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </div>
      </header>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-screen w-72 bg-bg-body/95 backdrop-blur-2xl border-r border-white/10 z-50 flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
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

        <nav className="flex-1 p-4 overflow-y-auto">
          <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider px-3 mb-2">Journal</p>
          <ul className="space-y-1 mb-4">
            {primaryNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 border-l-2 border-primary text-primary"
                        : "text-white/60 hover:text-white/90 hover:bg-white/5"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="my-3 border-t border-white/[0.06]" />
          <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider px-3 mb-2">More</p>
          <ul className="space-y-1">
            {secondaryNav.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
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
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{LOCAL_PROFILE.name}</p>
              <p className="text-xs text-white/40">{LOCAL_PROFILE.role}</p>
            </div>
            <Link href="/settings" onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" aria-label="Settings">
              <Settings className="w-4 h-4 text-white/40" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}
