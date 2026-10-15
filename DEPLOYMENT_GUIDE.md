# Deployment guide (beginner friendly)

You will set up four things, in this order: **local machine → GitHub → Neon (database) → Render (API) → Vercel (website)**. Exact URLs are different for everyone: always copy them from your own dashboards. Nothing in this guide is a live link.

> Honest note: this project was assembled without internet access, so the steps below have **not** been tested end to end. If a screen looks slightly different (these dashboards change), follow the intent. The troubleshooting table at the end covers the usual problems.

Commands marked **[repo root]** run in the `meme-d` folder, **[backend]** in `meme-d/backend`, **[frontend]** in `meme-d/frontend`.

---
## A. Local setup

1. **Install Node.js 20 or newer** from nodejs.org (the “LTS” button). **Install Git** from git-scm.com. Check in a terminal: `node -v` and `git --version`.
2. **Extract** `meme-d-campaign-payout-tracker.zip`. You should get a folder named `meme-d`. Open it in **VS Code** (File → Open Folder), then open the built-in terminal (Terminal → New Terminal).
3. **Install dependencies [repo root]:** `npm run install:all` (takes a few minutes). This also creates `package-lock.json` files; keep them.
4. **Create a Neon database** (section C) and come back with two connection strings.
5. **Create `backend/.env`:** copy `backend/.env.example` to `backend/.env` and fill in:
   - `DATABASE_URL` = Neon **pooled** string; `DIRECT_URL` = Neon **direct** string.
   - `JWT_SECRET` = a long random value. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
   - Leave `FRONTEND_URL=http://localhost:3000`.
6. **Create the tables [backend]:** `npx prisma migrate deploy`
7. **(Optional) demo data [backend]:** `npm run db:seed`. Password for all demo users is `Demo@12345`. Do this on a development database, not your production one.
8. **Start the API [backend]:** `npm run dev`. Visit http://localhost:4000/api/health. You should see `"database":"up"`.
9. **Start the website** in a second terminal. **[frontend]:** copy `.env.example` to `.env.local`, then `npm run dev`. Open http://localhost:3000.
10. **Tests.**
    - **[backend]** `npm run test:unit` (no database needed), `npm run typecheck`, `npm run lint`.
    - **Integration tests** need a *separate empty* database: create a second Neon database named `memed_test` (the name must contain “test”), put its direct connection string in `backend/.env` as `TEST_DATABASE_URL=...`, then **[backend]** `npm run test:integration`. These tests erase that database, so never point it at real data.
    - **[frontend]** `npm test`.

If step 3, 6 or later fails, see the troubleshooting table.

---
## B. GitHub (public repository)

1. Sign in at github.com → **New repository**. Name it (e.g. `meme-d`), choose **Public**, do **not** add a README/.gitignore/licence (the project has them), click **Create repository**.
2. **Check secrets are excluded [repo root]:** `git init` then `git status`. You must **not** see any `.env` file listed (only `.env.example` files are allowed). If you do, stop and fix `.gitignore`.
3. Commit and push **[repo root]**, replacing the URL with yours from GitHub’s page:
   ```bash
   git add .
   git commit -m "Initial commit: Meme'd"
   git branch -M main
   git remote add origin https://github.com/YOUR-USER/meme-d.git
   git push -u origin main
   ```
   (GitHub may ask you to sign in or use a personal access token instead of a password.)
4. **Verify** on github.com: you see `backend/`, `frontend/`, `README.md`, `DEPLOYMENT_GUIDE.md`, and `backend/.env.example` but **no** `.env`. Check history with `git log --oneline`.
5. **Later updates:** `git add . && git commit -m "describe change" && git push`.

---
## C. Neon PostgreSQL

1. Sign up at neon.tech → create a **Project** (any region near you; note Postgres 16 or newer is fine).
2. Open **Connect** (dashboard button). Pick your database and role.
   - Turn **Connection pooling ON** and copy the string: its host contains `-pooler`. This is your **`DATABASE_URL`**. Append `&pgbouncer=true&connect_timeout=15` if it is not already there (keep `?sslmode=require`).
   - Turn pooling **OFF** and copy again: this is your **`DIRECT_URL`** (used only for migrations).
3. Run the migration **[backend]** with those values in `.env`: `npx prisma migrate deploy`. Success prints that migrations were applied.
4. **Check connectivity:** start the API and open `/api/health`, or in Neon’s **Tables** page you should now see `User`, `Campaign`, `Milestone`, `Submission`, `PayoutLedgerEntry`.
5. **Neon troubleshooting:** `password authentication failed` → re-copy the string (passwords contain special characters; don’t retype). `SSL` errors → make sure `sslmode=require` is present. Timeouts right after being idle → Neon scales to zero; retry in a few seconds.

---
## D. Render (API)

1. Sign up at render.com with GitHub → **New +** → **Web Service** → pick your public repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install --include=dev && npm run build && npx prisma migrate deploy`
   - **Start Command:** `npm start`
   - **Instance type:** Free is fine to try it. Free services sleep after inactivity (the first request afterwards may take up to a minute). Render’s *pre-deploy command* is a paid feature, which is why migrations run in the build command.
3. **Environment variables** (Environment tab):
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Neon pooled string |
   | `DIRECT_URL` | Neon direct string |
   | `JWT_SECRET` | a new long random value (not the one used locally) |
   | `FRONTEND_URL` | your Vercel URL, e.g. `https://something.vercel.app`; if you don’t have it yet, put a temporary value and update after section E |
   | `TRUST_PROXY_HOPS` | `2` (Render + the Vercel proxy; see below) |
4. **Health Check Path:** `/api/health`. Click **Create Web Service**; open **Logs** and wait for “Meme’d API listening”. 
5. **Test the API directly:** open `https://YOUR-SERVICE.onrender.com/api/health` (copy the real address from the top of the Render page). Expected: JSON with `"status":"ok"`.
6. *(Alternative)* `render.yaml` in the repo defines the same service as a Blueprint.

`TRUST_PROXY_HOPS`: it tells the API how many proxies sit in front so that rate limits use each visitor’s real IP. With Vercel forwarding to Render use `2`; if everyone seems to share one rate-limit bucket (429 errors for different people), adjust it.

---
## E. Vercel (website)

1. Sign up at vercel.com with GitHub → **Add New… → Project** → import your repo.
2. **Root Directory:** click **Edit** and choose `frontend`. **Framework Preset:** Next.js (auto). Leave build settings as default.
3. **Environment Variables:** `BACKEND_URL` = your Render URL **without a trailing slash** (e.g. `https://your-service.onrender.com`). Do **not** prefix it with `NEXT_PUBLIC_`.
4. **Deploy.** Read the build log if it fails (it fails with a clear message if `BACKEND_URL` is missing). When done, Vercel shows your site address: copy it.
5. Anytime you change `BACKEND_URL`, **redeploy** (Deployments → ⋯ → Redeploy), because it is read at build time.

---
## F. Connect everything
1. Go back to Render → Environment → set `FRONTEND_URL` to the exact Vercel address (`https://…vercel.app`, no trailing slash). Render redeploys automatically; if not, click **Manual Deploy**.
2. In the browser, open the Vercel site → DevTools → **Network**: sign-up requests go to `/api/auth/signup` on the **Vercel** domain and return 201. (Vercel forwards them to Render; that is intended.)
3. **Logs:** Render → Logs (API errors), Vercel → Deployment → Logs/Functions (proxy errors).
4. **Prove it’s the real database:** create an account on the site, then look in Neon → Tables → `User`: the new row is there.

---
## G. Final smoke test (use two browser profiles or one normal + one private window)
1. Open the deployed site.
2. Sign up as a **brand**, then sign out and log in again.
3. **New campaign:** e.g. budget ₹5,000; milestones 10,000 → ₹500, 50,000 → ₹2,000, 100,000 → ₹5,000. Review and **Launch**.
4. Open the campaign in Brand Studio: remaining budget shows ₹5,000.
5. In the other window sign up as a **creator**, open **Campaigns**, open yours.
6. Submit `https://www.instagram.com/reel/TestPost123/`. (Submitting it again → “already submitted”; a YouTube link → rejected.)
7. In **Creator Studio** use *Update views* with `75000` → you earn **₹2,000** (not ₹2,500).
8. Press *Update views* with `75000` again → “No new payout”; payout history still has one row.
9. As a second creator, submit another post and set `150000` views → ₹5,000 is owed but only ₹3,000 remains, so it shows **Waiting for budget** and earns ₹0.
10. Try bad input: views `-5` or `abc` is rejected. While signed in as the creator, open `/brand` → you are redirected. Brand pages’ API calls from a creator session return 403.
11. Refresh the page: all numbers persist.
12. Brand Studio → campaign: spent ₹2,000 of ₹5,000, “Ledger matches budget spend” is shown, and spent never exceeds budget.

You can also call the view endpoint yourself: `curl -X PATCH https://YOUR-VERCEL-SITE/api/submissions/SUBMISSION_ID/views -H "Content-Type: application/json" -d '{"views":120000}'` (get the id from your browser’s Network tab).

---
## Troubleshooting
| Symptom | Likely cause | Fix |
|---|---|---|
| Browser console: CORS error | `FRONTEND_URL` on Render doesn’t match the site’s exact origin | Set it to `https://yourapp.vercel.app` (no slash, correct scheme), redeploy Render |
| `403 This request came from an origin that is not allowed` | Same as above (CSRF origin check) | Same fix |
| Render logs: “Invalid or missing environment variables” | A variable is missing/too short (`JWT_SECRET` ≥ 32 chars) | Add it in Render → Environment |
| Render build: `prisma: not found` / `tsc: not found` | Dev dependencies skipped | Use the exact build command above (`--include=dev`) |
| Render build: `Can't reach database` during migrate | Wrong `DIRECT_URL` or missing `sslmode=require` | Re-copy the **direct** string from Neon |
| Migration error `P3009`/failed migration | A previous attempt half-applied | In Neon, delete the tables (or use a fresh branch) and redeploy |
| API healthy but site shows “Could not reach the server” | `BACKEND_URL` wrong/missing on Vercel, or not redeployed | Fix it and **redeploy** Vercel |
| Vercel build: “BACKEND_URL is not set” | Env var missing | Add it for Production and redeploy |
| Vercel 404 for everything | Root Directory not set to `frontend` | Project Settings → General → Root Directory |
| Login works then immediately logged out | Cookie not stored (you are using the Render URL directly, or the browser blocks cookies) | Use the Vercel URL, not Render’s, and keep `COOKIE_SAME_SITE=lax` |
| “Your session has expired” | Token expired or `JWT_SECRET` changed | Log in again |
| 429 Too many requests for everyone | Rate limit sees one shared IP | Set `TRUST_PROXY_HOPS` to `2` on Render |
| First request very slow | Free Render instance was asleep | Wait ~1 minute, or upgrade the instance |
| `npm install` fails on Windows with path/permission errors | Folder inside OneDrive/protected path | Move the project to e.g. `C:\dev\meme-d` |
| Integration tests refuse to run | `TEST_DATABASE_URL` missing or its name lacks “test” | Create a dedicated `memed_test` database |
