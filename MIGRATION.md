# Data Migration Guide

## Schema Versions

| Version | Indicator | Released |
|---------|-----------|----------|
| v1 | No `schemaVersion` field in localStorage | 0.1.0 |
| v2 | `schemaVersion: 2` | Unreleased |
| v3 | `schemaVersion: 3` | Current |

---

## Legacy -> v3

### What Changed

`schemaVersion: 3` is now written to the `decisionos_store` localStorage key on every save. Existing legacy blobs are detected and migrated on first load.

### Field Mapping

| Field | Legacy | v3 |
|-------|--------|----|
| `schemaVersion` | absent, `1`, or `2` | `3` |
| `decision.tags` | may be absent | `[]` default |
| `decision.constraints` | may be absent | `[]` default |
| `decision.risks` | may be absent | `[]` default |
| `decision.badges` | may be absent | `[]` default |
| `decision.options` | may be absent | `[]` default |
| `decision.tradeoffs` | may be absent | `[]` default |
| `decision.executionTrail` | may be absent | `[]` default |
| `decision.rawThinking` | may be absent | `""` default |
| `decision.riskLevel` | may be absent or invalid | `null` default |

All other fields are preserved as stored.

### Migration Behaviour

1. `store.get()` reads the raw JSON blob.
2. If `schemaVersion` is absent or `< 3`, the legacy migration runs.
3. Missing fields are filled with defaults.
4. The migrated blob is written back to localStorage with `schemaVersion: 3`.
5. If the write-back fails, migration still applies in memory for the current session.

### Rollback Procedure

Migration is non-destructive: it only adds defaults and normalises invalid `riskLevel`.

To fully revert:

1. Open browser DevTools -> Application -> Local Storage -> `decisionos_store`
2. Export your data first: Settings -> Export Data
3. Delete the `decisionos_store` key
4. Reload; the app starts fresh

To restore data, use Settings -> Import Data with the previously exported file.

### Running Migration Tests

```bash
npm run test
```

For manual legacy testing, open DevTools and set:

```js
localStorage.setItem('decisionos_store', JSON.stringify({
  schemaVersion: 2,
  decisions: [{
    id: 'test-v2',
    title: 'Legacy decision',
    status: 'draft',
    createdAt: new Date().toISOString(),
    impact: 3,
    qualityScore: 0,
    tags: [],
    rawThinking: '',
    tradeoffs: [],
    badges: [],
    options: [],
    constraints: [],
    risks: []
  }],
  experiments: [],
  settings: { theme: 'void', reducedMotion: false, animationIntensity: 70, ambientMotion: true },
  lastSynced: null
}))
```

Reload the app. Check DevTools: `schemaVersion: 3`, `riskLevel: null`, and `executionTrail: []` should be present.
