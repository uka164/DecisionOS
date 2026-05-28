"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  LayoutDashboard,
  Archive,
  FlaskConical,
  Network,
  PlusCircle,
  Settings,
  ArrowRight,
} from "lucide-react"
import { useWizard } from "@/contexts/WizardContext"

interface CommandItem {
  id: string
  label: string
  shortcut?: string
  icon: React.ReactNode
  category: "navigation" | "actions"
  action: () => void
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const wizard = useWizard()

  const navigate = (href: string) => { setOpen(false); router.push(href) }
  const openWizard = () => { setOpen(false); wizard.open() }

  const commands: CommandItem[] = [
    {
      id: "dashboard",
      label: "Go to Right Now",
      shortcut: "G D",
      icon: <LayoutDashboard className="w-4 h-4" />,
      category: "navigation",
      action: () => navigate("/app"),
    },
    {
      id: "decisions",
      label: "Go to Memory",
      shortcut: "G L",
      icon: <Network className="w-4 h-4" />,
      category: "navigation",
      action: () => navigate("/decisions"),
    },
    {
      id: "neural-map",
      label: "Go to Relationship Map",
      shortcut: "G M",
      icon: <Network className="w-4 h-4" />,
      category: "navigation",
      action: () => navigate("/decisions?view=map"),
    },
    {
      id: "archive",
      label: "Go to Archive",
      shortcut: "G A",
      icon: <Archive className="w-4 h-4" />,
      category: "navigation",
      action: () => navigate("/archive"),
    },
    {
      id: "experiments",
      label: "Go to Experiments",
      shortcut: "G E",
      icon: <FlaskConical className="w-4 h-4" />,
      category: "navigation",
      action: () => navigate("/experiments"),
    },
    {
      id: "settings",
      label: "Go to Settings",
      shortcut: "G S",
      icon: <Settings className="w-4 h-4" />,
      category: "navigation",
      action: () => navigate("/settings"),
    },
    {
      id: "new-decision",
      label: "New Decision",
      shortcut: "N",
      icon: <PlusCircle className="w-4 h-4" />,
      category: "actions",
      action: openWizard,
    },
  ]

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
        setQuery("")
        setSelectedIndex(0)
      }

      if (!open) return

      if (e.key === "Escape") {
        setOpen(false)
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        )
      } else if (e.key === "Enter") {
        e.preventDefault()
        filteredCommands[selectedIndex]?.action()
      }
    },
    [open, filteredCommands, selectedIndex]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const navCommands    = filteredCommands.filter((c) => c.category === "navigation")
  const actionCommands = filteredCommands.filter((c) => c.category === "actions")

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Command Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed left-1/2 top-[20%] -translate-x-1/2 w-[600px] max-w-[90vw] z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-bg-card/95 shadow-2xl shadow-black/50 backdrop-blur-2xl">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
                <Search className="w-5 h-5 text-white/40" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none text-sm"
                  aria-label="Search commands"
                />
                <kbd className="px-2 py-1 text-[10px] font-mono text-white/40 bg-white/5 rounded border border-white/10">
                  ESC
                </kbd>
              </div>

              {/* Commands List */}
              <div className="max-h-[400px] overflow-y-auto py-2">
                {filteredCommands.length === 0 ? (
                  <p className="px-4 py-8 text-center text-white/40 text-sm">
                    No commands found
                  </p>
                ) : (
                  <>
                    {navCommands.length > 0 && (
                      <div className="px-2 py-2">
                        <p className="px-2 py-1 text-[10px] font-semibold uppercase text-white/30">
                          Navigation
                        </p>
                        {navCommands.map((cmd) => {
                          const globalIndex = filteredCommands.findIndex((c) => c.id === cmd.id)
                          return (
                            <CommandItemRow
                              key={cmd.id}
                              command={cmd}
                              isSelected={selectedIndex === globalIndex}
                              onSelect={cmd.action}
                              onHover={() => setSelectedIndex(globalIndex)}
                            />
                          )
                        })}
                      </div>
                    )}

                    {actionCommands.length > 0 && (
                      <div className="px-2 py-2">
                        <p className="px-2 py-1 text-[10px] font-semibold uppercase text-white/30">
                          Actions
                        </p>
                        {actionCommands.map((cmd) => {
                          const globalIndex = filteredCommands.findIndex((c) => c.id === cmd.id)
                          return (
                            <CommandItemRow
                              key={cmd.id}
                              command={cmd}
                              isSelected={selectedIndex === globalIndex}
                              onSelect={cmd.action}
                              onHover={() => setSelectedIndex(globalIndex)}
                            />
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-3 border-t border-white/10 text-[10px] text-white/30">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 font-mono bg-white/5 rounded border border-white/10">
                    ↑↓
                  </kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 font-mono bg-white/5 rounded border border-white/10">
                    ↵
                  </kbd>
                  select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 font-mono bg-white/5 rounded border border-white/10">
                    esc
                  </kbd>
                  close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function CommandItemRow({
  command,
  isSelected,
  onSelect,
  onHover,
}: {
  command: CommandItem
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
}) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        isSelected
          ? "bg-primary/20 text-primary"
          : "text-white/70 hover:bg-white/5"
      }`}
    >
      <span
        className={isSelected ? "text-primary" : "text-white/40"}
      >
        {command.icon}
      </span>
      <span className="flex-1 text-left text-sm">{command.label}</span>
      {command.shortcut && (
        <kbd className="px-2 py-0.5 text-[10px] font-mono text-white/40 bg-white/5 rounded border border-white/10">
          {command.shortcut}
        </kbd>
      )}
      {isSelected && <ArrowRight className="w-4 h-4 text-primary" />}
    </button>
  )
}
