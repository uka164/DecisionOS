"use client"

import { useState } from "react"
import { motion } from "framer-motion"

interface TradeoffData {
  axis: string
  value: number // 0-100
}

interface TradeoffRadarProps {
  data: TradeoffData[]
  size?: number
}

const defaultData: TradeoffData[] = [
  { axis: "Speed",       value: 85 },
  { axis: "Stability",   value: 70 },
  { axis: "Cost",        value: 60 },
  { axis: "Scalability", value: 90 },
  { axis: "DevEx",       value: 75 },
]

export function TradeoffRadar({ data = defaultData, size = 200 }: TradeoffRadarProps) {
  const [isHovered, setIsHovered] = useState(false)

  const center    = size / 2
  const maxRadius = (size / 2) * 0.75
  const levels    = 4

  const getPointCoordinates = (value: number, index: number) => {
    const angle  = (Math.PI * 2 * index) / data.length - Math.PI / 2
    const radius = (value / 100) * maxRadius
    return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) }
  }

  const getLabelPosition = (index: number) => {
    const angle  = (Math.PI * 2 * index) / data.length - Math.PI / 2
    const radius = maxRadius + 24
    return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) }
  }

  const polygonPoints = data
    .map((d, i) => { const p = getPointCoordinates(d.value, i); return `${p.x},${p.y}` })
    .join(" ")

  return (
    <div
      className="relative transition-transform duration-300 ease-out"
      style={{
        perspective: "600px",
        transform: isHovered
          ? "perspective(600px) rotateX(5deg) rotateY(5deg)"
          : "perspective(600px) rotateX(0deg) rotateY(0deg)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        width={size}
        height={size}
        className="overflow-visible"
        role="img"
        aria-label="Trade-off radar chart"
      >
        {/* Grid rings */}
        {Array.from({ length: levels }).map((_, levelIndex) => {
          const levelRadius = ((levelIndex + 1) / levels) * maxRadius
          const levelPoints = data
            .map((_, i) => {
              const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2
              return `${center + levelRadius * Math.cos(angle)},${center + levelRadius * Math.sin(angle)}`
            })
            .join(" ")
          return <polygon key={levelIndex} points={levelPoints} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        })}

        {/* Axis lines */}
        {data.map((_, i) => {
          const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2
          return (
            <line key={i}
              x1={center} y1={center}
              x2={center + maxRadius * Math.cos(angle)}
              y2={center + maxRadius * Math.sin(angle)}
              stroke="rgba(255,255,255,0.1)" strokeWidth="1"
            />
          )
        })}

        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   style={{ stopColor: "var(--primary)",   stopOpacity: 0.4 }} />
            <stop offset="100%" style={{ stopColor: "var(--secondary)", stopOpacity: 0.4 }} />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Filled area */}
        <motion.polygon
          points={polygonPoints}
          fill="url(#radarGradient)"
          stroke="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />

        {/* Glowing edge */}
        <motion.polygon
          points={polygonPoints}
          fill="none"
          style={{ stroke: "var(--primary)" }}
          strokeWidth="2"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        />

        {/* Data points */}
        {data.map((d, i) => {
          const point = getPointCoordinates(d.value, i)
          return (
            <motion.circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={4}
              style={{
                fill:   "var(--primary)",
                stroke: "var(--bg-body)",
                filter: "drop-shadow(0 0 4px var(--accent-glow))",
              }}
              strokeWidth={2}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
            />
          )
        })}

        {/* Axis labels */}
        {data.map((d, i) => {
          const pos = getLabelPosition(i)
          return (
            <text key={i} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
              className="fill-white/50 text-[10px] font-mono uppercase tracking-wider">
              {d.axis}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
