"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSettingsStore } from "@/stores"

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  baseX: number
  baseY: number
}

/**
 * Read a CSS custom property's computed value from `<html>`.
 * Returns the raw string (e.g. "rgba(6, 182, 212, 0.4)").
 */
function getCSSVar(name: string): string {
  if (typeof window === "undefined") return ""
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const animationRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)

  const ambientMotion = useSettingsStore((s) => s.settings.ambientMotion)

  const initNodes = useCallback((width: number, height: number) => {
    const nodes: Node[] = []
    const nodeCount = 35
    for (let i = 0; i < nodeCount; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      nodes.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        baseX: x,
        baseY: y,
      })
    }
    return nodes
  }, [])

  useEffect(() => {
    // Respect the user setting
    if (!ambientMotion) return

    const canvas = canvasRef.current
    if (!canvas) return

    // Check for reduced motion preference or touch device
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isTouchDevice = "ontouchstart" in window
    if (prefersReducedMotion || isTouchDevice) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      nodesRef.current = initNodes(canvas.width, canvas.height)
    }
    resize()
    window.addEventListener("resize", resize)

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener("mousemove", handleMouseMove)

    const animate = (timestamp: number) => {
      // Throttle to ~30fps
      if (timestamp - lastFrameRef.current < 33) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      lastFrameRef.current = timestamp

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const nodes = nodesRef.current
      const mouse = mouseRef.current

      // Read theme-aware colour each frame (cheap; computed style is cached)
      const accentAlpha = getCSSVar("--accent-primary-alpha") || "rgba(6, 182, 212, 0.4)"
      const secondaryGlow = getCSSVar("--secondary-glow") || "rgba(139, 92, 246, 0.4)"

      // Update and draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]

        // Mouse interaction - gentle repel
        const dx = mouse.x - node.x
        const dy = mouse.y - node.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150 && dist > 0) {
          const force = (150 - dist) / 150
          node.vx -= (dx / dist) * force * 0.5
          node.vy -= (dy / dist) * force * 0.5
        }

        // Return to base position
        node.vx += (node.baseX - node.x) * 0.002
        node.vy += (node.baseY - node.y) * 0.002

        // Apply velocity with damping
        node.vx *= 0.98
        node.vy *= 0.98
        node.x += node.vx
        node.y += node.vy

        // Draw node — using theme accent
        ctx.beginPath()
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = accentAlpha
        ctx.fill()

        // Draw connections
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j]
          const connDx = other.x - node.x
          const connDy = other.y - node.y
          const connDist = Math.sqrt(connDx * connDx + connDy * connDy)
          
          if (connDist < 150) {
            const alpha = (1 - connDist / 150) * 0.15
            const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y)
            gradient.addColorStop(0, accentAlpha.replace(/[\d.]+\)$/, `${alpha})`))
            gradient.addColorStop(1, secondaryGlow.replace(/[\d.]+\)$/, `${alpha})`))
            
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.strokeStyle = gradient
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(animationRef.current)
    }
  }, [initNodes, ambientMotion])

  // Don't render canvas at all when disabled
  if (!ambientMotion) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  )
}
