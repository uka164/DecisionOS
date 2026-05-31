# Deploying DecisionOS

DecisionOS keeps your decisions in a **durable server store** (not just the
browser). One adapter interface, three interchangeable backends, chosen by
environment variables:

| Backend | When it's used | Survives | Good for |
|---|---|---|---|
| **SQLite** (default) | no `DATABASE_URL`, `node:sqlite` available | cache-clear, incognito, restart, browser switch on the **same host** | local use, a self-hosted box, a single always-on server |
| **Postgres** | `DATABASE_URL` is set | everything above **+ new device / true cloud** | Vercel, Fly, Render, any serverless or multi-instance deploy |
| **JSON file** | `DECISIONOS_STORE=json`, or sqlite can't load | same as SQLite | a zero-dependency fallback |

The selector lives in `lib/server-store.ts`; the backends in
`lib/server/backends/`. Swapping is one line — nothing else in the app changes.

> **Why Postgres for the cloud?** Serverless platforms (Vercel, Netlify
> functions, etc.) have an **ephemeral filesystem** — files written at runtime
> vanish between invocations. The SQLite/JSON file backends need a persistent
> disk (a long-running Node process or a mounted volume). On serverless you
> **must** use Postgres (or another managed DB).

---

## 1. Local / self-hosted (SQLite — nothing to configure)

```bash
npm install
npm run build && npm start     # or: npm run dev
```

Data is written to `./.data/decisionos.sqlite` (gitignored). That's a real,
transactional SQLite database — clearing your browser cache no longer loses
anything. Back it up by copying that file.

To enable the AI critique, also set `ANTHROPIC_API_KEY` (see `.env.example`).

---

## 2. Cloud (Vercel + Neon Postgres)

This is what makes your decisions follow you to a **new laptop**.

1. **Create a Postgres database.** [Neon](https://neon.tech) (free tier) or
   [Supabase](https://supabase.com) both work. Copy the connection string,
   e.g. `postgres://user:pass@host/db?sslmode=require`.

2. **Set environment variables** on your host (Vercel → Project → Settings →
   Environment Variables):

   ```
   DATABASE_URL=postgres://user:pass@host/db?sslmode=require
   ANTHROPIC_API_KEY=sk-ant-...        # optional, enables AI critique
   ```

   The app auto-selects the Postgres backend whenever `DATABASE_URL` is present
   and **creates its table on first write** (`decisionos_store`, one JSONB row)
   — no migration step required.

3. **Deploy.**

   ```bash
   npx vercel --prod          # or push to a Git repo connected to Vercel
   ```

That's it. The `/api/store` route reads/writes the snapshot in Postgres; every
client that points at the deployment shares it.

> **Heads up — there is no authentication.** Anyone who can reach the
> deployment can read and write every decision. For a private/team instance,
> put it behind Vercel password protection, an access proxy, or a VPN until
> per-user auth exists. See the project notes for the auth roadmap.

---

## Environment variables

| Var | Required | Effect |
|---|---|---|
| `DATABASE_URL` | for cloud | Switches the store to Postgres. |
| `ANTHROPIC_API_KEY` | optional | Enables the AI reasoning critique. Server-side only. |
| `DECISIONOS_STORE` | optional | Set to `json` to force the JSON-file backend. |

## Sanity check

```bash
# After the server is up:
curl localhost:3000/api/store          # → {"available":true,"snapshot":...,"backend":"sqlite"}
```

`backend` confirms which store is live (`sqlite` / `postgres` / `json-file`).
