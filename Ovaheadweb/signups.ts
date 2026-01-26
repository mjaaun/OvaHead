// Minimal type shims so editors don't error without Cloudflare types.
type KVNamespace = {
	get: (key: string) => Promise<string | null>
	put: (key: string, value: string) => Promise<void>
}

type PagesFunction<Env = unknown> = (ctx: { env: Env }) => Response | Promise<Response>

export interface Env {
	SIGNUPS_KV: KVNamespace
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

async function getCount(env: Env): Promise<number> {
	const raw = await env.SIGNUPS_KV.get("count")
	const n = Number(raw)
	return Number.isFinite(n) && n >= 0 ? n : 0
}

async function setCount(env: Env, n: number) {
	await env.SIGNUPS_KV.put("count", String(n))
}

// GET /api/signups  -> { value: number }
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
	const value = await getCount(env)
	return json({ value })
}

// POST /api/signups -> increments by 1, returns { value: number }
export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
	const current = await getCount(env)
	const next = current + 1
	await setCount(env, next)
	return json({ value: next })
}

