# Meme’d: Creator Campaign Intelligence

Meme’d is a creator marketplace. Brands launch campaigns with a budget and a ladder of view milestones; creators submit posts and are paid the **highest milestone their post reaches**, never more than the campaign budget allows.

> **Status:** the code in this repository was written and reviewed, and its pure payout logic was executed, but it has **not yet been installed, built or run against a real database** (see [Verification status](#verification-status)). Follow the steps below on your machine to confirm everything end to end.

## Contents
1. [Features](#features) · 2. [Stack](#technology-stack) · 3. [Architecture](#architecture-and-structure) · 4. [Prerequisites](#prerequisites) · 5. [Local setup](#local-setup) · 6. [Environment variables](#environment-variables) · 7. [Tests](#running-the-tests) · 8. [Production build](#production-build) · 9. [Deployment](#deployment) · 10. [API](#api-overview) · 11. [Security](#security-considerations) · 12. [Decisions](#assumptions-and-edge-case-decisions) · 13. [Limitations](#known-limitations) · 14. [Database deviation](#database-specification-deviation) · 15. [Payout design](#concurrency-safe-payout-design)

## Features
- Brand and creator accounts (JWT in an HttpOnly cookie), role-based access.
- **Brand Studio:** budget/spend/remaining totals, payouts-per-day chart, per-campaign performance, recent submissions, a 3-step campaign wizard with a review step, campaign management (launch/complete) and a ledger-vs-spend audit indicator.
- **Creator Studio:** total earned, money held back for budget, active campaigns, per-post progress to the next milestone, payout history, and a **simulate views** control that calls the real `PATCH /api/submissions/:id/views` endpoint.
- Public campaign browser with search, platform filter and pagination; campaign pages with the payout ladder and live remaining budget.
- Payout engine: highest-milestone rule, no partial payouts, no overspend, idempotent, ledger-backed, transaction + row-lock concurrency control.
- Bonus: rule-based suspicious view-spike flag. Redis caching was **not** implemented (optional in the brief).

## Technology stack
| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript (strict), Tailwind CSS 3, Recharts, lucide-react |
| Backend | Node.js 20+, Express 4, TypeScript (strict), zod validation, helmet, express-rate-limit |
| Database | **PostgreSQL on Neon**, Prisma ORM, SQL migrations with CHECK constraints |
| Auth | bcryptjs (cost 12), JWT (HS256) in an HttpOnly cookie |
| Tests | Jest, ts-jest, supertest (backend); Jest + Testing Library (frontend) |
| Hosting | Vercel (frontend), Render (backend), Neon (database) |

## Architecture and structure
```
meme-d/
  backend/   Express API + Prisma (src/modules/{auth,campaigns,submissions,payouts,creator,brand})
  frontend/  Next.js app (src/app routes, src/features, src/components, src/lib)
  docs/      ARCHITECTURE.md, SCALING.md
  DEPLOYMENT_GUIDE.md   beginner walkthrough (GitHub, Neon, Render, Vercel)
  docker-compose.yml    local Postgres + API + web
  render.yaml           optional Render Blueprint
```
The browser only talks to its own origin: Next.js proxies `/api/*` to the backend (`frontend/next.config.mjs`). That keeps the login cookie first-party (no third-party-cookie problems on Vercel + Render). Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Prerequisites
Node.js 20 or newer, Git, and a PostgreSQL database (a free [Neon](https://neon.tech) project, or Docker for a local one).

## Local setup
```bash
# 1. From the repository root: install both apps
npm run install:all

# 2. Backend configuration
cd backend
cp .env.example .env         # Windows PowerShell: copy .env.example .env
# edit .env: paste your Neon DATABASE_URL / DIRECT_URL and set JWT_SECRET (instructions inside the file)

# 3. Create tables, then (optionally) load demo data
npx prisma migrate deploy
npm run db:seed

# 4. Start the API (http://localhost:4000)
npm run dev
```
In a **second terminal**:
```bash
cd frontend
cp .env.example .env.local   # BACKEND_URL=http://localhost:4000
npm run dev                  # http://localhost:3000
```
Demo accounts (password `Demo@12345`): `brand@memed.demo`, `asha@memed.demo`, `kabir@memed.demo`, `meera@memed.demo`. All seeded data is labelled “(demo)” and refuses to run when `NODE_ENV=production`.

**Docker alternative:** `docker compose up --build` starts Postgres, the API (it applies migrations on start) and the web app at http://localhost:3000. To load demo data, run this from `backend/` on your host: set `DATABASE_URL` and `DIRECT_URL` to `postgresql://memed:memed_local_only@localhost:5432/memed` and run `npm run db:seed`.

## Environment variables
| Variable | Service | Controls | Required | Example |
|---|---|---|---|---|
| `DATABASE_URL` | backend | Runtime Postgres connection (Neon **pooled** host) | always | `postgresql://USER:PASS@HOST-pooler.REGION.aws.neon.tech/DB?sslmode=require&pgbouncer=true&connect_timeout=15` |
| `DIRECT_URL` | backend | Non-pooled connection used by `prisma migrate` | when running migrations | `postgresql://USER:PASS@HOST.REGION.aws.neon.tech/DB?sslmode=require` |
| `JWT_SECRET` | backend | Signs session tokens, ≥ 32 chars | always | output of `openssl rand -hex 32` |
| `JWT_EXPIRES_IN_SECONDS` | backend | Token and cookie lifetime | optional (604800) | `604800` |
| `COOKIE_SAME_SITE` | backend | `lax` (default), `strict` or `none` | optional | `lax` |
| `FRONTEND_URL` | backend | Allowed browser origin(s) for CORS and CSRF origin check; comma-separate several | always | `http://localhost:3000` / your Vercel URL |
| `PORT` | backend | Listen port (Render sets this itself) | optional (4000) | `4000` |
| `TRUST_PROXY_HOPS` | backend | Reverse proxies in front of the API, for correct client IPs in rate limiting | optional (1) | `2` on Render behind the Vercel proxy |
| `NODE_ENV` | backend | `production` enables Secure cookies | production | `production` |
| `TEST_DATABASE_URL` | backend tests | Throwaway DB for integration tests (**name must contain “test”**) | only for integration tests | `postgresql://…/memed_test?sslmode=require` |
| `BACKEND_URL` | frontend (server-side, build time) | Where Next.js forwards `/api/*` | always | `http://localhost:4000` / your Render URL |

No server secret ever uses the `NEXT_PUBLIC_` prefix. The backend fails at startup with a readable list if anything required is missing or invalid.

> **Why `BACKEND_URL` instead of `NEXT_PUBLIC_API_URL`?** The brief lists `NEXT_PUBLIC_API_URL` as a possibility. This build proxies through Next.js instead, so the browser never needs the backend address and cookies stay first-party. `BACKEND_URL` is read when Next.js **builds**, so change it in Vercel and redeploy.

## Running the tests
```bash
cd backend
npm run test:unit            # no database needed
npm run typecheck && npm run lint

# Integration tests need an EMPTY throwaway database (e.g. a second Neon database or branch named memed_test)
# put TEST_DATABASE_URL=... in backend/.env, then:
npm run test:integration     # applies migrations to that DB, then runs the concurrency + API suites
npm test                     # everything; integration suites are reported as skipped if TEST_DATABASE_URL is unset

cd ../frontend
npm test
npm run typecheck && npm run lint
```
Integration tests **wipe the tables** of the database in `TEST_DATABASE_URL` and refuse to run unless its name contains “test”. They are skipped, not silently passed, when the variable is missing.

## Production build
```bash
cd backend  && npm run build && npm start      # prisma generate + tsc, then node dist/server.js
cd frontend && npm run build && npm start
```

## Deployment
GitHub → Neon → Render → Vercel. The full beginner walkthrough, smoke test and troubleshooting table are in **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**.

## API overview
All responses are `{ "data": … , "meta"?: … }` or `{ "error": { "code", "message", "details"? } }`. Money fields end in `Paise` (integers). Lists accept `page` and `pageSize` (max 50).

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/health` | none | Liveness + database check |
| `POST /api/auth/signup`, `/login`, `/logout` | none | Sessions (cookie) |
| `GET /api/auth/me` | any | Current user |
| `POST /api/campaigns` | brand | Create (milestones included) |
| `GET /api/campaigns` | optional | Public list of **live** campaigns; `?mine=true` for a brand’s own |
| `GET /api/campaigns/:id` | optional | Detail (drafts/completed only for the owner) |
| `GET /api/campaigns/:id/budget` | owning brand | Budget, spend, ledger audit, waiting posts |
| `PATCH /api/campaigns/:id/status` | owning brand | `live` / `completed` |
| `GET /api/campaigns/:id/submissions` | owning brand | Posts on the campaign |
| `POST /api/campaigns/:id/submissions` | creator | Submit a post URL |
| `GET /api/submissions` | creator / brand | Own posts / posts on own campaigns |
| `PATCH /api/submissions/:id/views` | **none (by design)** | Simulated analytics update; validated, rate limited, budget-capped |
| `GET /api/creator/earnings`, `/payouts` | creator | Totals and ledger history |
| `GET /api/brand/overview` | brand | Dashboard aggregates |

## Security considerations
- Passwords: bcrypt cost 12, 8–72 chars; login uses a constant-work path so unknown emails and wrong passwords look identical.
- Session: HS256 JWT in an HttpOnly, `Secure`-in-production, `SameSite=Lax` cookie. Bearer tokens are also accepted for API clients. Logout clears the cookie; tokens are stateless, so a stolen token stays valid until expiry (see limitations).
- CSRF: SameSite cookies **plus** an Origin check on every state-changing request.
- helmet headers, CORS limited to `FRONTEND_URL`, 50 KB body limit, global/auth/view-update rate limits.
- Every input is validated with zod; errors never include stack traces or SQL. Unexpected errors become a generic 500.
- Authorisation is enforced in the API (role middleware + ownership checks); the UI guards only improve navigation. A brand’s drafts are invisible (404) to everyone else.
- The unauthenticated view endpoint can only change view counts and trigger rule-based payouts; it exposes no personal data and cannot exceed the budget.

## Assumptions and edge-case decisions
- Currency is INR, stored as **integer paise**. A campaign budget is capped at ₹1,00,00,000 (fits a 32-bit column).
- **Highest milestone, not sum.** Ladder rules: unique thresholds, payouts strictly increasing with thresholds, top payout ≤ budget, 1–12 milestones.
- **No partial payout.** If the full increment does not fit the remaining budget, nothing moves; the post shows “waiting for budget”. It is re-evaluated on every view update.
- **Decreasing views:** the new count is stored but earned money is never clawed back. Use the brand-side review to handle fraud outside the system.
- Payouts happen only while a campaign is `live`; views are still recorded on drafts/completed campaigns.
- One post URL can enter a campaign once. URLs are normalised (https, tracking params removed) and must match the campaign’s platform.
- Spike rule: a jump ≥ 20,000 views within 24 h of the previous update that is also ≥ 3× the previous count (or from zero) sets a sticky `suspicious` flag. It never blocks payouts and is not fraud detection.

## Known limitations
- View counts are simulated; no Instagram/YouTube API is called and posts are not verified to exist.
- No payment rails: “paid” means recorded in the ledger. No email verification, password reset, or admin role.
- Stateless JWTs cannot be revoked before expiry.
- No budget top-up flow, so a post blocked by budget stays blocked until a future feature or a manual DB change.
- Free-tier Render sleeps when idle (first request can take ~30–60 s). Redis caching and background jobs are not implemented.
- Because the unauthenticated endpoint is rate limited per IP but not authenticated, anyone who knows a submission UUID can set its views. That is the brief’s requirement for a simulated source, not a production design.

## Database specification deviation
The original assignment specifies MongoDB/Mongoose. This version intentionally uses **PostgreSQL hosted on Neon with Prisma** instead, because exact money arithmetic, row locks, CHECK constraints and unique indexes make the payout invariants enforceable by the database. It therefore does **not** comply with the original database requirement.

## Concurrency-safe payout design
Every view update runs in one PostgreSQL transaction (`backend/src/modules/payouts/payout.service.ts`):
1. `SELECT … FROM "Campaign" … FOR UPDATE` locks the campaign row, then the submission row (always in that order, so no deadlocks). All payouts in a campaign therefore queue up behind one lock, whether they target the same submission or different ones.
2. The pure calculator decides `awarded`, `up_to_date`, `no_milestone` or `insufficient_budget` from the *freshly locked* data.
3. For an award: insert the ledger row (unique `idempotencyKey = submissionId:newEarnedTotal`), then run a guarded `UPDATE … SET spentPaise = spentPaise + x WHERE spentPaise + x <= budgetPaise`, then update the submission. Any failure rolls back everything.
4. Database `CHECK` constraints (`spentPaise <= budgetPaise`, positive amounts, `new = previous + amount`) are the final safety net.
5. Lock/deadlock errors are retried at most 4 times with jitter. No network calls happen inside the transaction.

Invariants: spend ≤ budget; spend = Σ ledger = Σ earned; each earned total is recorded once; earnings never decrease.

## Verification status
See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for exactly what was and was not executed when this archive was produced.
