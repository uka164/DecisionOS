import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

const ROOT = process.cwd()
const INCLUDE_DIRS = ["app", "components", "lib", "stores", "e2e", "scripts"]
const EXTENSIONS = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"])
const MOJIBAKE_PATTERNS = [
  "â€¦",
  "â€”",
  "â€“",
  "â€",
  "Â·",
  "Ã",
  "ðŸ",
  "�",
]

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next") continue
    if (entry.name === "text-hygiene.mjs") continue

    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath))
      continue
    }

    if (EXTENSIONS.has(path.extname(entry.name))) files.push(fullPath)
  }

  return files
}

const files = (await Promise.all(
  INCLUDE_DIRS.map((dir) => collectFiles(path.join(ROOT, dir)))
)).flat()

const findings = []

for (const file of files) {
  const text = await readFile(file, "utf8")
  const lines = text.split(/\r?\n/)

  for (const pattern of MOJIBAKE_PATTERNS) {
    lines.forEach((line, index) => {
      if (line.includes(pattern)) {
        findings.push(`${path.relative(ROOT, file)}:${index + 1} contains "${pattern}"`)
      }
    })
  }
}

if (findings.length > 0) {
  console.error("Text hygiene failed. Fix likely mojibake before committing:")
  findings.forEach((finding) => console.error(`- ${finding}`))
  process.exit(1)
}

console.log("Text hygiene passed.")
