# OvaHead

Static waitlist site for OvaHead with:

- Formspree-powered email capture
- Animated “signups so far” counter (stored in Cloudflare KV via a Pages Function)

## Deploy (Cloudflare Pages)

1) Push this repo to GitHub
2) In Cloudflare: **Workers & Pages → Pages → Create a project** (connect the GitHub repo) and deploy
3) Create a KV namespace:
   - Cloudflare: **Storage & Databases → KV → Create a namespace**
4) Bind KV to your Pages project:
   - Pages project → **Settings → Functions → Bindings → Add binding → KV namespace**
   - **Variable name**: `SIGNUPS_KV`
   - **KV namespace**: select the namespace you created
5) Redeploy (trigger a new build)

## Endpoints

The signup counter is served from your own domain:

- `GET /api/signups` → `{ "value": number }`
- `POST /api/signups` → increments by 1, returns `{ "value": number }`

Implementation: `functions/api/signups.ts`

## Assets

Logos live in `assets/`:

- `assets/dark-logo.svg`
- `assets/white-logo-official.svg`
