# Changelog

All notable changes to DecisionOS are documented here.
Format: **[Changed]** | **[Added]** | **[Fixed]** | **[Migration]** | **[Rollback]** | **[Test]**

---

## [Unreleased]

### [Added] Local Decision Insights
- `lib/insights.ts` — pure `generateInsights(decisions, now)` function; returns `Insight[] | null`
- 4 deterministic heuristics: Rollback Omission, Risk/Quality Blindspot, Decision Aging, Constraint Clustering
- `stores/index.ts` — `useDecisionInsights()` selector with stable `useMemo` caching
- `components/dashboard/decision-insights.tsx` — compact insight list rendered between stats and thinking cards
- **Threshold constants:** all magic numbers extracted to named consts in `lib/insights.ts`
- **Edge cases handled:** `< 5 decisions → null`, empty rawThinking excluded, zero-division guards

### [Added] Visual Regression Baseline
- `scripts/visual-check.mjs` — standalone Node.js ES module script using `playwright` + `pixelmatch` + `pngjs`
- Captures 4 pages: dashboard, decision-detail, settings, wizard-step1 (1280×800, dark, reduced-motion)
- **Baseline mode** (`npm run visual:baseline`): saves PNGs to `__screenshots__/baseline/`; commit these as the reference
- **Check mode** (`npm run visual:check`): compares current screenshots to baseline; exits 1 if any page exceeds 2% diff
- Diffs written to `__screenshots__/diff/` on failure
- `.gitignore` updated: `current/` and `diff/` excluded; only `baseline/` is committed

### [Added] Performance Baseline
- `@next/bundle-analyzer` integrated in `next.config.mjs` — enabled when `ANALYZE=true`
- **Bundle analysis** (`npm run bundle:analyze`): opens per-page treemap in browser, reports show `.next/analyze/`
- **Lighthouse audit** (`npm run perf:audit`): writes JSON report to `.lighthouse/report.json`; categories: performance, accessibility, best-practices
- `cross-env` used for Windows-compatible env var injection
- `.gitignore` updated: `.lighthouse/*.json` and `.next/analyze/` excluded

### [Added] E2E Test Infrastructure
- Playwright installed (`@playwright/test ^1.60.0`)
- `playwright.config.ts` — Chromium, localhost:3000, webServer auto-start
- `e2e/decision-flow.spec.ts` — 5 tests covering:
  - Wizard open/close
  - Full 4-step decision creation
  - Continue button gated on title length
  - Export → localStorage clear → Import round-trip
  - Detail page renders seeded decision
- **Scripts:** `test:e2e` (headless), `test:e2e:ui` (interactive)
- **Run:** `npm run test:e2e`

### [Added] Data Versioning + Migration
- `lib/migrations/v1-to-v2.ts` — detects unversioned blobs, normalises all required Decision fields to safe defaults
- `lib/store.ts` — auto-migrates on `get()`; stamps `schemaVersion: 2` on every `set()`
- **Zero data loss:** migration only adds missing fields with defaults; never deletes or overwrites existing values
- **Rollback:** clearing localStorage reverts to fresh state; no irreversible schema change

### [Migration] v1 → v2 localStorage Schema
See `MIGRATION.md` for full field mapping and rollback procedure.

### [Test] Migration correctness
- v1 blobs (no `schemaVersion`) auto-upgrade on first load
- All required Decision array fields (`tags`, `constraints`, `risks`, `badges`, `options`, `tradeoffs`) default to `[]` if absent
- `schemaVersion: 2` written back to localStorage after migration

---

## [0.1.0] — Initial Release

### [Added]
- Dashboard with stats, thinking cards, decision timeline
- New Decision Wizard (4-step: Brief → Options → Risks → Review)
- Decision detail page with RFC export, tradeoff axes, risk review
- Quality scoring system (7 signals, 100-point rubric)
- Export / Import JSON (overwrite + merge modes)
- LocalStorage persistence with cross-tab sync
- 3 visual themes: VOID, MIDNIGHT, TWILIGHT
- Experiment tracking linked to decisions
- Command palette (Cmd/Ctrl+K)
- Archive timeline view
- Relationship map view
- Settings page with data management controls
- Accessible: focus rings, skip-to-content, reduced-motion support
