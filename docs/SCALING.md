# Scaling to 10,000 creators

**Database.** Hot paths are indexed: campaigns by `(status, createdAt)` and `(brandId, createdAt)`, submissions by `(creatorId, createdAt)` and `(campaignId, createdAt)`, ledger by `creatorId`, `campaignId`, `submissionId` and a unique `idempotencyKey`. All lists are paginated (max 50) and use `count + findMany` in one round trip; dashboards use grouped queries (`groupBy`, SQL `SUM … GROUP BY day`) instead of per-row queries, avoiding N+1. Creator earnings currently load that creator’s submissions in memory; for creators with thousands of posts, maintain a running total column or a summary table updated inside the payout transaction.

**Contention.** Payouts lock one campaign row, so throughput is serialised *per campaign*, not globally; separate campaigns never block each other. Each transaction holds the lock for a few milliseconds (no network calls inside). If one very large campaign becomes a bottleneck, batch view updates per campaign (apply many submissions under one lock) or reserve budget in slices, keeping the same invariants.

**Background work.** Non-financial work (spike analysis, notifications, recomputing dashboard summaries, importing real platform stats on a schedule) belongs in a queue/worker (e.g. BullMQ or a Render background worker, which is a paid feature), never inside the payout transaction.

**Caching and limits.** Public campaign lists are a good Redis/CDN candidate (short TTL, invalidate on campaign create/status change); payouts and budgets must never be cached. Keep per-IP rate limits, and move them to Redis when running several API instances. Add per-user limits for authenticated routes.

**Operations.** Run several stateless API instances behind the load balancer; use Neon’s pooled connection string and a small Prisma pool per instance. Add structured logs with request ids, error tracking, uptime checks on `/api/health`, and alerts on 5xx rate, p95 latency, lock waits and a nightly job that verifies `spentPaise = Σ ledger` per campaign. Retries are bounded (4) and safe because of the idempotency key.

**Why consistency stays non-negotiable.** More traffic means more simultaneous updates racing for the same budget. Correctness comes from the database (row lock, CHECK constraints, unique ledger key), not from application timing, so adding servers or users raises latency under contention but can never cause overspend or double payment.
