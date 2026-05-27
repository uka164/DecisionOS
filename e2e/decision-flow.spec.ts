import { test, expect, type Page } from "@playwright/test"
import path from "path"
import fs from "fs"
import os from "os"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "decisionos_store"

async function clearStorage(page: Page) {
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
}

async function getStoredDecisions(page: Page): Promise<unknown[]> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return parsed.decisions ?? []
    } catch {
      return []
    }
  }, STORAGE_KEY)
}

async function openDecisionWizard(page: Page) {
  await page.getByRole("button", { name: /log your first real decision/i }).click()
}

async function startBlankDecision(page: Page) {
  await openDecisionWizard(page)
  await page.getByRole("button", { name: /blank start from scratch/i }).click()
}

// ─── Suite: Create Decision ───────────────────────────────────────────────────

test.describe("Create Decision flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await clearStorage(page)
    await page.reload()
    // Wait for store hydration
    await page.waitForLoadState("networkidle")
  })

  test("wizard opens and closes without side-effects", async ({ page }) => {
    await startBlankDecision(page)
    const dialog = page.getByRole("dialog", { name: /new decision wizard/i })
    await expect(dialog).toBeVisible()

    await page.getByRole("button", { name: /close wizard/i }).click()
    await expect(dialog).not.toBeVisible()
  })

  test("creates a decision through all four steps", async ({ page }) => {
    // Open wizard
    await startBlankDecision(page)
    const dialog = page.getByRole("dialog", { name: /new decision wizard/i })
    await expect(dialog).toBeVisible()

    // ── Step 1: Brief ──
    await page.fill("#decision-name", "Adopt TypeScript Strict Mode")
    await page.fill("#decision-context", "We need to reduce runtime errors in production.")
    await dialog.getByRole("button", { name: /continue/i }).click()

    // ── Step 2: Options ──
    await page.getByRole("textbox", { name: /option a title/i }).fill("Enable strict mode now")
    await page.getByRole("textbox", { name: /option b title/i }).fill("Gradual adoption per module")
    await dialog.getByRole("button", { name: /review risks/i }).click()

    // ── Step 3: Risks — skip ──
    await page.getByRole("button", { name: /no risks to document/i }).click()
    await expect(page.getByRole("button", { name: /no risks to document/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    await dialog.getByRole("button", { name: /review decision/i }).click()

    // ── Step 4: Record ──
    const recordBtn = dialog.getByRole("button", { name: /record decision/i })
    await expect(recordBtn).toBeEnabled()
    await recordBtn.click()

    // Toast confirms save
    await expect(page.getByText(/decision logged/i)).toBeVisible()

    // Redirected to detail page
    await expect(page).toHaveURL(/\/decisions\/user-/)
  })

  test("continues button is disabled when title is too short", async ({ page }) => {
    await startBlankDecision(page)
    const dialog = page.getByRole("dialog", { name: /new decision wizard/i })

    await page.fill("#decision-name", "Hi") // < 6 chars
    const continueBtn = dialog.getByRole("button", { name: /continue/i })
    await expect(continueBtn).toBeDisabled()
  })
})

// ─── Suite: Export → Clear → Import → Verify ─────────────────────────────────

test.describe("Export / Import round-trip", () => {
  const SEED_DECISION = {
    id: "user-e2e-test-001",
    title: "E2E Test Decision",
    status: "draft" as const,
    createdAt: new Date().toISOString(),
    impact: 3,
    qualityScore: 42,
    tags: [],
    rawThinking: "e2e test raw thinking",
    tradeoffs: [],
    riskLevel: null,
    badges: [],
    options: [],
    constraints: [],
    risks: [],
  }

  const SEED_STATE = {
    schemaVersion: 2,
    decisions: [SEED_DECISION],
    experiments: [],
    settings: {
      theme: "void",
      reducedMotion: false,
      animationIntensity: 70,
      ambientMotion: true,
    },
    lastSynced: new Date().toISOString(),
  }

  test("export produces valid JSON and import restores data", async ({ page }) => {
    // Seed localStorage with a known decision
    await page.goto("/")
    await page.evaluate(
      ([key, state]) => localStorage.setItem(key as string, JSON.stringify(state)),
      [STORAGE_KEY, SEED_STATE]
    )
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Navigate to settings
    await page.goto("/settings")
    await page.waitForLoadState("networkidle")

    // Trigger export and capture download
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /export/i }).first().click(),
    ])

    // Save to temp file
    const tmpPath = path.join(os.tmpdir(), `decisionos-e2e-${Date.now()}.json`)
    await download.saveAs(tmpPath)

    // Verify exported JSON is valid and contains our decision
    const exported = JSON.parse(fs.readFileSync(tmpPath, "utf-8"))
    expect(exported.decisions).toHaveLength(1)
    expect(exported.decisions[0].id).toBe(SEED_DECISION.id)
    expect(exported.decisions[0].title).toBe(SEED_DECISION.title)

    // Clear all data
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
    await page.reload()

    // Verify dashboard shows no user decisions
    const decisionsAfterClear = await getStoredDecisions(page)
    const userDecisions = (decisionsAfterClear as Array<{ id: string }>).filter(
      (d) => !d.id.startsWith("static-")
    )
    expect(userDecisions).toHaveLength(0)

    // Navigate to settings and import
    await page.goto("/settings")
    await page.waitForLoadState("networkidle")

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(tmpPath)
    await page.getByRole("button", { name: /add new only/i }).click()

    // Wait for import to complete (toast or state update)
    await expect(page.getByText(/import complete/i)).toBeVisible({ timeout: 8_000 })

    // Verify data restored in localStorage
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const restored = await getStoredDecisions(page)
    const restoredUser = (restored as Array<{ id: string; title: string }>).filter(
      (d) => !d.id.startsWith("static-")
    )
    expect(restoredUser).toHaveLength(1)
    expect(restoredUser[0].title).toBe(SEED_DECISION.title)

    // Cleanup temp file
    fs.unlinkSync(tmpPath)
  })
})

// ─── Suite: Detail Page ───────────────────────────────────────────────────────

test.describe("Decision detail page", () => {
  test("displays decision data from localStorage", async ({ page }) => {
    const decision = {
      id: "user-e2e-detail-001",
      title: "Detail Page Test Decision",
      status: "in-progress",
      createdAt: new Date().toISOString(),
      impact: 4,
      qualityScore: 60,
      tags: ["ARCH"],
      rawThinking: "Some thinking here",
      tradeoffs: [],
      riskLevel: "medium",
      badges: [{ label: "ARCH", type: "purple" }],
      options: [
        { title: "Option A", description: "Approach A" },
        { title: "Option B", description: "Approach B" },
      ],
      constraints: ["Time"],
      risks: [],
    }

    await page.goto("/")
    await page.evaluate(
      ([key, state]) => localStorage.setItem(key as string, JSON.stringify(state)),
      [
        STORAGE_KEY,
        {
          schemaVersion: 2,
          decisions: [decision],
          experiments: [],
          settings: { theme: "void", reducedMotion: false, animationIntensity: 70, ambientMotion: true },
          lastSynced: new Date().toISOString(),
        },
      ]
    )

    await page.goto(`/decisions/${decision.id}`)
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Detail Page Test Decision" })).toBeVisible()
  })
})
