# Flight School Marketplace

A marketplace platform where students search, compare, and contact flight schools. Schools claim and manage their profiles, and admins operate a crawl → extract → normalize data pipeline that keeps school data fresh and moderated.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (strict mode)
- **API:** tRPC v11 for interactive calls; REST route handlers for workers/cron
- **Database:** PostgreSQL (Neon serverless) + Drizzle ORM + pgvector
- **Auth:** NextAuth.js (Auth.js) v5 with Google OAuth + Drizzle adapter
- **Crawl/Extract:** Cloudflare Browser Rendering + OpenAI (Vercel AI SDK)
- **Discovery/Maps:** Google Places API + Google Maps JavaScript API
- **Bot protection:** Cloudflare Turnstile (public add-a-school flow)
- **Validation:** Zod (every input)
- **UI:** Tailwind CSS v4 + shadcn/ui
- **Email:** Resend
- **Scheduled jobs:** Vercel Cron
- **Package Manager:** pnpm

## Getting Started

### Prerequisites

- Node.js 20+ (required by Next.js 16)
- pnpm installed globally (`npm install -g pnpm`)
- A PostgreSQL database — Neon (the app uses the Neon serverless HTTP driver)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd find-a-flight-school
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables. Copy `.env.example` to `.env.local` and fill it in:

```env
# Core
DATABASE_URL=postgresql://user:password@host/database
OPENAI_API_KEY=
RESEND_API_KEY=

# Auth (NextAuth v5 + Google OAuth)
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_SECRET=

# Google Places (discovery/geocoding) + Maps (map rendering)
GOOGLE_PLACES_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=        # optional (Advanced Markers); falls back to Google's DEMO_MAP_ID
PLACES_MONTHLY_CAP=4500                 # hard cap on billable Places calls (stays under Google's free tier)

# Cloudflare Browser Rendering (crawler) — token needs the "Browser Rendering - Edit" permission
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# Cloudflare Turnstile — gates the public add-a-school flow against bots
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=

# Shared secret for the scheduled photo-refresh cron (sent as "Authorization: Bearer <CRON_SECRET>")
CRON_SECRET=
```

4. Set up the database:

```bash
pnpm db:generate   # generate a SQL migration from schema changes
pnpm db:push       # push schema directly (dev)
pnpm db:migrate    # apply migrations
```

5. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
.
├── app/                          # Next.js App Router
│   ├── (public)/                 # Landing, search, saved, compare, add-school, privacy, terms
│   ├── (marketplace)/            # School profile pages (/schools/[id])
│   ├── (auth)/                   # Sign-in
│   ├── admin/                    # Admin "Schools" console (RBAC: admin)
│   ├── portal/                   # School portal — overview, profile, analytics (RBAC: school)
│   ├── claim/                    # School claim flow
│   └── api/                      # REST route handlers + the tRPC handler
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── core/                     # Core design-system components (Button, Input, …)
│   ├── mk/                       # Marketplace UI (cards, compare, profile, claim, add-school)
│   ├── landing/                  # Landing-page sections
│   ├── marketplace/ schools/     # Marketplace + school-profile components
│   ├── portal/                   # Portal components
│   ├── admin/                    # Admin console components (Discover, Public adds, crawl UI)
│   └── auth/                     # Auth components
├── lib/                          # Utilities + data pipeline
│   ├── trpc/                     # tRPC setup (client, context, procedure ladder)
│   ├── discovery/                # Google Places discovery
│   ├── cloudflare-crawl.ts       # Crawl (Cloudflare Browser Rendering)
│   ├── extract.ts, normalize.ts  # LLM extraction + fact normalization
│   ├── embeddings.ts             # pgvector embeddings (semantic match)
│   ├── refresh-school-places.ts  # Photo/Places refresh (cron)
│   └── db.ts, auth.ts, rbac.ts   # DB client, auth config, role checks
├── server/routers/               # tRPC routers
├── db/schema/                    # Drizzle schema modules
└── types/                        # Shared TypeScript types
```

## Key Features

### Public Marketplace

- **Search & Filter:** Search flight schools with URL-synced filters (SSR for SEO).
- **School Profiles:** Detailed profiles with evidence panels, tier badges, as-of dates/sources, an embedded Google Map, and contact/financing CTAs.
- **Compare:** Compare up to 4 schools side-by-side.
- **Saved Schools:** Save favorites for quick access.
- **Add a School:** A public, Turnstile-gated flow that lets anyone find a school via Google Places and submit it — submissions land in the admin "Public adds" queue for review.
- **Contact / financing:** Lead capture and financing-intent CTAs on each profile.

### School Portal (role: `school`)

- **Overview:** Profile-completeness snapshot and quick actions.
- **Profile Management:** Claim and edit a school profile. Edits are written as `CLAIM`-provenance facts with `PENDING` status, awaiting admin moderation.
- **Analytics:** Track profile views, match appearances, and engagement.
- **Claim flow:** `/claim` lets a school owner claim their listing.

### Admin — Schools Console (role: `admin`)

A single operations console at `/admin/schools` with three views:

- **Schools:** A table of every school with crawl status and last-crawl time. **Crawl & publish** runs the crawl → extract → normalize pipeline inline; published rows offer **Re-crawl**, failed rows offer **Retry crawl**. A detail drawer shows facts and lets you delete a school.
- **Discover:** Search Google Places to seed new schools into the catalog.
- **Public adds:** Moderate schools submitted through the public Add-a-school flow.

### Semantic matching

Schools are embedded with pgvector (`lib/embeddings.ts`); the `/api/match` endpoint and `match` tRPC router rank schools against a student's needs.

## Data pipeline: crawl → extract → normalize

The system's backbone turns a school's website into typed, provenance-stamped facts:

1. **Crawl** (`lib/cloudflare-crawl.ts`) — Cloudflare Browser Rendering fetches a homepage, ranks links by relevance (pricing/fleet/programs/contact), and fetches the top-N pages. Synchronous — no webhooks or background worker; backs off on Cloudflare 429s.
2. **Extract** (`lib/extract.ts`) — LLM extraction via the Vercel AI SDK (`generateObject` + OpenAI) against a Zod schema; output is stored in `snapshots.rawJson`.
3. **Normalize** (`lib/normalize.ts`) — converts the raw snapshot into typed facts (`FACT_KEYS`, `PROGRAM_TYPES`, `COST_BANDS`) ready to append to the `facts` table.

Crawling is **admin-triggered** and runs inline; it never auto-retries. Note: Cloudflare's free Browser Rendering tier rate-limits the REST API (the crawler backs off on 429s, so a crawl still completes, just slower). The Workers Paid plan raises the limits for snappier crawls.

## Background jobs (cron)

- **Photo refresh** (`app/api/cron/refresh-photos`) — Re-fetches Google Places data (including fresh photo resource names) for schools with a known-broken image first, then the schools whose photos are oldest. Bounded by a per-run batch size and the monthly Places budget (`PLACES_MONTHLY_CAP`), so it stays within the free tier. Triggered by Vercel Cron, which sends `Authorization: Bearer <CRON_SECRET>`.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint (the primary way to verify changes — there is no test suite)
- `pnpm db:generate` - Generate a Drizzle migration from schema changes
- `pnpm db:push` - Push schema changes directly (dev)
- `pnpm db:migrate` - Apply migrations
- `pnpm db:studio` - Open Drizzle Studio

## Authentication & Authorization

The app uses NextAuth.js v5 (Google OAuth) with role-based access control:

- **Roles:** `user`, `school`, `admin` — `hasRole()` is **exact-match** (admin does not implicitly satisfy a `school` check).
- **Protected routes:**
  - `/admin/**` — requires the `admin` role (`/admin` redirects to `/admin/schools`).
  - `/portal/**` — the school partner portal; requires sign-in.
- **Two layers of protection (defense in depth):** `middleware.ts` gates the route groups and redirects to `/sign-in` (unauthenticated) or `/403` (wrong role); the `admin/` and `portal/` layouts re-check with `auth()` as async server components. Admin is guarded by role at both layers.

## Database Schema

The core domain pattern is **canonical `schools` + append-only `facts`**: facts are never mutated in place — new observations are appended with a fresh `asOf` and carry `provenance` and a `moderationStatus` of `APPROVED | PENDING | REJECTED`.

Key tables:

- `schools` — canonical school identity (name, domain, geo, `googlePlaceId`)
- `facts` — append-only, provenance-stamped observations
- `sources`, `snapshots` — source tracking + historical raw website captures
- `embeddings` — pgvector school embeddings (semantic match)
- `crawl_queue` — crawl job status
- `claims` — school claim requests
- `leads` — marketplace contact leads
- `saved_schools`, `comparisons` — user favorites + compare sets
- `events_views`, `events_financing`, `events_match_appearances` — analytics events
- `photo_health` — Google photo health (broken-photo flags for the refresh cron)
- `api_usage` — Places API call metering (enforces `PLACES_MONTHLY_CAP`)
- `user_profiles` — user preferences; auth tables (`users`/`accounts`/`sessions`) live in `db/schema/auth.ts`

## API Architecture

- **tRPC** (`server/routers/*`) — all interactive UI calls (search, mutations, queries). Routers: `schools`, `seeds`, `crawlQueue`, `snapshots`, `match`, `marketplace`, `portal`, `admin`, `claim`. Uses the superjson transformer.
- **REST route handlers** (`app/api/*/route.ts`) — workers, cron, and background/webhook-style tasks:
  - `auth/[...nextauth]` — NextAuth
  - `trpc/[trpc]` — the tRPC handler
  - `match` — semantic school matching
  - `embeddings/generate` — build/refresh pgvector embeddings
  - `photos/google` — Google photo proxy (flags broken photos for the refresh cron)
  - `events/view`, `financing/intent` — analytics event capture
  - `cron/refresh-photos` — scheduled photo refresh (see Background jobs)
  - `health/db` — database health check
- **Validation:** every input is validated with Zod; every mutation is auth-guarded by role via the tRPC procedure ladder (`publicProcedure` → `protectedProcedure` → `adminProcedure`).

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [NextAuth.js Documentation](https://authjs.dev)

## License

[Add your license here]
