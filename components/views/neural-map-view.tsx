"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, ZoomIn, ZoomOut, Maximize2, ArrowRight, Link2, Network, Plus } from "lucide-react"
import { useDecisionsStore, useSettingsStore } from "@/stores"
import type { Decision as StoreDecision, DecisionStatus } from "@/lib/types"

// ─── Internal map types ───────────────────────────────────────────────────────

type MapStatus = "active" | "pending" | "resolved" | "blocked"

interface MapNode {
  id: string
  title: string
  status: MapStatus
  impact: number
  qualityScore: number
  tsMs: number // last-activity timestamp, drives recency dimming
  x: number
  y: number
  vx: number
  vy: number
}

interface Edge {
  source: string
  target: string
}

// ─── Colour + status semantics ─────────────────────────────────────────────────
// active=primary action, pending=review, resolved=aligned, blocked=risk.
function getStatusColors(): Record<MapStatus, string> {
  return {
    active: "#e879f9",
    pending: "#f59e0b",
    resolved: "#14b8a6",
    blocked: "#f43f5e",
  }
}

const STATUS_LABELS: Record<MapStatus, string> = {
  active: "Active",
  pending: "Review",
  resolved: "Aligned",
  blocked: "Blocked",
}

function mapDecisionStatus(s: DecisionStatus): MapStatus {
  switch (s) {
    case "in-progress": return "active"
    case "decided":     return "resolved"
    case "archived":    return "resolved"
    case "voided":      return "blocked"
    case "superseded":  return "blocked"
    default:            return "pending" // "draft"
  }
}

// Calm, restrained node sizing — small enough to read as a constellation.
function nodeRadius(impact: number): number {
  return 6.5 + impact * 2.2
}

// Older decisions fade like distant stars (memory topology / decay echo).
function recencyAlpha(tsMs: number, now: number): number {
  const days = (now - tsMs) / 86_400_000
  return Math.max(0.45, 1 - days / 120)
}

// ─── Layout helpers ─────────────────────────────────────────────────────────

function initialPosition(index: number, total: number, w: number, h: number): { x: number; y: number } {
  const angle = (2 * Math.PI * index) / Math.max(total, 1)
  const radius = Math.min(Math.min(w, h) * 0.38, 120 + total * 16)
  return { x: w / 2 + radius * Math.cos(angle), y: h / 2 + radius * Math.sin(angle) }
}

function storeToMapNode(
  d: StoreDecision,
  index: number,
  total: number,
  w: number,
  h: number,
  existing?: MapNode
): MapNode {
  const pos = existing ?? initialPosition(index, total, w, h)
  return {
    id: d.id,
    title: d.title,
    status: mapDecisionStatus(d.status),
    impact: d.impact,
    qualityScore: d.qualityScore,
    tsMs: new Date(d.updatedAt ?? d.createdAt).getTime(),
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
      <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
        <Network className="w-8 h-8 text-white/55" />
      </div>
      <div className="text-center">
        <p className="text-white/50 text-sm font-medium mb-1">No decisions in the map</p>
        <p className="text-white/55 text-xs">Create your first decision to see it take shape here</p>
      </div>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/15"
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

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | undefined>(undefined)

  // Simulation + view state live in refs so the animation loop never triggers a
  // React re-render. A single rAF loop both steps the physics and paints.
  const simRef = useRef<MapNode[]>([])
  const edgesRef = useRef<Edge[]>([])
  const viewRef = useRef({ zoom: 1, panX: 0, panY: 0 })
  const sizeRef = useRef({ w: 800, h: 600, dpr: 1 })
  const hoverRef = useRef<string | null>(null)
  const selectedRef = useRef<string | null>(null)
  const searchRef = useRef("")
  const colorsRef = useRef(getStatusColors())
  const reducedMotionRef = useRef(settings.reducedMotion)
  const dragRef = useRef<{ id: string | null; pan: boolean; moved: boolean; sx: number; sy: number; px: number; py: number }>(
    { id: null, pan: false, moved: false, sx: 0, sy: 0, px: 0, py: 0 }
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [zoomPct, setZoomPct] = useState(100)
  const [cursor, setCursor] = useState<"grab" | "grabbing" | "pointer">("grab")
  const cursorRef = useRef<"grab" | "grabbing" | "pointer">("grab")
  const [nodeCount, setNodeCount] = useState(0)

  // Only re-render when the cursor actually changes (mousemove fires constantly).
  const applyCursor = useCallback((c: "grab" | "grabbing" | "pointer") => {
    if (cursorRef.current === c) return
    cursorRef.current = c
    setCursor(c)
  }, [])

  // ── Keep refs in sync with reactive inputs ────────────────────────────────
  useEffect(() => { selectedRef.current = selectedId }, [selectedId])
  useEffect(() => { searchRef.current = searchQuery.toLowerCase() }, [searchQuery])
  useEffect(() => { reducedMotionRef.current = settings.reducedMotion }, [settings.reducedMotion])

  // ── Edges derived from echoTargets (id or title references) ───────────────
  const edges = useMemo<Edge[]>(() => {
    const idSet = new Set(storeDecisions.map((d) => d.id))
    const titleToId = new Map(storeDecisions.map((d) => [d.title, d.id]))
    const result: Edge[] = []
    storeDecisions.forEach((d) => {
      d.echoTargets?.forEach((target) => {
        const targetId = idSet.has(target) ? target : titleToId.get(target)
        if (targetId && targetId !== d.id) result.push({ source: d.id, target: targetId })
      })
    })
    return result
  }, [storeDecisions])

  useEffect(() => { edgesRef.current = edges }, [edges])

  const connectedTo = useCallback((nodeId: string): Set<string> => {
    const connected = new Set<string>()
    edges.forEach((e) => {
      if (e.source === nodeId) connected.add(e.target)
      if (e.target === nodeId) connected.add(e.source)
    })
    return connected
  }, [edges])

  // ── Sync store decisions → simulation nodes (preserve existing positions) ──
  useEffect(() => {
    const { w, h } = sizeRef.current
    const prev = new Map(simRef.current.map((n) => [n.id, n]))
    simRef.current = storeDecisions.map((d, i) =>
      storeToMapNode(d, i, storeDecisions.length, w, h, prev.get(d.id))
    )
    setNodeCount(storeDecisions.length)
    // Drop selection if the decision disappeared
    if (selectedRef.current && !storeDecisions.some((d) => d.id === selectedRef.current)) {
      setSelectedId(null)
    }
  }, [storeDecisions])

  // ── DPR-aware canvas sizing (fixes blur + scaling) ────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = container.getBoundingClientRect()
      const w = Math.max(1, Math.round(rect.width))
      const h = Math.max(1, Math.round(rect.height))
      sizeRef.current = { w, h, dpr }
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // ── Single animation loop: step physics, then paint ───────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const step = () => {
      const nodes = simRef.current
      const edges = edgesRef.current
      const { w, h } = sizeRef.current
      const dragId = dragRef.current.id
      const cx = w / 2
      const cy = h / 2

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.id === dragId) continue
        const rI = nodeRadius(node.impact)

        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue
          const other = nodes[j]
          const dx = node.x - other.x
          const dy = node.y - other.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const minDist = rI + nodeRadius(other.impact) + 64
          if (dist < minDist) {
            const force = (minDist - dist) * 0.12
            node.vx += (dx / dist) * force
            node.vy += (dy / dist) * force
          } else {
            const force = 900 / (dist * dist)
            node.vx += (dx / dist) * force
            node.vy += (dy / dist) * force
          }
        }

        for (const e of edges) {
          if (e.source === node.id || e.target === node.id) {
            const otherId = e.source === node.id ? e.target : e.source
            const other = nodes.find((n) => n.id === otherId)
            if (other) {
              node.vx += (other.x - node.x) * 0.0035
              node.vy += (other.y - node.y) * 0.0035
            }
          }
        }

        node.vx += (cx - node.x) * 0.0009
        node.vy += (cy - node.y) * 0.0009
        node.vx *= 0.84
        node.vy *= 0.84
        node.x += node.vx
        node.y += node.vy
        const m = rI + 8
        node.x = Math.max(m, Math.min(w - m, node.x))
        node.y = Math.max(m, Math.min(h - m, node.y))
      }
    }

    const draw = () => {
      const { w, h, dpr } = sizeRef.current
      const { zoom, panX, panY } = viewRef.current
      const colors = colorsRef.current
      const nodes = simRef.current
      const edges = edgesRef.current
      const hovered = hoverRef.current
      const selected = selectedRef.current
      const query = searchRef.current
      const focusId = hovered ?? selected
      const now = Date.now()

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.translate(panX, panY)
      ctx.scale(zoom, zoom)

      const connected = focusId
        ? (() => {
            const set = new Set<string>()
            edges.forEach((e) => {
              if (e.source === focusId) set.add(e.target)
              if (e.target === focusId) set.add(e.source)
            })
            return set
          })()
        : null

      const matches = (n: MapNode) => query === "" || n.title.toLowerCase().includes(query)

      // Edges
      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source)
        const target = nodes.find((n) => n.id === edge.target)
        if (!source || !target) continue
        const onFocus = focusId === edge.source || focusId === edge.target
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        if (onFocus) {
          ctx.strokeStyle = colors.active
          ctx.lineWidth = 1.35
          ctx.globalAlpha = 0.65
          ctx.setLineDash([])
        } else {
          ctx.strokeStyle = "rgba(255,255,255,0.08)"
          ctx.lineWidth = 1
          ctx.globalAlpha = focusId ? 0.18 : 0.42
          ctx.setLineDash([])
        }
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
      }

      // Nodes
      for (const node of nodes) {
        const isFocus = focusId === node.id
        const isNear = connected?.has(node.id) ?? false
        const dimmed = (!!focusId && !isFocus && !isNear) || !matches(node)
        const r = nodeRadius(node.impact)
        const color = colors[node.status]
        const recency = recencyAlpha(node.tsMs, now)

        // Soft halo for the focused / connected nodes
        if (isFocus || isNear) {
          const g = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r + 13)
          g.addColorStop(0, `${color}2f`)
          g.addColorStop(1, "transparent")
          ctx.beginPath()
          ctx.arc(node.x, node.y, r + 13, 0, Math.PI * 2)
          ctx.fillStyle = g
          ctx.fill()
        }

        // Selection ring
        if (selected === node.id) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, r + 5, 0, Math.PI * 2)
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.globalAlpha = 0.9
          ctx.stroke()
          ctx.globalAlpha = 1
        }

        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        ctx.globalAlpha = dimmed ? 0.18 : recency
        ctx.fillStyle = color
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.lineWidth = 1
        ctx.strokeStyle = dimmed ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.22)"
        ctx.stroke()

        // Labels — only where they carry meaning (keeps the constellation calm)
        const showLabel =
          !dimmed && (isFocus || isNear || selected === node.id || node.impact >= 4 || nodes.length <= 6)
        if (showLabel) {
          ctx.font = "500 11px Inter, system-ui, sans-serif"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          const label = node.title.length > 26 ? `${node.title.slice(0, 25)}…` : node.title
          const tw = ctx.measureText(label).width
          const ly = node.y + r + 13
          ctx.fillStyle = "rgba(8,11,18,0.7)"
          ctx.beginPath()
          ctx.roundRect(node.x - tw / 2 - 5, ly - 8, tw + 10, 16, 4)
          ctx.fill()
          ctx.globalAlpha = isFocus || selected === node.id ? 1 : 0.7
          ctx.fillStyle = "rgba(255,255,255,0.92)"
          ctx.fillText(label, node.x, ly)
          ctx.globalAlpha = 1
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    const loop = () => {
      step()
      draw()
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // ── Pointer interaction ───────────────────────────────────────────────────
  const worldFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const { zoom, panX, panY } = viewRef.current
    return { sx, sy, x: (sx - panX) / zoom, y: (sy - panY) / zoom }
  }

  const hitTest = (x: number, y: number): MapNode | null => {
    const query = searchRef.current
    // iterate in reverse so the topmost (last-drawn) wins
    for (let i = simRef.current.length - 1; i >= 0; i--) {
      const n = simRef.current[i]
      if (query && !n.title.toLowerCase().includes(query)) continue
      const r = nodeRadius(n.impact)
      if ((x - n.x) ** 2 + (y - n.y) ** 2 <= (r + 6) ** 2) return n
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { sx, sy, x, y } = worldFromEvent(e)
    const hit = hitTest(x, y)
    if (hit) {
      dragRef.current = { id: hit.id, pan: false, moved: false, sx, sy, px: 0, py: 0 }
    } else {
      dragRef.current = {
        id: null, pan: true, moved: false, sx, sy,
        px: viewRef.current.panX, py: viewRef.current.panY,
      }
      applyCursor("grabbing")
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { sx, sy, x, y } = worldFromEvent(e)
    const drag = dragRef.current

    if (drag.id) {
      const node = simRef.current.find((n) => n.id === drag.id)
      if (node) { node.x = x; node.y = y; node.vx = 0; node.vy = 0 }
      drag.moved = true
      return
    }
    if (drag.pan) {
      viewRef.current.panX = drag.px + (sx - drag.sx)
      viewRef.current.panY = drag.py + (sy - drag.sy)
      drag.moved = true
      return
    }

    const hit = hitTest(x, y)
    hoverRef.current = hit?.id ?? null
    applyCursor(hit ? "pointer" : "grab")
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    const { x, y } = worldFromEvent(e)
    // A click (no drag movement) on a node selects it
    if (!drag.moved) {
      const hit = hitTest(x, y)
      setSelectedId(hit ? hit.id : null)
    }
    dragRef.current = { id: null, pan: false, moved: false, sx: 0, sy: 0, px: 0, py: 0 }
    applyCursor(hoverRef.current ? "pointer" : "grab")
  }

  const handleMouseLeave = () => {
    hoverRef.current = null
    dragRef.current = { id: null, pan: false, moved: false, sx: 0, sy: 0, px: 0, py: 0 }
    applyCursor("grab")
  }

  const setZoom = (next: number) => {
    const z = Math.max(0.5, Math.min(2.2, next))
    viewRef.current.zoom = z
    setZoomPct(Math.round(z * 100))
  }
  const resetView = () => {
    viewRef.current = { zoom: 1, panX: 0, panY: 0 }
    setZoomPct(100)
  }

  // ── Selected decision (rich data for the detail panel) ────────────────────
  const colors = useMemo(() => getStatusColors(), [])
  const selected = useMemo(
    () => storeDecisions.find((d) => d.id === selectedId) ?? null,
    [storeDecisions, selectedId]
  )
  const selectedStatus: MapStatus | null = selected ? mapDecisionStatus(selected.status) : null
  const dependencies = useMemo(
    () => (selectedId ? Array.from(connectedTo(selectedId)) : []),
    [selectedId, connectedTo]
  )

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[600px] overflow-hidden bg-bg-body">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor }}
        role="img"
        aria-label="Decision memory map showing how decisions connect"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />

      {/* Empty / loading state */}
      {!isLoading && nodeCount === 0 && (
        <EmptyMapState onCreateClick={() => router.push("/app")} />
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Legend + search */}
      <div className="absolute top-4 left-4 space-y-3">
        <div className="rounded-lg border border-hairline bg-surface-1 p-4 backdrop-blur-xl">
          <h2 className="text-xs font-medium uppercase text-white/55 mb-3 flex items-center gap-2">
            <Network className="w-3.5 h-3.5 text-primary/70" />
            Decision Observatory
          </h2>
          <div className="space-y-1.5">
            {(Object.entries(colors) as [MapStatus, string][]).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-white/55">{STATUS_LABELS[status]}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-hairline flex items-center gap-2">
            <div className="flex items-end gap-0.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-full bg-white/25" style={{ width: 4 + i * 2, height: 4 + i * 2 }} />
              ))}
            </div>
            <span className="text-[11px] text-white/55 uppercase">= impact · dimmer = older</span>
          </div>
          <div className="mt-2 text-[11px] text-white/55 font-mono">
            {nodeCount} decision{nodeCount !== 1 ? "s" : ""} · {edges.length} link{edges.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/55" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter memory…"
            aria-label="Filter decision memory nodes"
            className="w-52 rounded-lg border border-hairline bg-surface-1 py-2.5 pl-9 pr-3 text-sm text-white backdrop-blur-xl transition-colors placeholder:text-white/45 focus:border-primary/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <button onClick={() => setZoom(viewRef.current.zoom + 0.15)} aria-label="Zoom in"
          className="rounded-lg border border-hairline bg-surface-1 p-2.5 backdrop-blur-xl transition-colors hover:border-white/20 hover:bg-white/10">
          <ZoomIn className="w-4 h-4 text-white/70" />
        </button>
        <button onClick={() => setZoom(viewRef.current.zoom - 0.15)} aria-label="Zoom out"
          className="rounded-lg border border-hairline bg-surface-1 p-2.5 backdrop-blur-xl transition-colors hover:border-white/20 hover:bg-white/10">
          <ZoomOut className="w-4 h-4 text-white/70" />
        </button>
        <button onClick={resetView} aria-label="Reset view"
          className="rounded-lg border border-hairline bg-surface-1 p-2.5 backdrop-blur-xl transition-colors hover:border-white/20 hover:bg-white/10">
          <Maximize2 className="w-4 h-4 text-white/70" />
        </button>
        <span className="text-xs text-white/55 font-mono ml-2 bg-white/5 px-2 py-1 rounded">
          {zoomPct}%
        </span>
      </div>

      {/* Detail panel — opens on node click */}
      <AnimatePresence>
        {selected && selectedStatus && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18 }}
            className="absolute top-4 right-4 w-80 max-w-[calc(100%-2rem)] rounded-lg border border-white/10 bg-bg-card/95 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.34)] backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h3 className="text-white font-semibold leading-snug text-balance">{selected.title}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full mt-1.5 inline-block"
                  style={{ backgroundColor: `${colors[selectedStatus]}20`, color: colors[selectedStatus] }}>
                  {STATUS_LABELS[selectedStatus]}
                </span>
              </div>
              <button onClick={() => setSelectedId(null)} aria-label="Close panel"
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0">
                <X className="w-4 h-4 text-white/55" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-medium uppercase text-white/55 mb-2">Impact</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex-1 h-2.5 rounded-full"
                      style={{ backgroundColor: i <= selected.impact ? colors[selectedStatus] : "rgba(255,255,255,0.08)" }} />
                  ))}
                </div>
                <p className="text-xs text-white/55 mt-1.5 font-mono">
                  {selected.impact}/5 · record {selected.qualityScore}% complete
                </p>
              </div>

              {selected.revisitAt && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase text-white/55">Revisit</span>
                  <span className="text-xs text-white/65 font-mono">{formatDate(selected.revisitAt)}</span>
                </div>
              )}

              {selected.executionTrail && selected.executionTrail.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase text-white/55">Execution</span>
                  <span className="text-xs text-white/65 font-mono">
                    {selected.executionTrail.filter((s) => s.done).length}/{selected.executionTrail.length} done
                  </span>
                </div>
              )}

              <div>
                <p className="text-[11px] font-medium uppercase text-white/55 mb-2 flex items-center gap-1.5">
                  <Link2 className="w-3 h-3" />
                  Connected ({dependencies.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {dependencies.map((id) => {
                    const dep = storeDecisions.find((d) => d.id === id)
                    if (!dep) return null
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedId(id)}
                        className="text-xs px-2 py-1 rounded-md bg-white/5 text-white/65 border border-white/10 hover:border-white/25 hover:text-white/85 transition-colors max-w-[140px] truncate"
                      >
                        {dep.title}
                      </button>
                    )
                  })}
                  {dependencies.length === 0 && (
                    <span className="text-xs text-white/55">No connections yet</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => router.push(`/decisions/${selected.id}`)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
              >
                Open Decision
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
