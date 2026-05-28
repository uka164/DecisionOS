#!/usr/bin/env node
/**
 * Visual Regression Baseline Checker
 *
 * MODES
 *   node scripts/visual-check.mjs                   → compare current screenshots to baseline
 *   node scripts/visual-check.mjs --update-baseline  → regenerate baseline PNGs (run after intentional UI changes)
 *
 * HOW TO UPDATE THE BASELINE AFTER AN INTENTIONAL UI CHANGE
 *   1. Make your UI change and verify it looks correct in the browser.
 *   2. Ensure the dev server is running: npm run dev
 *   3. Run: npm run visual:baseline
 *   4. Inspect the new PNGs in __screenshots__/baseline/ to confirm they are correct.
 *   5. Commit the updated PNGs alongside your UI change — they are the new reference.
 *
 * REQUIREMENTS
 *   - Dev server must be running on BASE_URL (default: http://localhost:3000)
 *   - Run `npx playwright install chromium` once to download the browser binary
 */

import { chromium } from "playwright"
import { PNG } from "pngjs"
import pixelmatch from "pixelmatch"
import fs from "fs"
import path from "path"
import http from "http"
import { spawn } from "child_process"
import { fileURLToPath } from "url"

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000"
const MAX_DIFF_PCT = 2 // percent of differing pixels before failure
const PIXELMATCH_THRESHOLD = 0.1 // per-pixel sensitivity (0–1, lower = stricter)
const UPDATE = process.argv.includes("--update-baseline")
const VIEWPORT = { width: 1280, height: 800 }
const STORAGE_KEY = "decisionos_store"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")

const DIRS = {
  baseline: path.join(ROOT, "__screenshots__", "baseline"),
  current: path.join(ROOT, "__screenshots__", "current"),
  diff: path.join(ROOT, "__screenshots__", "diff"),
}

// ─── Pages to capture ─────────────────────────────────────────────────────────

/** @type {Array<{ name: string, url: string, prepare: (page: import('playwright').Page) => Promise<void> }>} */
const SHOTS = [
  {
    name: "dashboard",
    url: "/app",
    prepare: async (page) => {
      await page.waitForLoadState("networkidle")
    },
  },
  {
    name: "decision-detail",
    url: "/decisions/static-d1",
    prepare: async (page) => {
      await page.waitForLoadState("networkidle")
    },
  },
  {
    name: "settings",
    url: "/settings",
    prepare: async (page) => {
      await page.waitForLoadState("networkidle")
    },
  },
  {
    name: "wizard-step1",
    url: "/app",
    prepare: async (page) => {
      await page.waitForLoadState("networkidle")
      await page.getByRole("button", { name: /log a decision/i }).click()
      await page
        .getByRole("dialog", { name: /new decision wizard/i })
        .waitFor({ state: "visible" })
      // Wait for entry animation to complete
      await page.waitForTimeout(400)
    },
  },
]

// ─── Image helpers ────────────────────────────────────────────────────────────

function readPNG(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath))
}

function canReachBaseUrl() {
  return new Promise((resolve) => {
    const request = http.get(BASE_URL, (response) => {
      response.resume()
      resolve(response.statusCode && response.statusCode < 500)
    })
    request.on("error", () => resolve(false))
    request.setTimeout(1_000, () => {
      request.destroy()
      resolve(false)
    })
  })
}

async function ensureServer() {
  if (await canReachBaseUrl()) return null

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"
  const server = spawn(npmCommand, ["run", "dev"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  })

  server.stdout.on("data", (chunk) => process.stdout.write(chunk))
  server.stderr.on("data", (chunk) => process.stderr.write(chunk))

  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    if (await canReachBaseUrl()) return server
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }

  server.kill()
  throw new Error(`Timed out waiting for ${BASE_URL}`)
}

function writePNG(filePath, png) {
  fs.writeFileSync(filePath, PNG.sync.write(png))
}

function ensureDirs() {
  for (const dir of Object.values(DIRS)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// ─── Comparison ───────────────────────────────────────────────────────────────

/** @returns {{ pct: number, pass: boolean, message: string }} */
function compare(name) {
  const baselinePath = path.join(DIRS.baseline, `${name}.png`)
  const currentPath = path.join(DIRS.current, `${name}.png`)

  if (!fs.existsSync(baselinePath)) {
    return {
      pct: Infinity,
      pass: false,
      message: `no baseline — run with --update-baseline first`,
    }
  }

  const baseline = readPNG(baselinePath)
  const current = readPNG(currentPath)
  const { width, height } = baseline

  if (current.width !== width || current.height !== height) {
    return {
      pct: Infinity,
      pass: false,
      message: `size changed: ${current.width}×${current.height} vs baseline ${width}×${height}`,
    }
  }

  const diffPNG = new PNG({ width, height })
  const diffPixels = pixelmatch(
    baseline.data,
    current.data,
    diffPNG.data,
    width,
    height,
    { threshold: PIXELMATCH_THRESHOLD }
  )

  const totalPixels = width * height
  const pct = (diffPixels / totalPixels) * 100

  if (pct > 0) {
    writePNG(path.join(DIRS.diff, `${name}.png`), diffPNG)
  }

  return {
    pct,
    pass: pct <= MAX_DIFF_PCT,
    message: pct === 0 ? "pixel-perfect" : `${pct.toFixed(2)}% diff`,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  ensureDirs()

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: VIEWPORT,
    reducedMotion: "reduce",
    colorScheme: "dark",
  })
  await context.addInitScript((key) => window.localStorage.removeItem(key), STORAGE_KEY)

  const results = []

  for (const shot of SHOTS) {
    const page = await context.newPage()
    try {
      await page.goto(`${BASE_URL}${shot.url}`, { waitUntil: "load" })
      await shot.prepare(page)

      const dest = UPDATE
        ? path.join(DIRS.baseline, `${shot.name}.png`)
        : path.join(DIRS.current, `${shot.name}.png`)

      await page.screenshot({ path: dest, fullPage: false })

      if (UPDATE) {
        console.log(`  📸  ${shot.name}.png`)
        results.push({ name: shot.name, pass: true, message: "saved" })
      } else {
        const result = compare(shot.name)
        const icon = result.pass ? "✓" : "✗"
        console.log(`  ${icon}  ${shot.name.padEnd(20)} ${result.message}`)
        results.push({ name: shot.name, ...result })
      }
    } catch (err) {
      console.error(`  ✗  ${shot.name.padEnd(20)} ERROR: ${err.message}`)
      results.push({ name: shot.name, pct: Infinity, pass: false, message: err.message })
    } finally {
      await page.close()
    }
  }

  await browser.close()
  return results
}

;(async () => {
  const mode = UPDATE ? "Generating baselines" : `Checking visual regressions (threshold: ${MAX_DIFF_PCT}%)`
  console.log(`\n🖼   ${mode}`)
  console.log(`    Base URL : ${BASE_URL}`)
  console.log(`    Viewport : ${VIEWPORT.width}×${VIEWPORT.height}\n`)

  const server = await ensureServer()
  const results = await run().finally(() => {
    if (server) server.kill()
  })

  if (UPDATE) {
    console.log(`\n✅  Baselines written to __screenshots__/baseline/`)
    console.log(`    Review the PNGs, then commit them as the new reference.\n`)
    process.exit(0)
  }

  const failures = results.filter((r) => !r.pass)
  if (failures.length === 0) {
    console.log(`\n✅  All ${results.length} pages within the ${MAX_DIFF_PCT}% threshold\n`)
    process.exit(0)
  } else {
    console.error(`\n❌  ${failures.length} / ${results.length} page(s) exceeded the ${MAX_DIFF_PCT}% threshold`)
    console.error(`    Diffs saved to __screenshots__/diff/`)
    console.error(`    To accept changes: npm run visual:baseline\n`)
    process.exit(1)
  }
})()
