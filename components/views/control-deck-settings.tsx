"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  User,
  RefreshCw,
  Database,
  Palette,
  HardDrive,
  AlertTriangle,
  Check,
  Bell,
} from "lucide-react"
import { LOCAL_PROFILE } from "@/lib/local-profile"
import { requestRevisitNotificationPermission } from "@/hooks/useRevisitNotifications"
import { cn } from "@/lib/utils"

function HardwareToggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 group"
    >
      {/* Physical Switch */}
      <div className="relative w-14 h-7 rounded-full bg-[#0a0f14] border border-white/10 shadow-inner overflow-hidden">
        {/* LED Glow */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: enabled
              ? "radial-gradient(circle at 75% 50%, #10b981 0%, transparent 70%)"
              : "radial-gradient(circle at 25% 50%, #f43f5e 0%, transparent 70%)",
            opacity: 0.3,
          }}
        />

        {/* Track Lines */}
        <div className="absolute inset-y-2 left-2 right-2 flex justify-between">
          <div className="w-px h-full bg-white/10" />
          <div className="w-px h-full bg-white/10" />
          <div className="w-px h-full bg-white/10" />
        </div>

        {/* Knob */}
        <motion.div
          animate={{ x: enabled ? 28 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 w-5 h-5 rounded-full bg-gradient-to-b from-white/20 to-white/5 border border-white/20 shadow-lg"
          style={{
            boxShadow: enabled
              ? "0 0 8px #10b981, inset 0 1px 0 rgba(255,255,255,0.3)"
              : "0 0 8px #f43f5e40, inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        />
      </div>

      {/* LED Indicator */}
      <div
        className={`w-2 h-2 rounded-full transition-all duration-300 ${
          enabled ? "bg-success shadow-[0_0_8px_#10b981]" : "bg-destructive/50"
        }`}
      />

      <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
        {label}
      </span>
    </button>
  )
}


function DangerButton({ onConfirm }: { onConfirm: () => void }) {
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const onConfirmRef = useRef(onConfirm)

  useEffect(() => {
    onConfirmRef.current = onConfirm
  }, [onConfirm])

  const startHold = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setProgress(0)
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + 5
        if (next >= 100) {
          clearInterval(intervalRef.current)
          return 100
        }
        return next
      })
    }, 50)
  }

  const endHold = () => {
    setProgress(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  // Fire onConfirm after render when progress completes - never inside an updater
  useEffect(() => {
    if (progress >= 100) {
      onConfirmRef.current()
    }
  }, [progress])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <motion.button
      type="button"
      aria-label="Reset local DecisionOS data"
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={endHold}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      onTouchCancel={endHold}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") startHold()
      }}
      onKeyUp={endHold}
      className="relative w-full py-4 rounded-xl border-2 border-destructive/50 bg-destructive/10 overflow-hidden group"
      whileTap={{ scale: 0.98 }}
    >
      {/* Progress Fill */}
      <motion.div
        className="absolute inset-0 bg-destructive/30"
        style={{ width: `${progress}%` }}
      />

      {/* Glass Break Pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "30px 30px",
        }}
      />

      <div className="relative flex items-center justify-center gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <span className="text-sm font-medium text-destructive">
          {progress > 0
            ? `Hold to confirm... ${Math.round(progress)}%`
            : "Reset Local Data"}
        </span>
      </div>

      <p className="relative text-[10px] text-destructive/60 mt-1">
        Hold to confirm permanent reset
      </p>
    </motion.button>
  )
}

import type { AppSettings } from "@/lib/types"

interface ControlDeckSettingsProps {
  decisionCount?: number
  settings?: AppSettings
  onExportData?: () => void
  onImportData?: (file: File, mode: "overwrite" | "merge") => Promise<{ ok: boolean; added: number; updated: number }>
  onClearData?: () => void
  onUpdateSettings?: (patch: Partial<AppSettings>) => void
}

export function ControlDeckSettings({
  decisionCount,
  settings,
  onExportData,
  onImportData,
  onClearData,
  onUpdateSettings,
}: ControlDeckSettingsProps) {
  const [notice, setNotice] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    // reset so same file can be re-selected
    e.target.value = ""
  }

  const handleImport = async (mode: "overwrite" | "merge") => {
    if (!pendingFile || !onImportData) return
    setIsImporting(true)
    await onImportData(pendingFile, mode)
    setIsImporting(false)
    setPendingFile(null)
  }

  const reducedMotion    = settings?.reducedMotion ?? false
  const animationIntensity = settings?.animationIntensity ?? 70
  const ambientMotion    = settings?.ambientMotion ?? false
  const notifyRevisits   = settings?.notifyRevisits ?? false
  const theme: AppSettings["theme"] = settings?.theme ?? "void"

  const toggle = (key: keyof Pick<AppSettings, "reducedMotion" | "ambientMotion">) => {
    onUpdateSettings?.({ [key]: !(settings?.[key] ?? false) })
  }

  const handleNotifyToggle = async () => {
    if (notifyRevisits) {
      onUpdateSettings?.({ notifyRevisits: false })
      return
    }
    const result = await requestRevisitNotificationPermission()
    if (result === "granted") {
      onUpdateSettings?.({ notifyRevisits: true })
      toast.success("Notifications enabled", {
        description: "You'll get a browser nudge when a revisit is due — only when this tab is open.",
      })
    } else if (result === "denied") {
      toast.error("Notifications blocked", {
        description: "Your browser denied the request. Enable notifications for this site in your browser settings.",
      })
    } else {
      toast("Notifications not enabled", {
        description: "Permission wasn't granted.",
      })
    }
  }

  const themes: { id: AppSettings["theme"]; label: string; colors: string[] }[] = [
    { id: "void",     label: "Void",     colors: ["#020408", "#06b6d4", "#8b5cf6"] },
    { id: "midnight", label: "Midnight", colors: ["#080c1a", "#3b82f6", "#a855f7"] },
    { id: "twilight", label: "Twilight", colors: ["#16040e", "#e94560", "#ff9a3c"] },
    { id: "dawn",     label: "Dawn",     colors: ["#f4f6f8", "#0369a1", "#0d9488"] },
  ]

  return (
    <div className="relative w-full h-full min-h-[600px] overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-xl font-semibold text-white">Control Deck</h2>
        <p className="text-sm text-white/40">System configuration and preferences</p>
      </div>

      {/* Modular Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Module 1: Identity */}
        <div className="bg-[#0a0f14] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-white">Identity</h3>
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{LOCAL_PROFILE.name}</p>
              <p className="text-xs text-white/40">{LOCAL_PROFILE.detail}</p>
            </div>
          </div>
        </div>

        {/* Module 2: Appearance */}
        <div className="bg-[#0a0f14] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold text-white">Appearance</h3>
          </div>

          {/* Theme Selector */}
          <div className="space-y-3 mb-4">
            <span className="text-xs text-white/40">Theme</span>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onUpdateSettings?.({ theme: t.id as AppSettings["theme"] })}
                  className={`relative p-2 rounded-lg border transition-all ${
                    theme === t.id
                      ? "border-primary bg-primary/10 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex justify-center gap-0.5 mb-1">
                    {t.colors.map((c, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-white/60">{t.label}</span>
                  {theme === t.id && (
                    <Check className="absolute top-1 right-1 w-3 h-3 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Animation Intensity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Animation Intensity</span>
              <span className="text-xs font-mono text-white/60">{animationIntensity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={animationIntensity}
              onChange={(e) => onUpdateSettings?.({ animationIntensity: parseInt(e.target.value) })}
              className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_8px_#06b6d4]"
            />
          </div>

          <div className="mt-3 space-y-4">
            <HardwareToggle enabled={reducedMotion} onToggle={() => toggle("reducedMotion")} label="Reduced Motion" />
            <HardwareToggle enabled={ambientMotion} onToggle={() => toggle("ambientMotion")} label="Ambient Motion" />
          </div>
        </div>

        {/* Module 3: Local Storage - real data only */}
        <div className="bg-[#0a0f14] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="w-4 h-4 text-success" />
            <h3 className="text-sm font-semibold text-white">Local Storage</h3>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <HardDrive className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-white/40">Decisions stored locally</p>
              <p className="text-lg font-mono font-semibold text-white">
                {decisionCount != null ? decisionCount.toLocaleString() : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Module: Notifications */}
        <div className="bg-[#0a0f14] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-secondary" />
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-white/45 leading-relaxed">
              Browser nudge when a revisit is due. Only fires while this tab is open — there's no background process.
            </p>
            <button
              type="button"
              onClick={handleNotifyToggle}
              aria-pressed={notifyRevisits}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border transition-colors text-left",
                notifyRevisits
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-white/10 bg-white/[0.025] text-white/70 hover:bg-white/[0.05]"
              )}
            >
              <span className="text-sm font-medium">
                {notifyRevisits ? "Notifications enabled" : "Enable revisit notifications"}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "relative w-10 h-5 rounded-full border transition-colors flex-shrink-0",
                  notifyRevisits ? "bg-success/30 border-success/45" : "bg-white/[0.05] border-white/15"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full transition-transform",
                    notifyRevisits ? "translate-x-5 bg-success" : "translate-x-0.5 bg-white/45"
                  )}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Module 4: Danger Zone */}
        <div className="bg-[#0a0f14] border border-destructive/20 rounded-2xl p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
          </div>

          <div className="flex gap-3 mb-3">
            {onExportData && (
              <button
                onClick={onExportData}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
                aria-label="Export all data as JSON"
              >
                <Database className="w-4 h-4" />
                Export (.json)
              </button>
            )}
            {onImportData && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelected}
                  className="hidden"
                  aria-label="Select JSON file to import"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
                  aria-label="Import data from JSON"
                >
                  <RefreshCw className="w-4 h-4" />
                  Import (.json)
                </button>
              </>
            )}
          </div>
          <DangerButton
            onConfirm={() => {
              onClearData?.()
              setNotice("Local data reset")
            }}
          />
        </div>
      </div>

      {/* Import confirm modal */}
      <AnimatePresence>
        {pendingFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !isImporting && setPendingFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#0a0f14] border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Database className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Import Data</h3>
                  <p className="text-xs text-white/40 font-mono truncate max-w-[260px]">{pendingFile.name}</p>
                </div>
              </div>

              <p className="text-sm text-white/55 mb-5 mt-3 leading-relaxed">
                How should imported decisions be handled when an ID already exists?
              </p>

              <div className="space-y-2 mb-5">
                <button
                  onClick={() => handleImport("merge")}
                  disabled={isImporting}
                  className="w-full flex items-start gap-3 p-3.5 rounded-xl border border-white/10 bg-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="w-5 h-5 rounded-full border border-white/20 group-hover:border-primary/40 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">Add new only</p>
                    <p className="text-xs text-white/35 mt-0.5">Existing records are preserved. Only new IDs are imported.</p>
                  </div>
                </button>

                <button
                  onClick={() => handleImport("overwrite")}
                  disabled={isImporting}
                  className="w-full flex items-start gap-3 p-3.5 rounded-xl border border-white/10 bg-white/5 hover:border-warning/30 hover:bg-warning/5 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="w-5 h-5 rounded-full border border-white/20 group-hover:border-warning/40 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-warning opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">Overwrite on conflict</p>
                    <p className="text-xs text-white/35 mt-0.5">Imported version replaces existing when IDs match.</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setPendingFile(null)}
                disabled={isImporting}
                className="w-full py-2.5 text-sm text-white/40 hover:text-white/60 transition-colors disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              {isImporting && (
                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-white/40">
                  <motion.div
                    className="w-3.5 h-3.5 border border-primary/40 border-t-primary rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                  Importing...
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Toast */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 px-4 py-3 bg-destructive text-white rounded-lg shadow-lg flex items-center gap-2"
            onAnimationComplete={() => {
              setTimeout(() => setNotice(null), 2000)
            }}
          >
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">{notice}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
