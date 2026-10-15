# Architecture

```
Browser ──(same origin /api/*)──▶ Next.js (Vercel) ──rewrite──▶ Express API (Render) ──▶ Neon PostgreSQL
```

## Why a proxy
Vercel and Render are different sites, so a cookie set by Render would be a third-party cookie for pages served by Vercel, and many browsers block those. `next.config.mjs` rewrites `/api/:path*` to `BACKEND_URL`; the browser only ever sees the Vercel origin, so the HttpOnly session cookie is first-party and `SameSite=Lax` works. The API still has CORS and an Origin check for direct callers.

## Backend layers
`routes → controller (parse + respond) → service (rules + Prisma) → database`. Validation is zod in `*.schemas.ts`; errors are `AppError` (safe messages) or a generic 500 via `middleware/errorHandler.ts`.

| Module | Responsibility |
|---|---|
| `auth` | signup/login/logout/me, bcrypt, JWT + cookie |
| `campaigns` | create, list (public vs owner shapes), budget audit, status transitions |
| `submissions` | create with URL normalisation, role-scoped listing, view updates |
| `payouts` | `payoutCalculator.ts` (pure rules), `spikeDetector.ts` (pure), `payout.service.ts` (transaction) |
| `creator`, `brand` | read-only aggregates for the dashboards |

## Data model
`User 1─* Campaign 1─* Milestone`, `Campaign 1─* Submission *─1 User(creator)`, `PayoutLedgerEntry` references campaign, submission, creator and milestone. Money = integer paise. Constraints beyond Prisma’s schema (CHECKs) are in `prisma/migrations/20260101000000_init/migration.sql`.

## Payout invariants
1. `spentPaise ≤ budgetPaise` (CHECK + guarded UPDATE).
2. `spentPaise = Σ ledger.amountPaise = Σ submission.earnedPaise` (same transaction).
3. `idempotencyKey` unique → an earned total is recorded once.
4. Earned money never decreases.
Concurrency: campaign row `FOR UPDATE` first, then submission row; READ COMMITTED; bounded retry on deadlock/serialization codes.

## Frontend
App Router pages are thin; features live in `src/features/*`, primitives in `src/components/ui`. Data is fetched client-side with a small `useApi` hook because every dashboard is per-user and cookie-authenticated. Design tokens (colour, radius, shadow, fonts) are in `tailwind.config.ts`; violet = structure, lime = earned money.
