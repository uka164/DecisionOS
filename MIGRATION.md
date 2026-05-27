# Data Migration Guide

## Schema Versions

| Version | Indicator | Released |
|---------|-----------|---------|
| v1 | No `schemaVersion` field in localStorage | 0.1.0 |
| v2 | `schemaVersion: 2` | Unreleased |

---

## v1 → v2

### What changed

`schemaVersion: 2` is now written to the `decisionos_store` localStorage key on every save. Existing v1 blobs (those without the field) are detected and automatically migrated on first load.

### Field mapping

| Field | v1 | v2 |
|-------|----|----|
| `schemaVersion` | absent | `2` |
| `decision.tags` | may be absent | `[]` default |
| `decision.constraints` | may be absent | `[]` default |
| `decision.risks` | may be absent | `[]` default |
| `decision.badges` | may be absent | `[]` default |
| `decision.options` | may be absent | `[]` default |
| `decision.tradeoffs` | may be absent | `[]` default |
| `decision.rawThinking` | may be absent | `""` default |

All other fields are preserved exactly as stored.

### Migration behaviour

1. `store.get()` reads the raw JSON blob.
2. If `schemaVersion` is absent or `< 2`, `migrateV1toV2()` runs.
3. Missing fields are filled with defaults (no existing values overwritten).
4. The migrated blob is written back to localStorage with `schemaVersion: 2`.
5. If the write-back fails (e.g., quota), migration still applies in memory for the current session.

### Rollback procedure

Migration is non-destructive — it only adds defaults, never deletes.

To fully revert:

1. Open browser DevTools → Application → Local Storage → `decisionos_store`
2. Export your data first: Settings → Export Data
3. Delete the `decisionos_store` key
4. Reload — the app starts fresh

To restore data, use Settings → Import Data with the previously exported file.

### Running migration tests

```bash
npm run test:e2e
```

The E2E suite in `e2e/decision-flow.spec.ts` seeds localStorage with a v2-format blob and verifies the round-trip. For manual v1 testing, open DevTools and set:

```js
localStorage.setItem('decisionos_store', JSON.stringify({
  decisions: [{ id: 'test-v1', title: 'V1 decision', status: 'draft', createdAt: new Date().toISOString(), impact: 3, qualityScore: 0 }],
  experiments: [],
  settings: { theme: 'void', reducedMotion: false, animationIntensity: 70, ambientMotion: true },
  lastSynced: null
}))
```

Reload the app. Check DevTools — `schemaVersion: 2` should now be present and all array fields defaulted.
