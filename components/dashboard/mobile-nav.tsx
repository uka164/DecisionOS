"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Shield, LayoutDashboard, Network, Archive, FlaskConical, Settings, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDisplayName, getInitials } from "@/lib/identity"
import { SyncStatusBadge } from "@/components/dashboard/sync-status"
import { useWizard } from "@/contexts/WizardContext"

const primaryNav = [
  { icon: LayoutDashboard, label: "Right Now", href: "/app",       note: null },
  { icon: Network,         label: "Memory",    href: "/decisions", note: null },
]

const secondaryNav = [
  { icon: Archive,      label: "Archive",     href: "/archive",     note: null },
  { icon: FlaskConical, label: "Experiments", href: "/experiments", note: "beta" },
  { icon: Settings,     label: "Settings",    href: "/settings",    note: null },
]

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { openCapture } = useWizard()
  const displayName = useDisplayName()

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-hairline bg-bg-body/92 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand/25 bg-brand/10">
            <Shield className="h-5 w-5 text-brand" />
          </div>
          <span className="text-sm font-semibold text-white">DecisionOS</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={openCapture}
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
        "fixed left-0 top-0 z-50 flex h-screen w-72 transform flex-col border-r border-hairline bg-bg-body/95 backdrop-blur-2xl transition-transform duration-300 ease-in-out lg:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="border-b border-hairline p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand/25 bg-brand/10">
              <Shield className="h-5 w-5 text-brand" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">DecisionOS</span>
              <span className="font-mono text-xs text-white/55">local system</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
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

          <div className="my-3 border-t border-hairline" />
          <p className="mb-2 px-3 font-mono text-[11px] uppercase text-white/55">More</p>
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
                      <span className="rounded border border-warning/20 bg-warning/10 px-1.5 py-0.5 font-mono text-[11px] uppercase text-warning/70">
                        {item.note}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-hairline p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-secondary/30 bg-secondary/15 text-[11px] font-semibold text-secondary">
              {getInitials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <SyncStatusBadge />
            </div>
            <Link href="/settings" onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" aria-label="Settings">
              <Settings className="w-4 h-4 text-white/55" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}
