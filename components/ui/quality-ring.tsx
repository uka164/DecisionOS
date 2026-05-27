"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface QualityRingProps {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
  showScore?: boolean
}

export function QualityRing({
  score,
  size = 80,
  strokeWidth = 6,
  label = "Thinking Quality",
  showScore = false,
}: QualityRingProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(score, 0), 100)
  const offset = circumference - (progress / 100) * circumference

  const getColor = () => {
    if (score < 50) return { stroke: "#6366f1", glow: "rgba(99, 102, 241, 0.4)" }
    if (score < 80) return { stroke: "#818cf8", glow: "rgba(129, 140, 248, 0.4)" }
    return { stroke: "#06b6d4", glow: "rgba(6, 182, 212, 0.4)" }
  }

  const colors = getColor()

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${score}% complete`}
        title={`Record completeness: ${score}% — how much information is captured for this decision`}
      >
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
        </svg>

        <svg
          width={size}
          height={size}
          className="absolute inset-0 -rotate-90"
          style={{
            filter: mounted ? `drop-shadow(0 0 8px ${colors.glow})` : undefined,
          }}
        >
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: mounted ? offset : circumference }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          />
        </svg>

        {showScore && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              className="font-mono text-lg font-bold"
              style={{ color: colors.stroke }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: mounted ? 1 : 0, scale: mounted ? 1 : 0.5 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              {score}
            </motion.span>
          </div>
        )}
      </div>

      <span className="text-[10px] text-white/40 uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}
