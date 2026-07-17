# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A flight-school marketplace: students search/compare/contact flight schools; schools claim and manage profiles; admins operate a crawl→extract→normalize data pipeline and moderate the results.

## Commands

Package manager is **pnpm** (do not use npm/yarn). Assume the dev server is already running — do not start it as part of a task.

```bash
pnpm dev            # next dev (localhost:3000)
pnpm build          # next build
pnpm lint           # eslint (use this to verify changes; there is no test suite)
pnpm db:generate    # drizzle-kit generate — create SQL migration from schema changes
pnpm db:push        # drizzle-kit push — push schema directly (dev)
pnpm db:migrate     # drizzle-kit migrate — apply migrations
pnpm db:studio      # drizzle-kit studio
```

There is no test runner configured. Verification = `pnpm lint` plus a production-shaped `pnpm build`.

## Conventions (enforced)

- TypeScript **strict**, no `any`. Keep files **≤ 350 LoC**.
- Shared types go in `/types`, helpers in `/lib`.
- **Every input is validated with Zod.** Every mutation is auth-guarded by role.
- **Interactive UI → tRPC** (`server/routers/*`). **Workers/cron/background → REST route handlers** (`app/api/*/route.ts`). Don't blur these.
- Imports use the `@/` path alias from the repo root.

> Note: `.cursor/rules/file-structure.mdc` describes an aspirational/older layout (it lists tRPC v10 and routes like `/admin/facts`, `/admin/signals`, `/admin/match-tester` that have since been removed). Treat the actual files as source of truth, not that doc. This repo is on **tRPC v11** and **Next.js 16 / React 19**.

## Architecture

### Data model: append-only facts with provenance

The core domain pattern is **`schools` (canonical records) + `facts` (append-only, provenance-stamped)**.

- `db/schema/schools.ts` — canonical school identity (name, domain, geo, `googlePlaceId`). `domain` is uniquely indexed; dedup keys off domain/place id.
- `db/schema/facts.ts` — one row per `(schoolId, factKey, asOf)`. Facts are **never mutated in place**; new observations are appended with a fresh `asOf`. Each fact carries `provenance` and a `moderationStatus` of `APPROVED | PENDING | REJECTED`. User-visible values must surface an as-of date or source.
- `db/schema/sources.ts`, `snapshots.ts` — source tracking and historical raw website captures.

When changing what data the app knows about a school, you are almost always inserting facts, not updating columns.

### The crawl → extract → normalize pipeline

This is the system's backbone and spans several `lib/` files:

1. **Crawl** (`lib/cloudflare-crawl.ts`) — Cloudflare Browser Rendering `/markdown` endpoint. Fetches a homepage, ranks links by relevance to directory data (pricing/fleet/programs/contact via the `HIGH_VALUE`/`TOP_VALUE`/`NEGATIVE` keyword lists), and fetches only the top-N relevant pages. **Synchronous** — no webhooks/queue/background worker. Backs off on Cloudflare 429s.
2. **Extract** (`lib/extract.ts`) — source-neutral LLM extraction via the Vercel AI SDK (`generateObject` + OpenAI) against a Zod schema. Output shape is stored in `snapshots.rawJson`. Kept independent of *how* pages were fetched.
3. **Normalize** (`lib/normalize.ts`) — converts `snapshots.rawJson` into typed facts (`FACT_KEYS`, `PROGRAM_TYPES`, `COST_BANDS` from `/types`) ready for insertion into `facts`.

Crawling is **admin-triggered** (Admin → Schools → "Crawl now"), runs inline, and never auto-retries. Other pipeline pieces: `lib/refresh.ts`, `lib/crawl-worker.ts`, `lib/embeddings.ts` (pgvector), `lib/discovery/google.ts` + `lib/normalize-google-places.ts` (Google Places seeding).

### tRPC + auth wiring

- `lib/trpc/trpc.ts` defines the procedure ladder: `publicProcedure` → `protectedProcedure` (requires session) → `adminProcedure` (requires `admin` role). Use the strictest one that fits; **role checks live here, not ad hoc in handlers**.
- `lib/trpc/context.ts` injects `{ db, session }` into every call (`session` from `auth()`).
- `server/routers/_app.ts` composes the router tree: `seeds, schools, crawlQueue, snapshots, match, marketplace, portal, admin`. `AppRouter` type is the client's contract.
- Uses **superjson** transformer (Dates/etc. cross the wire intact).

### Auth & RBAC

- NextAuth v5 (`lib/auth.ts`) with Google OAuth + Drizzle adapter. The session callback reads `role` from the `users` table and puts it on `session.user.role`.
- Roles: `user | school | admin`. `lib/rbac.ts` `hasRole(session, role)` is **exact-match** (admin does not implicitly satisfy a `school` check).
- **Two layers of protection** (defense in depth):
  - `middleware.ts` gates `/admin/**` (admin) and `/portal/**` (school), redirecting to `/sign-in` (unauthed) or `/403` (wrong role). Also redirects `/admin` → `/admin/overview`.
  - `admin/` and `portal/` layouts are async server components that re-check via `auth()` + `hasRole`.

### Database client

`lib/db.ts` — Drizzle over Neon serverless HTTP (`drizzle-orm/neon-http`). Single `db` export, schema-aware. All schema modules are re-exported from `db/schema/index.ts`.

## Route structure (App Router)

- `app/(public)/` — landing, `/search` (URL-synced filters, SSR for SEO), `/saved`, `/compare`.
- `app/(marketplace)/schools/[id]/` — school profile with evidence panel + tier badge + contact/financing CTAs.
- `app/(auth)/` — sign-in.
- `app/admin/` — admin data-ops dashboard (role: admin).
- `app/portal/` — school partner portal (role: school). Profile edits write `CLAIM`-provenance facts as `PENDING` for moderation.
- `app/claim/` — school claim flow.
- `app/api/` — REST handlers (auth, claim, embeddings, events, financing, health, match, normalize, photos) + the tRPC handler at `app/api/trpc/[trpc]/route.ts`.

## Environment

Set in `.env.local` (see `.env.example`). Key vars: `DATABASE_URL`, `OPENAI_API_KEY`, `RESEND_API_KEY` (email via Resend), `NEXTAUTH_SECRET`/`AUTH_SECRET` + `NEXTAUTH_URL`, `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`, `GOOGLE_PLACES_API_KEY` + `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, and `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` (Browser Rendering token needs the "Browser Rendering – Edit" permission). Optional `SELECT_N` tunes how many pages the crawler fetches per site.
