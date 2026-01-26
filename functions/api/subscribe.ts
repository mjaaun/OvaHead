// Stores signups in KV and sends a welcome email via Resend.
// This replaces Formspree for free + unlimited signups (within Cloudflare KV limits).

type KVNamespace = {
	get: (key: string) => Promise<string | null>
	put: (key: string, value: string) => Promise<void>
}

type PagesFunction<Env = unknown> = (ctx: { env: Env; request: Request }) => Response | Promise<Response>

export interface Env {
	SIGNUPS_KV: KVNamespace
	RESEND_API_KEY?: string
	RESEND_FROM?: string // e.g. "OvaHead <social@ovahead.com>"
}

function json(data: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(data), {
		...init,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store",
			...(init?.headers || {}),
		},
	})
}

function isValidEmail(email: string) {
	// Minimal sanity check (real validation happens via deliverability + bounce handling).
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function sha256Hex(input: string): Promise<string> {
	const bytes = new TextEncoder().encode(input)
	const digest = await crypto.subtle.digest("SHA-256", bytes)
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

async function getCount(env: Env): Promise<number> {
	const raw = await env.SIGNUPS_KV.get("count")
	const n = Number(raw)
	return Number.isFinite(n) && n >= 0 ? n : 0
}

async function setCount(env: Env, n: number) {
	await env.SIGNUPS_KV.put("count", String(n))
}

async function sendWelcomeEmail(env: Env, to: string) {
	if (!env.RESEND_API_KEY) return

	const from = env.RESEND_FROM || "OvaHead <social@ovahead.com>"
	const subject = "You’re on the OvaHead list"
	const html = `
<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.5;">
  <p style="margin:0 0 12px 0;">You’re on the list.</p>
  <p style="margin:0 0 12px 0;">We’ll email you when OvaHead is ready.</p>
  <p style="margin:0; color:#666; font-size:12px;">If you didn’t sign up, you can ignore this email.</p>
</div>
`.trim()

	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({ from, to, subject, html }),
	})

	// Don’t fail signup if sending fails; just best-effort.
	if (!res.ok) throw new Error("resend_send_failed")
}

// POST /api/subscribe { email } -> { ok: true, value: number, status: "new"|"existing" }
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
	let email = ""

	const contentType = request.headers.get("content-type") || ""
	if (contentType.includes("application/json")) {
		const body = (await request.json().catch(() => null)) as any
		email = String(body?.email || "")
	} else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
		const form = await request.formData()
		email = String(form.get("email") || "")
	} else {
		// Last resort: try JSON
		const body = (await request.json().catch(() => null)) as any
		email = String(body?.email || "")
	}

	email = email.trim().toLowerCase()
	if (!isValidEmail(email)) return json({ ok: false, error: "invalid_email" }, { status: 400 })

	const key = `email:${await sha256Hex(email)}`
	const existing = await env.SIGNUPS_KV.get(key)
	if (existing) {
		const value = await getCount(env)
		return json({ ok: true, value, status: "existing" })
	}

	// Store signup
	await env.SIGNUPS_KV.put(key, email)

	// Increment counter (best-effort, not atomic)
	const next = (await getCount(env)) + 1
	await setCount(env, next)

	// Send welcome email (best-effort)
	try {
		await sendWelcomeEmail(env, email)
	} catch {
		// ignore
	}

	return json({ ok: true, value: next, status: "new" })
}

