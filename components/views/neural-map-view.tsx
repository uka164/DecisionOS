"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, ZoomIn, ZoomOut, Maximize2, ArrowRight, Link2, Network, Plus } from "lucide-react"
import { useDecisionsStore, useSettingsStore } from "@/stores"
import type { Decision as StoreDecision, DecisionStatus, AppSettings } from "@/lib/types"

// ─── Internal map types ───────────────────────────────────────────────────────

type MapStatus = "active" | "pending" | "resolved" | "blocked"

interface MapNode {
  id: string
  title: string
  status: MapStatus
  impact: number
  qualityScore: number
  x: number
  y: number
  vx: number
  vy: number
}

interface Edge {
  source: string
  target: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Static semantic colours — active uses theme accent, others are universal status colours
const THEME_ACCENT: Record<AppSettings["theme"], string> = {
  void:     "#06b6d4",
  midnight: "#818cf8",
  twilight: "#e879f9",
  dawn:     "#0369a1",
}

function getStatusColors(theme: AppSettings["theme"]): Record<MapStatus, string> {
  return {
    active:   THEME_ACCENT[theme],
    pending:  "#f59e0b",
    resolved: "#10b981",
    blocked:  "#f43f5e",
  }
}

const STATUS_LABELS: Record<MapStatus, string> = {
  active:   "In Progress",
  pending:  "Awaiting Review",
  resolved: "Completed",
  blocked:  "Blocked",
}

function mapDecisionStatus(s: DecisionStatus): MapStatus {
  switch (s) {
    case "in-progress": return "active"
    case "decided":     return "resolved"
    case "archived":    return "resolved"
    case "voided":      return "blocked"
    case "superseded":  return "blocked"
    default:            return "pending"   // "draft"
  }
}

function initialPosition(index: number, total: number): { x: number; y: number } {
  const angle  = (2 * Math.PI * index) / Math.max(total, 1)
  const radius = Math.min(240, 80 + total * 22)
  return { x: 400 + radius * Math.cos(angle), y: 300 + radius * Math.sin(angle) }
}

function storeToMapNode(d: StoreDecision, index: number, total: number, existing?: MapNode): MapNode {
  const pos = existing ?? initialPosition(index, total)
  return {
    id: d.id,
    title: d.title,
    status: mapDecisionStatus(d.status),
    impact: d.impact,
    qualityScore: d.qualityScore,
    x: pos.x,
    y: pos.y,
    vx: existing?.vx ?? 0,
    vy: existing?.vy ?? 0,
  }
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyMapState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Network className="w-8 h-8 text-white/20" />
      </div>
      <div className="text-center">
        <p className="text-white/50 text-sm font-medium mb-1">No decisions in the map</p>
        <p className="text-white/25 text-xs">Create your first decision to see it visualised here</p>
      </div>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-primary text-sm hover:bg-cyan-500/15 transition-all"
      >
        <Plus className="w-4 h-4" />
        Create First Decision
      </button>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NeuralMapView() {
  const router = useRouter()
  const storeDecisions = useDecisionsStore((s) => s.decisions)
  const isLoading = useDecisionsStore((s) => s.isLoading)
  const settings = useSettingsStore((s) => s.settings)
  const STATUS_COLORS = useMemo(() => getStatusColors(settings.theme), [settings.theme])

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const dashOffsetRef = useRef(0)

  const [nodes,       setNodes]       = useState<MapNode[]>([])
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null)
  const [tooltipNode,  setTooltipNode]  = useState<{ node: MapNode; x: number; y: number } | null>(null)
  const [searchQuery,  setSearchQuery]  = useState("")
  const [zoom,         setZoom]         = useState(1)
  const [pan,          setPan]          = useState({ x: 0, y: 0 })
  const [draggedNode,  setDraggedNode]  = useState<string | null>(null)
  const [dragStart,    setDragStart]    = useState<{ x: number; y: number } | null>(null)

  // ── Sync store decisions → map nodes (preserve positions for existing) ─────
  useEffect(() => {
    setNodes((prev) => {
      const prevMap = new Map(prev.map((n) => [n.id, n]))
      return storeDecisions.map((d, i) =>
        storeToMapNode(d, i, storeDecisions.length, prevMap.get(d.id))
      )
    })
  }, [storeDecisions])

  // ── Edges derived from echoTargets ───────────────────────────────────────
  // Supports both direct ID references ("static-d3") and title references ("Auth Migration")
  const edges = useMemo<Edge[]>(() => {
    const idSet     = new Set(storeDecisions.map((d) => d.id))
    const titleToId = new Map(storeDecisions.map((d) => [d.title, d.id]))
    const result: Edge[] = []
    storeDecisions.forEach((d) => {
      d.echoTargets?.forEach((target) => {
        const targetId = idSet.has(target) ? target : titleToId.get(target)
        if (targetId && targetId !== d.id) {
          result.push({ source: d.id, target: targetId })
        }
      })
    })
    return result
  }, [storeDecisions])

  // ── Connected-nodes helper ────────────────────────────────────────────────
  const getConnectedNodes = useCallback((nodeId: string): Set<string> => {
    const connected = new Set<string>()
    edges.forEach((e) => {
      if (e.source === nodeId) connected.add(e.target)
      if (e.target === nodeId) connected.add(e.source)
    })
    return connected
  }, [edges])

  const filteredNodes = useMemo(
    () => nodes.filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [nodes, searchQuery]
  )

  // ── Force simulation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (nodes.length === 0) return

    const simulate = () => {
      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n }))

        for (let i = 0; i < next.length; i++) {
          const node = next[i]
          if (draggedNode === node.id) continue

          for (let j = 0; j < next.length; j++) {
            if (i === j) continue
            const other = next[j]
            const dx = node.x - other.x
            const dy = node.y - other.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const minDist = (12 + node.impact * 4) + (12 + other.impact * 4) + 80
            if (dist < minDist) {
              const force = (minDist - dist) * 0.15
              node.vx += (dx / dist) * force
              node.vy += (dy / dist) * force
            } else {
              const force = 1200 / (dist * dist)
              node.vx += (dx / dist) * force
              node.vy += (dy / dist) * force
            }
          }

          edges.forEach((e) => {
            if (e.source === node.id || e.target === node.id) {
              const otherId = e.source === node.id ? e.target : e.source
              const other = next.find((n) => n.id === otherId)
              if (other) {
                node.vx += (other.x - node.x) * 0.003
                node.vy += (other.y - node.y) * 0.003
              }
            }
          })

          node.vx += (400 - node.x) * 0.0008
          node.vy += (300 - node.y) * 0.0008
          node.vx *= 0.85
          node.vy *= 0.85
          node.x += node.vx
          node.y += node.vy
          node.x = Math.max(80, Math.min(720, node.x))
          node.y = Math.max(80, Math.min(520, node.y))
        }

        return next
      })
      animationRef.current = requestAnimationFrame(simulate)
    }

    animationRef.current = requestAnimationFrame(simulate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [draggedNode, edges, nodes.length])

  // ── Canvas rendering ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Read CSS var once per effect — avoids layout thrashing on every frame
    const borderSubtle = getComputedStyle(document.documentElement)
      .getPropertyValue("--border-subtle").trim() || "rgba(255,255,255,0.08)"

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.translate(pan.x, pan.y)
      ctx.scale(zoom, zoom)

      const connectedNodes = hoveredNode ? getConnectedNodes(hoveredNode) : new Set<string>()

      // Advance dash animation offset
      dashOffsetRef.current = (dashOffsetRef.current + 0.3) % 20

      // Draw edges
      edges.forEach((edge) => {
        const source = nodes.find((n) => n.id === edge.source)
        const target = nodes.find((n) => n.id === edge.target)
        if (!source || !target) return

        const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        if (isHighlighted) {
          ctx.shadowColor = STATUS_COLORS.active
          ctx.shadowBlur  = 12
          ctx.strokeStyle = STATUS_COLORS.active
          ctx.lineWidth   = 3
          ctx.setLineDash([])
        } else if (hoveredNode) {
          ctx.shadowBlur  = 0
          ctx.strokeStyle = borderSubtle
          ctx.lineWidth   = 1
          ctx.setLineDash([6, 4])
          ctx.lineDashOffset = dashOffsetRef.current
        } else {
          ctx.shadowBlur  = 0
          ctx.strokeStyle = `${STATUS_COLORS.active}40`
          ctx.lineWidth   = 1.5
          ctx.setLineDash([8, 6])
          ctx.lineDashOffset = dashOffsetRef.current
        }
        ctx.stroke()
        ctx.setLineDash([])
        ctx.shadowBlur = 0
      })

      // Draw nodes
      filteredNodes.forEach((node) => {
        const isHovered   = hoveredNode === node.id
        const isConnected = connectedNodes.has(node.id)
        const isDimmed    = !!(hoveredNode && !isHovered && !isConnected)
        const size        = 14 + node.impact * 5

        if (isHovered || isConnected) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, size + 12, 0, Math.PI * 2)
          const g = ctx.createRadialGradient(node.x, node.y, size, node.x, node.y, size + 20)
          g.addColorStop(0, `${STATUS_COLORS[node.status]}50`)
          g.addColorStop(1, "transparent")
          ctx.fillStyle = g
          ctx.fill()
        }

        if (isHovered) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, size + 6, 0, Math.PI * 2)
          ctx.strokeStyle = `${STATUS_COLORS[node.status]}80`
          ctx.lineWidth   = 2
          ctx.stroke()
        }

        ctx.beginPath()
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2)
        if (isDimmed) {
          ctx.fillStyle = "rgba(255,255,255,0.08)"
        } else {
          const g = ctx.createRadialGradient(
            node.x - size * 0.3, node.y - size * 0.3, 0,
            node.x, node.y, size
          )
          g.addColorStop(0, STATUS_COLORS[node.status])
          g.addColorStop(1, `${STATUS_COLORS[node.status]}99`)
          ctx.fillStyle = g
        }
        ctx.fill()
        ctx.strokeStyle = isDimmed ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.4)"
        ctx.lineWidth   = isDimmed ? 1 : 2
        ctx.stroke()

        const labelY    = node.y + size + 20
        ctx.font        = "bold 12px Inter, sans-serif"
        const textWidth = ctx.measureText(node.title).width
        ctx.fillStyle   = isDimmed ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.6)"
        ctx.beginPath()
        ctx.roundRect(node.x - textWidth / 2 - 6, labelY - 10, textWidth + 12, 18, 4)
        ctx.fill()
        ctx.fillStyle    = isDimmed ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.95)"
        ctx.textAlign    = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(node.title, node.x, labelY)
      })

      ctx.restore()
      requestAnimationFrame(render)
    }

    render()
  }, [nodes, filteredNodes, hoveredNode, zoom, pan, edges, getConnectedNodes, STATUS_COLORS])

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top  - pan.y) / zoom

    if (draggedNode) {
      setNodes((prev) => prev.map((n) => n.id === draggedNode ? { ...n, x, y, vx: 0, vy: 0 } : n))
      return
    }

    let found = false
    for (const node of filteredNodes) {
      const size = 14 + node.impact * 5
      const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2)
      if (dist < size + 10) { setHoveredNode(node.id); found = true; break }
    }
    if (!found) setHoveredNode(null)
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top  - pan.y) / zoom
    if (hoveredNode) { setDraggedNode(hoveredNode); setDragStart({ x, y }) }
  }

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect    = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const x       = (screenX - pan.x) / zoom
    const y       = (screenY - pan.y) / zoom

    if (draggedNode && dragStart) {
      const dist = Math.sqrt((x - dragStart.x) ** 2 + (y - dragStart.y) ** 2)
      if (dist < 5) {
        const node = nodes.find((n) => n.id === draggedNode)
        if (node) setTooltipNode({ node, x: screenX, y: screenY })
      }
    }
    setDraggedNode(null)
    setDragStart(null)
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect    = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    if (hoveredNode && !draggedNode) {
      const node = nodes.find((n) => n.id === hoveredNode)
      if (node) setTooltipNode({ node, x: screenX, y: screenY })
    } else if (!hoveredNode) {
      setTooltipNode(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[600px] overflow-hidden bg-bg-body">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full cursor-crosshair"
        role="img"
        aria-label="Decision relationship graph showing connections between decisions"
        onMouseMove={handleCanvasMouseMove}
        onMouseDown={handleCanvasMouseDown}
        onMouseUp={handleCanvasMouseUp}
        onClick={handleCanvasClick}
        onMouseLeave={() => setHoveredNode(null)}
      />

      {/* Empty / loading state */}
      {!isLoading && nodes.length === 0 && (
        <EmptyMapState onCreateClick={() => router.push("/")} />
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 space-y-3">
        <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-xl">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" />
            Relationship Map
          </h2>
          <div className="space-y-2">
            {(Object.entries(STATUS_COLORS) as [MapStatus, string][]).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }} />
                <span className="text-xs text-white/60">{STATUS_LABELS[status]}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-full bg-white/20" style={{ width: 6 + i * 3, height: 6 + i * 3 }} />
              ))}
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider">= Impact</span>
          </div>
          <div className="mt-2 text-[10px] text-white/30 font-mono">
            {nodes.length} decision{nodes.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter nodes..."
            aria-label="Filter relationship map nodes"
            className="w-52 pl-9 pr-3 py-2.5 bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <button onClick={() => setZoom((z) => Math.min(2, z + 0.15))} aria-label="Zoom in"
          className="p-2.5 bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all">
          <ZoomIn className="w-4 h-4 text-white/70" />
        </button>
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))} aria-label="Zoom out"
          className="p-2.5 bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all">
          <ZoomOut className="w-4 h-4 text-white/70" />
        </button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} aria-label="Reset view"
          className="p-2.5 bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all">
          <Maximize2 className="w-4 h-4 text-white/70" />
        </button>
        <span className="text-xs text-white/40 font-mono ml-2 bg-white/5 px-2 py-1 rounded">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Mini-map */}
      <div className="absolute bottom-4 right-4 w-36 h-28 bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        <svg width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
          {edges.map((edge, i) => {
            const src = nodes.find((n) => n.id === edge.source)
            const tgt = nodes.find((n) => n.id === edge.target)
            if (!src || !tgt) return null
            return <line key={i} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke={STATUS_COLORS.active + "4d"} strokeWidth={6} />
          })}
          {nodes.map((node) => (
            <circle key={node.id} cx={node.x} cy={node.y} r={10} fill={STATUS_COLORS[node.status]} />
          ))}
        </svg>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-64"
            style={{ left: Math.min(tooltipNode.x, 800 - 280), top: tooltipNode.y + 20 }}
          >
            <div className="bg-[#0a0f18]/95 backdrop-blur-2xl border border-white/15 rounded-xl p-4 shadow-2xl shadow-black/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold text-sm">{tooltipNode.node.title}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[tooltipNode.node.status] }} />
                    <span className="text-xs font-medium" style={{ color: STATUS_COLORS[tooltipNode.node.status] }}>
                      {STATUS_LABELS[tooltipNode.node.status]}
                    </span>
                  </div>
                </div>
                <button onClick={() => setTooltipNode(null)} aria-label="Close tooltip"
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-3.5 h-3.5 text-white/40" />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/40 uppercase tracking-wider">Impact</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-5 h-1.5 rounded-full transition-colors"
                        style={{ backgroundColor: i <= tooltipNode.node.impact ? STATUS_COLORS[tooltipNode.node.status] : "rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/40 uppercase tracking-wider">Quality</span>
                  <span className="text-xs text-white/70 font-mono">{tooltipNode.node.qualityScore}/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/40 uppercase tracking-wider">Connections</span>
                  <span className="text-xs text-white/70 font-mono flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    {getConnectedNodes(tooltipNode.node.id).size} linked
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => { router.push(`/decisions/${tooltipNode.node.id}`); setTooltipNode(null) }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-primary/20 text-primary text-xs font-medium rounded-lg hover:bg-cyan-500/30 transition-colors"
                >
                  View Details
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Details Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 w-80 bg-[#0a0f18]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold">{selectedNode.title}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full mt-1.5 inline-block"
                  style={{ backgroundColor: `${STATUS_COLORS[selectedNode.status]}20`, color: STATUS_COLORS[selectedNode.status] }}>
                  {STATUS_LABELS[selectedNode.status]}
                </span>
              </div>
              <button onClick={() => setSelectedNode(null)} aria-label="Close panel"
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Impact Score</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex-1 h-3 rounded-full transition-colors"
                      style={{ backgroundColor: i <= selectedNode.impact ? STATUS_COLORS[selectedNode.status] : "rgba(255,255,255,0.1)" }} />
                  ))}
                </div>
                <p className="text-xs text-white/50 mt-1 font-mono">
                  {selectedNode.impact}/5 · Quality {selectedNode.qualityScore}/100
                </p>
              </div>

              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Dependencies</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(getConnectedNodes(selectedNode.id)).map((id) => {
                    const node = nodes.find((n) => n.id === id)
                    if (!node) return null
                    return (
                      <span key={id} className="text-xs px-2 py-1 rounded-md bg-white/5 text-white/70 border border-white/10">
                        {node.title}
                      </span>
                    )
                  })}
                  {getConnectedNodes(selectedNode.id).size === 0 && (
                    <span className="text-xs text-white/30">No dependencies</span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex gap-2">
                <button
                  onClick={() => router.push(`/decisions/${selectedNode.id}`)}
                  className="flex-1 py-2.5 bg-primary/20 text-primary text-sm font-medium rounded-xl hover:bg-cyan-500/30 transition-colors"
                >
                  Open Decision
                </button>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="flex-1 py-2.5 bg-white/5 text-white/60 text-sm font-medium rounded-xl hover:bg-white/10 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
