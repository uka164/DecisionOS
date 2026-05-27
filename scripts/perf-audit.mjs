#!/usr/bin/env node

import fs from "fs"
import http from "http"
import path from "path"
import { spawn } from "child_process"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const PORT = process.env.PERF_PORT ?? "3100"
const URL = `http://localhost:${PORT}`
const REPORT_PATH = path.join(ROOT, ".lighthouse", "report.json")
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx"

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      shell: process.platform === "win32",
      stdio: "inherit",
    })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`))
    })
  })
}

function canReach(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
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

async function waitForServer(url, server) {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("Production server exited before audit")
    if (await canReach(url)) return
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function printSummary() {
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"))
  const categories = report.categories
  const scores = {
    performance: Math.round(categories.performance.score * 100),
    accessibility: Math.round(categories.accessibility.score * 100),
    bestPractices: Math.round(categories["best-practices"].score * 100),
  }

  console.log("\nLighthouse scores")
  console.log(`  Performance   ${scores.performance}`)
  console.log(`  Accessibility ${scores.accessibility}`)
  console.log(`  Best Practices ${scores.bestPractices}`)

  if (scores.performance < 80 || scores.accessibility < 95 || scores.bestPractices < 90) {
    throw new Error("Lighthouse score threshold failed")
  }
}

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true })

await run(npmCommand, ["run", "build"])

const server = spawn(npxCommand, ["next", "start", "-p", PORT], {
  cwd: ROOT,
  shell: process.platform === "win32",
  stdio: ["ignore", "pipe", "pipe"],
})

server.stdout.on("data", (chunk) => process.stdout.write(chunk))
server.stderr.on("data", (chunk) => process.stderr.write(chunk))

try {
  await waitForServer(URL, server)
  await run(npxCommand, [
    "lighthouse",
    URL,
    "--output=json",
    `--output-path=${REPORT_PATH}`,
    "--only-categories=performance,accessibility,best-practices",
    "--chrome-flags=--headless",
    "--quiet",
  ])
  printSummary()
} finally {
  server.kill()
}
