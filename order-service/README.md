# Patrice's private order desk

This service adds real order storage to the existing GitHub Pages site. It uses one Cloudflare account: a Worker serves a password-protected chef dashboard and API, and D1 stores orders. No Airtable account is needed. It is **not deployed or connected** just by committing these files.

## What the chef gets

Visit `https://YOUR-WORKER.workers.dev/chef` after deployment. Sign in using the chef password. Requests contain customer contact details, every meal option/add-on, allergy notes, pickup preferences, and server-calculated menu estimates. Search by name, phone, or reference, filter by week/status/payment, and update each week's status independently: New, Confirmed, Cooking, Ready, Picked up, or Cancelled. Mark payments manually as Unpaid/Paid. These marks do not verify payment, collect money, or send customer notifications.

The kitchen prep list combines matching meals from Confirmed/Cooking/Ready orders, separated by week, meal options, and dietary notes. New, Cancelled, and Picked up orders are excluded. Dietary notes must still be checked with the customer. When there are more than 100 orders, load older pages before using/printing prep totals. The dashboard refuses to display an incomplete prep list. Refresh orders to fetch new submissions; there is no automatic push notification. Refreshing before a cooking session is recommended.

The password is a shared chef credential; this version does not offer individual staff accounts, per-person audit logs, automatic texts, or payment processing. Keep chef access limited to trusted staff. Customer details are stored in the private D1 database. Cloudflare administrators can access the database through their account. Configure backups/retention appropriate to the business before relying on it for daily operations. Existing SMS requests do not automatically appear in the dashboard.

## Connect and deploy using your Cloudflare account

Run these on your own computer where browser sign-in is available, after checking out this repository. Node 22+ is recommended.

1. Install and sign in:
   ```sh
   cd PlatedByPatrice/order-service
   npm ci
   npx wrangler login
   ```
   This opens Cloudflare's authorization page. Do not send passwords or tokens through chat. The Codex workspace is not automatically signed into your Cloudflare account.
2. Create the private database:
   ```sh
   npx wrangler d1 create patrice-orders
   ```
   Copy the returned `database_id` into `d1_databases[0].database_id` in `wrangler.jsonc`, replacing the all-zero placeholder. Database IDs are not secret. Keep the `DB` binding name and `migrations_dir` unchanged.
3. Apply the schema to that database:
   ```sh
   npx wrangler d1 migrations apply patrice-orders --remote
   ```
4. Deploy the service, then set the two secrets interactively:
   ```sh
   npm run deploy
   npx wrangler secret put CHEF_PASSWORD
   npx wrangler secret put SESSION_SECRET
   ```
   Choose a unique chef password of at least 16 characters (at most 256). Use a separate random session secret of at least 32 characters. Enter these in Wrangler's secure prompts, never in source code or `wrangler.jsonc`. Changing the session secret signs out existing sessions. The first deployment denies chef sign-in until both secrets are configured. Public requests are not activated on the website until step 6.
5. Visit the deployed Worker's `/chef` page, sign in, and confirm the empty dashboard loads. If the Worker cannot deploy with rate-limit bindings, resolve that account capability before enabling submissions; do not remove the protection. Confirm Cloudflare's current plan limits and pricing for Workers/D1 on your account.
6. Set `window.PATRICE_ORDER_API` in `../assets/js/order-config.js` to the HTTPS Worker origin (no `/api` path). `ALLOWED_ORIGINS` in `wrangler.jsonc` must include the exact customer website origin. The production domains are already listed. Redeploy if changing allowed origins. Commit and push the public configuration change to GitHub Pages. An empty API address intentionally leaves the current text-request site working until the backend is ready. Do not put the chef password or any token in this file.
7. Submit one clearly labeled test request on the live site. Verify that its reference, menu estimate, meal details, and pickup preferences appear in `/chef`; confirm a two-week request produces two independently tracked weekly entries. Try a status/payment change, sign out, sign back in, and verify persistence. Mark test entries Cancelled so they do not enter the prep list. The local test results do not establish production readiness; complete this live check before announcing online requests.

Updating `menu-data.js` requires deploying both the website **and** Worker. Both calculate from that shared menu file. A stale client with a different total is rejected instead of silently charging a different price. This version only supports the supplied meal-prep menus, not arbitrary catering requests.

## Local development

Use the existing checkout; cloud tasks are already isolated, so do not create a Git worktree unless explicitly requested. Do not use production customer data for local tests.

```sh
cd /workspace/PlatedByPatrice/order-service
npm ci --cache /tmp/patrice-npm-cache
npx wrangler d1 migrations apply patrice-orders --local
```

Create an ignored `.dev.vars` containing **local-only** `CHEF_PASSWORD` (16–256 characters), `SESSION_SECRET` (32+ characters), and `ALLOWED_ORIGINS="http://127.0.0.1:8000"`. Never commit the file. Start `npm run dev -- --ip 127.0.0.1 --port 8787`. On cloud machines without a writable home config directory, prefix Wrangler commands with `XDG_CONFIG_HOME=/tmp/patrice-cloudflare WRANGLER_SEND_METRICS=false`.

In another terminal, from the repository root, run `python3 -m http.server 8000`. Production configuration requires an HTTPS API origin. For automated browser tests, intercept the public `order-config.js` response to use `https://orders.test` and forward those requests to local Wrangler; do not commit development URLs into the site. The dashboard runs locally at `/chef` on Wrangler and uses HttpOnly/Secure/SameSite cookies. Use a browser that treats loopback as a secure context, such as Chromium.

Checks:

```sh
npm test
npm run check
# With local Wrangler running and test ALLOWED_ORIGINS as above:
TEST_CHEF_PASSWORD='YOUR-LOCAL-ONLY-PASSWORD' node test/integration.mjs
```

The integration test creates synthetic orders in **local** D1 only. It tests persistence, canonical prices, private reads, authentication, cookie attributes, origin/CSRF protection, separate weekly statuses, stale-edit conflicts, duplicate retries, immutable references, and private response headers. Local rate limits are active; wait a minute before repeated runs if throttled. Local D1 state lives under ignored `.wrangler/`. It is not the production database.

## Submission and access behavior

- The server reconstructs selections from menu IDs and rejects incomplete, unknown, oversized, or mismatched-price requests. Prices use integer cents.
- Stable random submission IDs live in sessionStorage without customer details. Server references bind the ID to validated content. Retrying identical content in the same tab, even after a reload, reuses the same reference. Identical orders intentionally submitted in separate tabs/devices can still be separate requests; check references when reconciling texts.
- Each request's weeks are stored atomically with unique references. Retries never reset chef status/payment. Concurrent edits from another window return a conflict rather than silently overwriting changes.
- Customer submissions are anonymous; origin checks and per-IP limits reduce accidental abuse but do not verify a customer's identity. Limits use Cloudflare's trusted `CF-Connecting-IP` in production. Add Cloudflare's bot protection if spam becomes a problem.
- Customer success appears only after a database write. After a timeout, customers retry the same submission; the site does not claim receipt based only on opening a text message. The official reference is included in the text/copy/download/print summary after a successful save.
- Chef sessions last eight hours, use signed HttpOnly Secure SameSite cookies, require same-origin writes, and are rate limited on login. Private responses are never cached. No database credentials or chef secrets ship in customer JavaScript.
