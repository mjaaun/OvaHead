# OvaHead

Static waitlist site for OvaHead with:

- Cloudflare Pages Function email capture (stores in KV)
- Animated “signups so far” counter (stored in Cloudflare KV via a Pages Function)
 - Optional autoresponder email via Resend

## Deploy (Cloudflare Pages)

1) Push this repo to GitHub
2) In Cloudflare: **Workers & Pages → Pages → Create a project** (connect the GitHub repo) and deploy
3) Create a KV namespace:
   - Cloudflare: **Storage & Databases → KV → Create a namespace**
4) Bind KV to your Pages project:
   - Pages project → **Settings → Functions → Bindings → Add binding → KV namespace**
   - **Variable name**: `SIGNUPS_KV`
   - **KV namespace**: select the namespace you created
5) (Optional) Configure Resend for autoresponder:
   - Verify your domain in Resend and create an API key
   - Pages project → **Settings → Environment variables**
     - `RESEND_API_KEY` = your Resend API key
     - `RESEND_FROM` = `OvaHead <social@ovahead.com>` (optional)
6) Redeploy (trigger a new build)

## Endpoints

The signup counter is served from your own domain:

- `GET /api/signups` → `{ "value": number }`
- `POST /api/signups` → increments by 1, returns `{ "value": number }`

Implementation: `functions/api/signups.ts`

Email signup endpoint:

- `POST /api/subscribe` (form or JSON) → `{ ok: true, value: number }`

Implementation: `functions/api/subscribe.ts`

## Assets

Logos live in `assets/`:

- `assets/dark-logo.svg`
- `assets/white-logo-official.svg`

