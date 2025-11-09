# Flight School Marketplace

A marketplace platform where students can search, compare, and contact flight schools. Schools can claim and manage their profiles, while admins operate the crawl/normalize pipeline and moderate data.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript (strict mode)
- **API:** tRPC v11 for interactive calls; REST route handlers for workers/cron
- **Database:** PostgreSQL (Neon/Supabase) + Drizzle ORM + pgvector
- **Crawl/Extract:** Firecrawl API
- **Validation:** Zod
- **Authentication:** NextAuth.js (Auth.js) v5 + Postgres adapter
- **UI:** Tailwind CSS + shadcn/ui
- **LLM:** Vercel AI SDK (OpenAI-compatible)
- **Email:** Resend
- **Package Manager:** pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm installed globally (`npm install -g pnpm`)
- PostgreSQL database (Neon, Supabase, or self-hosted)

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

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:

```env
DATABASE_URL=postgresql://user:password@host:port/database
FIRECRAWL_API_KEY=your_firecrawl_api_key
OPENAI_API_KEY=your_openai_api_key
RESEND_API_KEY=your_resend_api_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
WEBHOOK_BASE_URL=local_only_for_firecrawl
```

4. Set up the database:

```bash
# Generate migrations
pnpm db:generate

# Push schema to database
pnpm db:push

# Or run migrations
pnpm db:migrate
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
│   ├── (public)/                # Public routes (landing, search, saved, compare)
│   ├── (marketplace)/           # Marketplace routes (school profiles)
│   ├── (auth)/                  # Authentication routes
│   ├── admin/                   # Admin dashboard (RBAC: admin role)
│   ├── portal/                  # School portal (RBAC: school role)
│   ├── claim/                   # School claim flow
│   └── api/                     # API routes (REST + tRPC)
├── components/                  # React components
│   ├── ui/                      # shadcn/ui components
│   ├── marketplace/              # Marketplace components
│   ├── schools/                 # School profile components
│   ├── portal/                  # Portal components
│   └── admin/                   # Admin components
├── lib/                         # Utility libraries
│   ├── trpc/                    # tRPC setup
│   ├── db.ts                    # Database client
│   ├── auth.ts                  # NextAuth configuration
│   ├── rbac.ts                  # Role-based access control
│   └── ...                      # Other utilities
├── server/                      # tRPC routers
│   └── routers/                 # Domain-specific routers
├── db/                          # Database schema
│   └── schema/                  # Drizzle schema definitions
└── types/                       # TypeScript type definitions
```

## Key Features

### Public Marketplace

- **Search & Filter:** Search flight schools with URL-synced filters
- **School Profiles:** Detailed school information with evidence panels and tier badges
- **Compare:** Compare up to 4 schools side-by-side
- **Saved Schools:** Save favorite schools for quick access
- **Contact Forms:** Submit inquiries directly to schools

### School Portal

- **Profile Management:** Claim and edit school profiles
- **Lead Management:** View and manage inbound inquiries
- **Analytics:** Track views, CTR, and match appearances

### Admin Dashboard

- **Data Operations:** Manage crawl queue, normalization, and deduplication
- **Moderation:** Review and approve fact submissions
- **Seed Management:** Upload and resolve seed candidates
- **Snapshots:** View historical data snapshots
- **Match Testing:** Test and refine matching algorithms

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio

## Authentication & Authorization

The application uses NextAuth.js with role-based access control (RBAC):

- **Roles:** `user`, `school`, `admin`
- **Protected Routes:**
  - `/admin/**` - Requires `admin` role
  - `/portal/**` - Requires `school` role
- **Middleware:** Automatically redirects unauthorized users to `/sign-in` or `/403`

## Database Schema

Key tables:

- `schools` - Canonical school records
- `facts` - Append-only fact records with provenance
- `sources` - Source tracking (FAA, Places, Crawl, Claim, Manual)
- `snapshots` - Historical website snapshots
- `crawl_queue` - Crawl job queue
- `leads` - Marketplace contact leads
- `saved_schools` - User favorites
- `comparisons` - Compare sets
- `user_profiles` - User roles and preferences
- `claims` - School claim requests

## API Architecture

- **tRPC:** Used for interactive UI calls (search, mutations, queries)
- **REST Routes:** Used for workers, cron jobs, and background tasks
- **Validation:** All inputs validated with Zod schemas
- **Type Safety:** End-to-end type safety with tRPC

### Testing Firecrawl

Use ngrok to set up a url to point to localhost. This url will need to be used in the env `WEBHOOK_BASE_URL` to locally receive webhooks

[https://www.sitepoint.com/use-ngrok-test-local-site/](https://www.sitepoint.com/use-ngrok-test-local-site/)

Run this command to setup the connection

```
ngrok http http://localhost:3000
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [NextAuth.js Documentation](https://next-auth.js.org)

## License

[Add your license here]
